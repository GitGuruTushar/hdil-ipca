const express = require('express');
const router = express.Router();
const fs = require('fs');
const { check, validationResult } = require('express-validator');
const Conversation = require('../models/Conversation');
const Message = require('../models/Message');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const notify = require('../utils/notify');
const cloudinary = require('../utils/cloudinary');
const { upload, enforceSizeLimits, IMAGE_TYPES } = require('../config/upload');
const { mixedMediaUpload, classifyFile, enforceMixedSizeLimits } = require('../config/mixedMediaUpload');

const PARTICIPANT_FIELDS = 'fullName username role profilePicture lastSeenAt';
const SENDER_FIELDS = 'fullName username profilePicture';

const runValidation = (req) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    throw new AppError(errors.array().map((e) => e.msg).join(', '), 400);
  }
};

const isParticipant = (conversation, userId) =>
  conversation.participants.some((p) => p.toString() === userId);

// Groups gate admin-only actions (rename, avatar, add/remove members, pin)
// behind conversation.admins. 1:1 conversations have no hierarchy — either
// participant counts as "admin" there, since there's no one else to defer to.
const isConversationAdmin = (conversation, userId) => {
  if (!conversation.isGroup) return isParticipant(conversation, userId);
  return conversation.admins.some((a) => a.toString() === userId);
};

const EDIT_WINDOW_MS = 15 * 60 * 1000; // 15 minutes
const DELETE_FOR_EVERYONE_WINDOW_MS = 24 * 60 * 60 * 1000; // 1 day (user's explicit correction to WhatsApp's real ~1hr)
const MAX_PINNED = 3; // matches WhatsApp's real limit

const emitToConversation = (req, conversationId, event, payload) => {
  req.app.get('io')?.to(`conversation:${conversationId}`).emit(event, payload);
};
const emitToUser = (req, userId, event, payload) => {
  req.app.get('io')?.to(`user:${userId}`).emit(event, payload);
};

// @route   GET /api/conversations
// @desc    List the requester's conversations, newest activity first, with an unread count each
// @access  Private (any logged-in member)
router.get(
  '/',
  protect,
  asyncHandler(async (req, res) => {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const filter = { participants: req.user.id };
    const total = await Conversation.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const conversations = await Conversation.find(filter)
      .sort({ lastMessageAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('participants', PARTICIPANT_FIELDS)
      .lean();

    const withUnread = await Promise.all(
      conversations.map(async (conversation) => {
        const readEntry = (conversation.lastReadBy || []).find(
          (entry) => entry.user && entry.user.toString() === req.user.id
        );

        const messageFilter = {
          conversation: conversation._id,
          sender: { $ne: req.user.id }
        };
        if (readEntry) {
          messageFilter.createdAt = { $gt: readEntry.lastReadAt };
        }

        const unreadCount = await Message.countDocuments(messageFilter);
        return { ...conversation, unreadCount };
      })
    );

    res.json({ conversations: withUnread, page, totalPages, total });
  })
);

const createConversationFields = [
  check('participantIds', 'participantIds must be a non-empty array').isArray({ min: 1 }),
  check('participantIds.*', 'Each participant id must be a valid id').isMongoId(),
  check('isGroup', 'isGroup must be a boolean').optional().isBoolean(),
  check('groupName', 'Group name can not be more than 100 characters').optional().isLength({ max: 100 }),
  check('description', 'Description can not be more than 500 characters').optional().isLength({ max: 500 })
];

// @route   POST /api/conversations
// @desc    Start a new 1:1 or group conversation — returns an existing 1:1 conversation
//          instead of duplicating it if one already exists between the same two users
// @access  Private (any logged-in member)
router.post(
  '/',
  protect,
  createConversationFields,
  asyncHandler(async (req, res) => {
    runValidation(req);
    const { isGroup, groupName, description } = req.body;

    if (isGroup && !(groupName && groupName.trim())) {
      throw new AppError('Group name is required for group conversations', 400);
    }

    const rawIds = Array.from(new Set(req.body.participantIds.map((id) => String(id))));

    const validUsers = await User.find({ _id: { $in: rawIds }, status: 'approved' });
    if (validUsers.length !== rawIds.length) {
      throw new AppError('One or more selected users are invalid or not approved', 400);
    }

    const participantIds = rawIds.includes(req.user.id) ? rawIds : [...rawIds, req.user.id];
    if (participantIds.length < 2) {
      throw new AppError('A conversation needs at least 2 participants', 400);
    }

    if (!isGroup && participantIds.length === 2) {
      const otherId = participantIds.find((id) => id !== req.user.id);
      const existing = await Conversation.findOne({
        isGroup: false,
        participants: { $size: 2, $all: [req.user.id, otherId] }
      }).populate('participants', PARTICIPANT_FIELDS);

      if (existing) {
        return res.json(existing);
      }
    }

    const conversation = await Conversation.create({
      participants: participantIds,
      isGroup: !!isGroup,
      groupName: isGroup ? groupName.trim() : undefined,
      description: isGroup ? description?.trim() : undefined,
      admins: isGroup ? [req.user.id] : [],
      createdBy: req.user.id
    });

    const populated = await conversation.populate('participants', PARTICIPANT_FIELDS);

    populated.participants
      .filter((p) => p._id.toString() !== req.user.id)
      .forEach((p) => emitToUser(req, p._id.toString(), 'conversation:created', populated));

    res.status(201).json(populated);
  })
);

// @route   PUT /api/conversations/:id
// @desc    Rename a group / edit its description — group + admin-only
// @access  Private (group admins only)
router.put(
  '/:id',
  protect,
  [
    check('groupName', 'Group name can not be more than 100 characters').optional().isLength({ max: 100 }),
    check('description', 'Description can not be more than 500 characters').optional().isLength({ max: 500 })
  ],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!conversation.isGroup) throw new AppError('Only group conversations can be renamed', 400);
    if (!isConversationAdmin(conversation, req.user.id)) {
      throw new AppError('Only group admins can edit the group', 403);
    }

    if (req.body.groupName !== undefined) conversation.groupName = req.body.groupName.trim();
    if (req.body.description !== undefined) conversation.description = req.body.description.trim();
    await conversation.save();

    const populated = await conversation.populate('participants', PARTICIPANT_FIELDS);
    emitToConversation(req, conversation.id, 'participants:updated', { conversationId: conversation.id, conversation: populated });
    res.json(populated);
  })
);

