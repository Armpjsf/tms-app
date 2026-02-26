// Service Worker for Push Notifications
self.addEventListener("push", function (event) {
  if (!event.data) return;

  try {
    const data = event.data.json();
    const options = {
      body: data.body || "มีงานจองใหม่สำหรับคุณ",
      icon: "/logo.png",
      badge: "/logo.png", // Small icon for notification bar
      vibrate: [200, 100, 200],
      data: {
        url: data.url || "/mobile/jobs",
      },
      actions: [{ action: "open", title: "เปิดดูงาน" }],
      // Requesting sound (Browser specific, may rely on vibration/default notification sound)
      tag: "job-assignment",
      renotify: true,
    };

    event.waitUntil(
      self.registration.showNotification(
        data.title || "TMS Notification",
        options,
      ),
    );
  } catch (e) {
    console.error("Error in Push Event:", e);
  }
});

self.addEventListener("notificationclick", function (event) {
  event.notification.close();

  const urlToOpen = event.notification.data.url;

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      }),
  );
});
