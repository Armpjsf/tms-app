// Service Worker for Push Notifications
self.addEventListener("push", function (event) {
  console.log("[Service Worker] Push Received.");
  
  let data = {};
  if (event.data) {
    try {
      data = event.data.json();
    } catch (e) {
      console.warn("[Service Worker] Push data is not JSON, treating as text.");
      data = { body: event.data.text() };
    }
  }

  const title = data.title || "TMS Notification";
  const options = {
    body: data.body || "มีรายการอัปเดตใหม่ในระบบ",
    icon: "/logo-tactical.png",
    badge: "/logo-tactical.png",
    vibrate: [300, 100, 300, 100, 400],
    requireInteraction: true,
    data: {
      url: data.url || "/mobile/dashboard",
    },
    actions: [
      { action: "open", title: "เปิดดูงาน" }
    ],
    tag: "tms-push-notification",
    renotify: true,
  };

  // The notification sound is often controlled by the OS settings 
  // and the 'vibrate' pattern helps ensure the user notices it.
  
  event.waitUntil(
    self.registration.showNotification(title, options)
  );
});

self.addEventListener("notificationclick", function (event) {
  console.log("[Service Worker] Notification click Received.");
  
  event.notification.close();

  const urlToOpen = new URL(event.notification.data.url || "/mobile/dashboard", self.location.origin).href;

  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true })
      .then(function (windowClients) {
        // 1. If a window is already open at the target URL, focus it
        for (var i = 0; i < windowClients.length; i++) {
          var client = windowClients[i];
          if (client.url === urlToOpen && "focus" in client) {
            return client.focus();
          }
        }
        
        // 2. If no window is open at the target URL, but we have an open window, 
        // navigate it to the target URL and focus it
        if (windowClients.length > 0) {
            const client = windowClients[0];
            if ("navigate" in client) {
                return client.navigate(urlToOpen).then(c => c?.focus());
            }
        }

        // 3. Otherwise, open a new window
        if (clients.openWindow) {
          return clients.openWindow(urlToOpen);
        }
      })
  );
});