// @route   POST /api/conversations/:id/avatar
// @desc    Set/replace a group's photo — group + admin-only
// @access  Private (group admins only)
router.post(
  '/:id/avatar',
  protect,
  upload.single('avatar'),
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) {
      if (req.file) fs.unlinkSync(req.file.path);
      throw new AppError('Conversation not found', 404);
    }
    if (!conversation.isGroup) {
      if (req.file) fs.unlinkSync(req.file.path);
      throw new AppError('Only group conversations have a photo', 400);
    }
    if (!isConversationAdmin(conversation, req.user.id)) {
      if (req.file) fs.unlinkSync(req.file.path);
      throw new AppError('Only group admins can change the group photo', 403);
    }
    if (!req.file) throw new AppError('A photo is required', 400);
    if (!IMAGE_TYPES.includes(req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      throw new AppError(`Unsupported file type: ${req.file.mimetype}. Allowed: jpg, png, webp.`, 400);
    }
    enforceSizeLimits(req.file);

    let result;
    try {
      result = await cloudinary.uploader.upload(req.file.path, { folder: 'conversations', resource_type: 'image' });
    } finally {
      fs.unlinkSync(req.file.path);
    }

    conversation.avatarUrl = result.secure_url;
    await conversation.save();

    const populated = await conversation.populate('participants', PARTICIPANT_FIELDS);
    emitToConversation(req, conversation.id, 'participants:updated', { conversationId: conversation.id, conversation: populated });
    res.json(populated);
  })
);

// @route   GET /api/conversations/pinned/:id
// @desc    List a conversation's pinned messages (up to MAX_PINNED, newest-pinned first)
// @access  Private (participants only)
router.get(
  '/pinned/:id',
  protect,
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!isParticipant(conversation, req.user.id)) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const messages = await Message.find({ conversation: conversation.id, pinned: true })
      .sort({ pinnedAt: -1 })
      .populate('sender', SENDER_FIELDS);

    res.json(messages);
  })
);

// @route   GET /api/conversations/:id/messages/search
// @desc    Search this conversation's messages by text (participants only)
// @access  Private (participants only)
router.get(
  '/:id/messages/search',
  protect,
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!isParticipant(conversation, req.user.id)) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const q = (req.query.q || '').trim();
    if (!q) return res.json({ messages: [] });

    const re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const filter = {
      conversation: conversation.id,
      content: re,
      isDeletedForEveryone: { $ne: true },
      deletedFor: { $ne: req.user.id }
    };

    const total = await Message.countDocuments(filter);
    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', SENDER_FIELDS);

    res.json({ messages, page, totalPages: Math.max(Math.ceil(total / limit), 1), total });
  })
);

