const cron = require('node-cron');
const Workshop = require('../models/Workshop');
const sendEmail = require('../utils/sendEmail');

// Emails everyone registered for a workshop starting in the next 24-48h, once per workshop.
async function sendDueReminders() {
  const now = new Date();
  const windowStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const windowEnd = new Date(now.getTime() + 48 * 60 * 60 * 1000);

  const dueWorkshops = await Workshop.find({
    date: { $gte: windowStart, $lte: windowEnd },
    reminderSentAt: null,
    'registeredUsers.0': { $exists: true }
  }).populate('registeredUsers', 'email fullName');

  for (const workshop of dueWorkshops) {
    await Promise.all(
      workshop.registeredUsers.map((user) =>
        sendEmail({
          to: user.email,
          subject: `Reminder: ${workshop.title} is tomorrow`,
          html: `<p>Hi ${user.fullName},</p><p>Reminder — <strong>${workshop.title}</strong> is happening on ${new Date(workshop.date).toLocaleString()} at ${workshop.location}.</p>`
        }).catch(() => {})
      )
    );
    workshop.reminderSentAt = now;
    await workshop.save();
  }
}

// Runs daily at 08:00 server time.
function scheduleWorkshopReminders(logger) {
  cron.schedule('0 8 * * *', () => {
    sendDueReminders().catch((err) => logger.error('Workshop reminder job failed: ' + err.message));
  });
}

module.exports = { scheduleWorkshopReminders, sendDueReminders };
