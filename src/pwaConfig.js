// PWA Registration + Install Prompt
export async function register() {
  if ('serviceWorker' in navigator) {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      console.log('SW registered: ', registration);

      // Push subscription
      if ('Notification' in window && 'serviceWorker' in navigator) {
        Notification.requestPermission();
      }

      return registration;
    } catch (error) {
      console.log('SW registration failed');
    }
  }
}

let deferredPrompt;
export function installAppPrompt() {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    // Show install button
    showInstallPromotion();
  });
}

export function handleInstall() {
  if (!deferredPrompt) return;
  
  deferredPrompt.prompt();
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('User accepted PWA install');
    }
    deferredPrompt = null;
  });
}

function showInstallPromotion() {
  // Trigger install banner in App.js
  document.dispatchEvent(new CustomEvent('appinstalledavailable'));
}

export default { register, installAppPrompt, handleInstall };

