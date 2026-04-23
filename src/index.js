import React, { useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import { register, installAppPrompt } from './pwaConfig';

function initGoogleTranslate() {
  if (typeof google !== 'undefined' && google.translate) {
    // Widget already loaded
    return;
  }
  
  // Detect user language preference
  const savedLang = localStorage.getItem('googtrans_selected_lang');
  if (savedLang) {
    // Trigger language change after widget loads
    setTimeout(() => {
      const select = document.querySelector('.goog-te-combo');
      if (select) {
        select.value = savedLang;
        select.dispatchEvent(new Event('change'));
      }
    }, 1000);
  }
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Language persistence
document.addEventListener('googtranschanged', function(event) {
  const lang = event.target?.querySelector('.goog-te-combo')?.value || 'en';
  localStorage.setItem('googtrans_selected_lang', lang);
});

register().then(installAppPrompt);
initGoogleTranslate();

reportWebVitals();
