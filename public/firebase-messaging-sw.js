self.addEventListener("push", (event) => {
    let payload;
  try {
    payload = event.data?.json();
  } catch {
    payload = {
      notification: { title: "LeadsFlow", body: event.data?.text() ?? "" },
      data: {},
    };
  }

  const notification = payload.notification ?? {};
  const data = payload.data ?? {};

  const title = notification.title || "LeadsFlow";
  const body = notification.body || payload.message || "You have a new notification.";
  const options = {
    body,
    data,
    icon: notification.icon || "/logo.png",
    badge: notification.badge || "/logo.png",
    tag: data.leadId || `followup-${Date.now()}`,
    renotify: false,
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  const targetUrl = event.notification.data?.url || "/leads";
  event.notification.close();

  event.waitUntil(
    clients
      .matchAll({ type: "window", includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ("focus" in client) {
            if (client.url.includes(targetUrl)) {
              return client.focus();
            }
            return client.navigate(targetUrl);
          }
        }
        if (clients.openWindow) {
          return clients.openWindow(targetUrl);
        }
        return undefined;
      }),
  );
});


