// public/sw.js

self.addEventListener('push', function (event) {
  if (event.data) {
    const data = event.data.json();
    
    const options = {
      body: data.body,
      icon: '/logo.svg', // O ícone do seu app
      badge: '/logo.svg', // O ícone pequeno que fica na barra de status do Android
      vibrate: [200, 100, 200, 100, 200], // Vibração personalizada
      data: {
        url: data.url || '/' // A URL mágica (Deep Link) que vamos mandar do backend
      }
    };

    event.waitUntil(
      self.registration.showNotification(data.title, options)
    );
  }
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close(); // Fecha a notificação
  
  // Abre a URL que mandamos no payload (ex: /seller/rotas ou /admin/pedidos)
  event.waitUntil(
    clients.matchAll({ type: 'window' }).then((windowClients) => {
      // Se o app já estiver aberto, foca nele e navega
      for (let i = 0; i < windowClients.length; i++) {
        const client = windowClients[i];
        if (client.url === event.notification.data.url && 'focus' in client) {
          return client.focus();
        }
      }
      // Se estiver fechado, abre uma nova janela
      if (clients.openWindow) {
        return clients.openWindow(event.notification.data.url);
      }
    })
  );
});