// @route   GET /api/conversations/:id/messages
// @desc    Paginated message history for a conversation, newest first
// @access  Private (participants only)
router.get(
  '/:id/messages',
  protect,
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!isParticipant(conversation, req.user.id)) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);

    const filter = { conversation: conversation.id, deletedFor: { $ne: req.user.id } };
    const total = await Message.countDocuments(filter);
    const totalPages = Math.max(Math.ceil(total / limit), 1);

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('sender', SENDER_FIELDS)
      .populate({ path: 'replyTo', select: 'content sender attachments', populate: { path: 'sender', select: SENDER_FIELDS } });

    res.json({ messages, page, totalPages, total });
  })
);

// @route   POST /api/conversations/:id/messages
// @desc    Send a message (text and/or attachments), bump the conversation's last-activity
//          preview, and notify/emit to the other participants
// @access  Private (participants only)
router.post(
  '/:id/messages',
  protect,
  mixedMediaUpload.array('files', 10),
  asyncHandler(async (req, res) => {
    const files = req.files || [];
    const cleanupFiles = () => files.forEach((f) => { try { fs.unlinkSync(f.path); } catch (err) { /* already gone */ } });

    try {
      const content = (req.body.content || '').trim();
      if (!content && files.length === 0) {
        throw new AppError('A message needs text or at least one attachment', 400);
      }
      if (content.length > 2000) {
        throw new AppError('Message can not be more than 2000 characters', 400);
      }

      const conversation = await Conversation.findById(req.params.id).populate('participants', PARTICIPANT_FIELDS);
      if (!conversation) throw new AppError('Conversation not found', 404);
      if (!conversation.participants.some((p) => p._id.toString() === req.user.id)) {
        throw new AppError('You are not a participant in this conversation', 403);
      }

      let replyTo;
      if (req.body.replyTo) {
        const original = await Message.findOne({ _id: req.body.replyTo, conversation: conversation.id });
        if (!original) throw new AppError('The message you are replying to was not found', 400);
        replyTo = original.id;
      }

      let forwardedFrom;
      if (req.body.forwardedFrom) {
        const exists = await Message.exists({ _id: req.body.forwardedFrom });
        if (!exists) throw new AppError('The message you are forwarding was not found', 400);
        forwardedFrom = req.body.forwardedFrom;
      }

      let attachments = [];
      if (files.length) {
        enforceMixedSizeLimits(files);
        attachments = await Promise.all(
          files.map(async (file) => {
            const kind = classifyFile(file);
            const result = await cloudinary.uploader.upload(file.path, {
              folder: 'messages',
              resource_type: kind === 'document' ? 'raw' : kind
            });
            return {
              url: result.secure_url,
              type: kind,
              fileName: kind === 'document' ? file.originalname : undefined,
              mimeType: file.mimetype
            };
          })
        );
        cleanupFiles();
      }

      const message = await Message.create({
        conversation: conversation.id,
        sender: req.user.id,
        content: content || undefined,
        attachments,
        replyTo,
        forwardedFrom
      });

      const previewText = content || (attachments[0] ? `[${attachments[0].type}]` : '');
      conversation.lastMessageAt = new Date();
      conversation.lastMessageText = previewText;
      await conversation.save();

      const notifTitle = conversation.isGroup ? conversation.groupName : req.user.fullName;
      const notifBody = previewText.length > 140 ? previewText.slice(0, 140) : previewText;

      conversation.participants
        .filter((participant) => participant._id.toString() !== req.user.id)
        .forEach((participant) => {
          const link = ['admin', 'moderator'].includes(participant.role)
            ? `/admin/messages?c=${conversation.id}`
            : `/dashboard/messages?c=${conversation.id}`;

          notify({ recipientId: participant.id, type: 'message', title: notifTitle, body: notifBody, link }).catch(() => {});
          emitToUser(req, participant._id.toString(), 'conversation:updated', {
            conversationId: conversation.id,
            lastMessageText: previewText,
            lastMessageAt: conversation.lastMessageAt
          });
        });

      const populated = await message.populate([
        { path: 'sender', select: SENDER_FIELDS },
        { path: 'replyTo', select: 'content sender attachments', populate: { path: 'sender', select: SENDER_FIELDS } }
      ]);

      emitToConversation(req, conversation.id, 'message:new', populated);
      res.status(201).json(populated);
    } catch (err) {
      cleanupFiles();
      throw err;
    }
  })
);

