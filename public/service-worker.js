self.addEventListener('push', (event) => {
  let payload = {};

  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = {};
  }

  const title = payload.title || 'Trip Planner';
  const options = {
    body: payload.body || '你有一則旅程提醒。',
    icon: payload.icon || '/icon-192.png',
    badge: payload.badge || '/icon-192.png',
    tag: payload.tag || 'trip-planner-reminder',
    data: {
      url: payload.data?.url || payload.url || '/',
      tripId: payload.data?.tripId || '',
      category: payload.data?.category || '',
      dedupeId: payload.data?.dedupeId || ''
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();

  const targetUrl = new URL(event.notification.data?.url || '/', self.location.origin).toString();

  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true })
      .then((clientList) => {
        const matchingClient = clientList.find((client) => {
          try {
            return new URL(client.url).origin === new URL(targetUrl).origin;
          } catch {
            return false;
          }
        });

        if (matchingClient) {
          if ('navigate' in matchingClient) {
            return matchingClient.navigate(targetUrl).then((client) => client?.focus());
          }
          return matchingClient.focus();
        }

        return self.clients.openWindow(targetUrl);
      })
  );
});
