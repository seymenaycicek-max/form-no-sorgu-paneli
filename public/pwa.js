if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/service-worker.js').catch(() => {
      // Kurulum desteği yoksa sayfanın normal çalışmasını bozma.
    });
  });
}
