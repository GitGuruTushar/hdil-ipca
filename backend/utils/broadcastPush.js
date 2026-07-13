const PushSubscription = require('../models/PushSubscription');
const webpush = require('./webpush');

// Fans a push notification out to every subscription in the collection — anonymous
// PWA installs and member-owned subscriptions alike — for public content that has
// no single recipient (e.g. a newly published Update). Unlike utils/notify.js this
// is push-only and never creates an in-app Notification document, since anonymous
// subscribers have no user record to attach one to.
async function broadcastPush({ title, body, link }) {
  const subscriptions = await PushSubscription.find();

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
        // bad subscription never blocks delivery to the rest.
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: subscription._id });
        }
      }
    })
  );
}

module.exports = broadcastPush;