// @route   PUT /api/conversations/:id/messages/:messageId
// @desc    Edit a message's text — sender-only, within a 15-minute window
// @access  Private (sender only)
router.put(
  '/:id/messages/:messageId',
  protect,
  [check('content', 'Message content is required').not().isEmpty().isLength({ max: 2000 })],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!isParticipant(conversation, req.user.id)) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const message = await Message.findOne({ _id: req.params.messageId, conversation: conversation.id });
    if (!message) throw new AppError('Message not found', 404);
    if (message.sender.toString() !== req.user.id) throw new AppError('You can only edit your own messages', 403);
    if (message.isDeletedForEveryone) throw new AppError('This message has been deleted', 400);
    if (Date.now() - message.createdAt.getTime() > EDIT_WINDOW_MS) {
      throw new AppError('The 15-minute edit window for this message has expired', 403);
    }

    message.content = req.body.content.trim();
    message.editedAt = new Date();
    await message.save();

    const populated = await message.populate('sender', SENDER_FIELDS);
    emitToConversation(req, conversation.id, 'message:edited', {
      conversationId: conversation.id,
      messageId: message.id,
      content: message.content,
      editedAt: message.editedAt
    });
    res.json(populated);
  })
);

// @route   DELETE /api/conversations/:id/messages/:messageId
// @desc    Delete a message — for yourself only (default) or for everyone
//          (sender-only, within 1 day)
// @access  Private (participants only; forEveryone is sender-only)
router.delete(
  '/:id/messages/:messageId',
  protect,
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!isParticipant(conversation, req.user.id)) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const message = await Message.findOne({ _id: req.params.messageId, conversation: conversation.id });
    if (!message) throw new AppError('Message not found', 404);

    const forEveryone = !!req.body?.forEveryone;

    if (forEveryone) {
      if (message.sender.toString() !== req.user.id) {
        throw new AppError('You can only delete-for-everyone your own messages', 403);
      }
      if (Date.now() - message.createdAt.getTime() > DELETE_FOR_EVERYONE_WINDOW_MS) {
        throw new AppError('This message can only be deleted for everyone within 1 day of sending', 403);
      }
      message.isDeletedForEveryone = true;
      message.deletedAt = new Date();
      message.content = undefined;
      message.attachments = [];
      await message.save();

      emitToConversation(req, conversation.id, 'message:deleted', { conversationId: conversation.id, messageId: message.id, deletedAt: message.deletedAt });
      return res.json({ msg: 'Message deleted for everyone' });
    }

    if (!message.deletedFor.some((id) => id.toString() === req.user.id)) {
      message.deletedFor.push(req.user.id);
      await message.save();
    }
    res.json({ msg: 'Message deleted for you' });
  })
);

// @route   PUT /api/conversations/:id/messages/:messageId/reactions
// @desc    Toggle the requester's emoji reaction on a message
// @access  Private (participants only)
router.put(
  '/:id/messages/:messageId/reactions',
  protect,
  [check('emoji', 'An emoji is required').not().isEmpty().isLength({ max: 8 })],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!isParticipant(conversation, req.user.id)) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const message = await Message.findOne({ _id: req.params.messageId, conversation: conversation.id });
    if (!message) throw new AppError('Message not found', 404);

    const existingIndex = message.reactions.findIndex((r) => r.user.toString() === req.user.id);
    const existing = existingIndex >= 0 ? message.reactions[existingIndex] : null;

    if (existing) message.reactions.splice(existingIndex, 1);
    if (!existing || existing.emoji !== req.body.emoji) {
      message.reactions.push({ user: req.user.id, emoji: req.body.emoji });
    }
    await message.save();

    emitToConversation(req, conversation.id, 'message:reaction', {
      conversationId: conversation.id,
      messageId: message.id,
      reactions: message.reactions
    });
    res.json({ reactions: message.reactions });
  })
);

