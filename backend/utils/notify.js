const Notification = require('../models/Notification');
const PushSubscription = require('../models/PushSubscription');
const webpush = require('./webpush');

// Shared dispatch used by any route/job that needs to notify a member: creates the
// in-app Notification document, then best-effort fans out a web push to every
// browser subscription that user has registered. This does NOT send email —
// callers that want multi-channel delivery should also call utils/sendEmail.js.
async function notify({ recipientId, type, title, body, link }) {
  const notification = await Notification.create({
    recipient: recipientId,
    type,
    title,
    body,
    link
  });

  const subscriptions = await PushSubscription.find({ user: recipientId });

  await Promise.all(
    subscriptions.map(async (subscription) => {
      try {
        await webpush.sendNotification(
          {
            endpoint: subscription.endpoint,
            keys: {
              p256dh: subscription.keys.p256dh,
              auth: subscription.keys.auth
            }
          },
          JSON.stringify({ title, body, link })
        );
      } catch (err) {
        // Expired/invalid subscriptions are reported by the push service as 404/410 —
        // clean those up. Any other failure (network blip, etc.) is swallowed so one
        // bad subscription never blocks the notification from being created/sent to others.
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: subscription._id });
        }
      }
    })
  );

  return notification;
}

module.exports = notify;
