import axiosInstance from "@/utils/axiosInstance";

// Converts a URL-safe base64 VAPID public key (as returned by the backend)
// into the Uint8Array format the Push API's applicationServerKey expects.
// Standard conversion algorithm used across web-push examples.
function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; i += 1) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

// Registers the service worker (if needed), requests notification permission,
// and subscribes the browser to push via the backend's VAPID key. Works for
// logged-in members and anonymous visitors alike — axiosInstance only
// attaches an auth header when a token exists, and the backend's
// /push/subscribe route accepts both. Never throws: any failure (including
// the user declining the permission prompt, which is an expected outcome,
// not an error) resolves to false.
export async function subscribeToPush() {
  try {
    if (typeof window === "undefined") return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !("Notification" in window)) {
      return false;
    }

    let registration = await navigator.serviceWorker.getRegistration();
    if (!registration) {
      registration = await navigator.serviceWorker.register("/sw.js");
    }
    await navigator.serviceWorker.ready;

    let permission = Notification.permission;
    if (permission === "default") {
      permission = await Notification.requestPermission();
    }
    if (permission !== "granted") {
      // Denied (or dismissed) is an expected, non-exceptional outcome.
      return false;
    }

    const { data } = await axiosInstance.get("/push/vapid-public-key");
    const vapidPublicKey = data?.publicKey;
    if (!vapidPublicKey) return false;

    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
      });
    }

    const { endpoint, keys } = subscription.toJSON();
    await axiosInstance.post("/push/subscribe", {
      endpoint,
      keys: {
        p256dh: keys?.p256dh,
        auth: keys?.auth,
      },
    });

    return true;
  } catch (err) {
    return false;
  }
}

// Checks whether the browser currently holds an active push subscription
// under our service worker registration.
export async function isPushSubscribed() {
  try {
    if (typeof window === "undefined") return false;
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return false;

    const registration = await navigator.serviceWorker.getRegistration();
    if (!registration) return false;

    const subscription = await registration.pushManager.getSubscription();
    return !!subscription;
  } catch (err) {
    return false;
  }
}

export { urlBase64ToUint8Array };
