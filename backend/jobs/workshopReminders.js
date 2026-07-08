const cron = require('node-cron');
const Workshop = require('../models/Workshop');
const sendEmail = require('../utils/sendEmail');

// Emails everyone registered for a single workshop. Used by both the daily cron sweep and
// the manual "send now" admin route. Returns true if at least one email succeeded (or there
// were no recipients to email), false if every send failed — callers use this to decide
// whether it's safe to mark the reminder as sent.
async function sendReminderForWorkshop(workshop, logger) {
  const results = await Promise.allSettled(
    workshop.registeredUsers.map((user) =>
      sendEmail({
        to: user.email,
        subject: `Reminder: ${workshop.title} is tomorrow`,
        html: `<p>Hi ${user.fullName},</p><p>Reminder — <strong>${workshop.title}</strong> is happening on ${new Date(workshop.date).toLocaleString()} at ${workshop.location}.</p>`
      })
    )
  );

  results.forEach((result, i) => {
    if (result.status === 'rejected' && logger) {
      const user = workshop.registeredUsers[i];
      logger.error(
        `Workshop reminder email failed for ${user && user.email} (workshop ${workshop.id}): ${
          result.reason && result.reason.message
        }`
      );
    }
  });

  const anySucceeded = results.length === 0 || results.some((result) => result.status === 'fulfilled');
  if (anySucceeded) {
    workshop.reminderSentAt = new Date();
    await workshop.save();
  }

  return anySucceeded;
}

// Emails everyone registered for a workshop starting in the next 24-48h, once per workshop.
// If every email for a workshop fails (e.g. a total Resend outage), reminderSentAt is left
// null so the query below picks it up again on tomorrow's run instead of silently losing it.
async function sendDueReminders(logger) {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const dueWorkshops = await Workshop.find({
    date: { $gte: windowStart, $lte: windowEnd },
    reminderSentAt: null,
    'registeredUsers.0': { $exists: true }
  }).populate('registeredUsers', 'email fullName');

  for (const workshop of dueWorkshops) {
    await sendReminderForWorkshop(workshop, logger);
  }
}

// Runs daily at 08:00 India time.
function scheduleWorkshopReminders(logger) {
  cron.schedule(
    '0 8 * * *',
    () => {
      sendDueReminders(logger).catch((err) => logger.error('Workshop reminder job failed: ' + err.message));
    },
    { timezone: 'Asia/Kolkata' }
  );
}

module.exports = { scheduleWorkshopReminders, sendDueReminders, sendReminderForWorkshop };