// @route   PUT /api/conversations/:id/messages/:messageId/pin
// @desc    Toggle a message's pinned state — group: admin-only; 1:1: either participant. Capped at 3 pinned.
// @access  Private (participants only; admin-only for groups)
router.put(
  '/:id/messages/:messageId/pin',
  protect,
  [check('pinned', 'pinned must be a boolean').isBoolean()],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!isConversationAdmin(conversation, req.user.id)) {
      throw new AppError('Only group admins can pin messages in this conversation', 403);
    }

    const message = await Message.findOne({ _id: req.params.messageId, conversation: conversation.id });
    if (!message) throw new AppError('Message not found', 404);
    if (message.isDeletedForEveryone) throw new AppError('This message has been deleted', 400);

    if (req.body.pinned) {
      if (!message.pinned) {
        const pinnedCount = await Message.countDocuments({ conversation: conversation.id, pinned: true });
        if (pinnedCount >= MAX_PINNED) {
          throw new AppError(`Only ${MAX_PINNED} messages can be pinned at once — unpin one first`, 400);
        }
      }
      message.pinned = true;
      message.pinnedAt = new Date();
      message.pinnedBy = req.user.id;
    } else {
      message.pinned = false;
      message.pinnedAt = null;
      message.pinnedBy = null;
    }
    await message.save();

    emitToConversation(req, conversation.id, message.pinned ? 'message:pinned' : 'message:unpinned', {
      conversationId: conversation.id,
      messageId: message.id
    });
    res.json({ pinned: message.pinned });
  })
);

// @route   PUT /api/conversations/:id/read
// @desc    Mark a conversation as read (and delivered) up to now for the requester
// @access  Private (participants only)
router.put(
  '/:id/read',
  protect,
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!isParticipant(conversation, req.user.id)) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const now = new Date();

    const existingRead = conversation.lastReadBy.find((entry) => entry.user.toString() === req.user.id);
    if (existingRead) existingRead.lastReadAt = now;
    else conversation.lastReadBy.push({ user: req.user.id, lastReadAt: now });

    // Reading implies having received it — upsert delivered in the same write
    // rather than requiring a second round trip from an actively-open thread.
    const existingDelivered = conversation.lastDeliveredBy.find((entry) => entry.user.toString() === req.user.id);
    if (existingDelivered) existingDelivered.lastDeliveredAt = now;
    else conversation.lastDeliveredBy.push({ user: req.user.id, lastDeliveredAt: now });

    await conversation.save();
    emitToConversation(req, conversation.id, 'receipt:read', { conversationId: conversation.id, userId: req.user.id, lastReadAt: now });
    res.json(conversation);
  })
);

// @route   PUT /api/conversations/:id/delivered
// @desc    Mark a conversation as delivered (not necessarily read) up to now for the requester
// @access  Private (participants only)
router.put(
  '/:id/delivered',
  protect,
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!isParticipant(conversation, req.user.id)) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const now = new Date();
    const existing = conversation.lastDeliveredBy.find((entry) => entry.user.toString() === req.user.id);
    if (existing) existing.lastDeliveredAt = now;
    else conversation.lastDeliveredBy.push({ user: req.user.id, lastDeliveredAt: now });

    await conversation.save();
    emitToConversation(req, conversation.id, 'receipt:delivered', { conversationId: conversation.id, userId: req.user.id, lastDeliveredAt: now });
    res.json(conversation);
  })
);

const addParticipantsFields = [
  check('userIds', 'userIds must be a non-empty array').isArray({ min: 1 }),
  check('userIds.*', 'Each user id must be a valid id').isMongoId()
];

// @route   POST /api/conversations/:id/participants
// @desc    Add members to a group conversation
// @access  Private (participants only, group conversations only)
router.post(
  '/:id/participants',
  protect,
  addParticipantsFields,
  asyncHandler(async (req, res) => {
    runValidation(req);

    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!conversation.isGroup) {
      throw new AppError('Only group conversations support adding participants', 400);
    }
    if (!isParticipant(conversation, req.user.id)) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    const existingIds = new Set(conversation.participants.map((p) => p.toString()));
    const newIds = Array.from(new Set(req.body.userIds.map((id) => String(id))));

    if (newIds.some((id) => existingIds.has(id))) {
      throw new AppError('One or more users are already in this conversation', 400);
    }

    const validUsers = await User.find({ _id: { $in: newIds }, status: 'approved' });
    if (validUsers.length !== newIds.length) {
      throw new AppError('One or more selected users are invalid or not approved', 400);
    }

    conversation.participants.push(...newIds);
    await conversation.save();

    const populated = await conversation.populate('participants', PARTICIPANT_FIELDS);
    emitToConversation(req, conversation.id, 'participants:updated', { conversationId: conversation.id, conversation: populated });
    newIds.forEach((id) => emitToUser(req, id, 'conversation:created', populated));

    res.json(populated);
  })
);

// @route   DELETE /api/conversations/:id/participants/:userId
// @desc    Remove a single participant from a group — admin-only
// @access  Private (group admins only)
router.delete(
  '/:id/participants/:userId',
  protect,
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!conversation.isGroup) throw new AppError('Only group conversations support removing participants', 400);
    if (!isConversationAdmin(conversation, req.user.id)) {
      throw new AppError('Only group admins can remove participants', 403);
    }

    const targetId = req.params.userId;
    if (!isParticipant(conversation, targetId)) throw new AppError('That user is not in this conversation', 404);

    conversation.participants = conversation.participants.filter((p) => p.toString() !== targetId);
    conversation.admins = conversation.admins.filter((a) => a.toString() !== targetId);

    if (conversation.participants.length < 2) {
      await Message.deleteMany({ conversation: conversation.id });
      await conversation.deleteOne();
      emitToUser(req, targetId, 'conversation:removed', { conversationId: req.params.id });
      return res.json({ msg: 'Participant removed and conversation closed (too few members remained)' });
    }

    await conversation.save();
    const populated = await conversation.populate('participants', PARTICIPANT_FIELDS);
    emitToConversation(req, conversation.id, 'participants:updated', { conversationId: conversation.id, conversation: populated });
    emitToUser(req, targetId, 'conversation:removed', { conversationId: conversation.id });
    res.json(populated);
  })
);

// @route   PUT /api/conversations/:id/admins/:userId
// @desc    Promote/demote a participant to/from group admin — admin-only
// @access  Private (group admins only)
router.put(
  '/:id/admins/:userId',
  protect,
  [check('promote', 'promote must be a boolean').isBoolean()],
  asyncHandler(async (req, res) => {
    runValidation(req);
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!conversation.isGroup) throw new AppError('Only group conversations have admins', 400);
    if (!isConversationAdmin(conversation, req.user.id)) {
      throw new AppError('Only group admins can promote/demote members', 403);
    }

    const targetId = req.params.userId;
    if (!isParticipant(conversation, targetId)) throw new AppError('That user is not in this conversation', 404);

    const isCurrentlyAdmin = conversation.admins.some((a) => a.toString() === targetId);

    if (req.body.promote) {
      if (!isCurrentlyAdmin) conversation.admins.push(targetId);
    } else {
      if (isCurrentlyAdmin && conversation.admins.length <= 1) {
        throw new AppError('At least one admin must remain in the group', 400);
      }
      conversation.admins = conversation.admins.filter((a) => a.toString() !== targetId);
    }

    await conversation.save();
    const populated = await conversation.populate('participants', PARTICIPANT_FIELDS);
    emitToConversation(req, conversation.id, 'participants:updated', { conversationId: conversation.id, conversation: populated });
    res.json(populated);
  })
);

// @route   POST /api/conversations/:id/leave
// @desc    Leave a group conversation (deletes it once fewer than 2 participants remain)
// @access  Private (participants only, group conversations only)
router.post(
  '/:id/leave',
  protect,
  asyncHandler(async (req, res) => {
    const conversation = await Conversation.findById(req.params.id);
    if (!conversation) throw new AppError('Conversation not found', 404);
    if (!conversation.isGroup) {
      throw new AppError('One-to-one conversations can not be left', 400);
    }
    if (!isParticipant(conversation, req.user.id)) {
      throw new AppError('You are not a participant in this conversation', 403);
    }

    conversation.participants = conversation.participants.filter((p) => p.toString() !== req.user.id);
    conversation.admins = conversation.admins.filter((a) => a.toString() !== req.user.id);

    if (conversation.participants.length < 2) {
      await Message.deleteMany({ conversation: conversation.id });
      await conversation.deleteOne();
      emitToUser(req, req.user.id, 'conversation:removed', { conversationId: req.params.id });
      return res.json({ msg: 'Left the conversation' });
    }

    // If the last remaining admin leaves, promote the longest-standing
    // remaining participant so the group is never left admin-less.
    if (conversation.admins.length === 0) {
      conversation.admins = [conversation.participants[0]];
    }

    await conversation.save();
    const populated = await conversation.populate('participants', PARTICIPANT_FIELDS);
    emitToConversation(req, conversation.id, 'participants:updated', { conversationId: conversation.id, conversation: populated });
    emitToUser(req, req.user.id, 'conversation:removed', { conversationId: conversation.id });
    res.json({ msg: 'Left the conversation' });
  })
);

module.exports = router;
