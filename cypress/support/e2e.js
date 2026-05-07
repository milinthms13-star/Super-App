// cypress/support/e2e.js
import './commands';

// Disable console errors in tests (optional)
const app = window.top;

try {
  if (!app.document.head.querySelector('[data-hide-command-log-request]')) {
    const style = app.document.createElement('style');
    style.innerHTML =
      '.command-name-request, .command-name-xhr { display: none }';
    style.setAttribute('data-hide-command-log-request', '');

    app.document.head.appendChild(style);
  }
} catch (e) {
  // Ignore
}

// Preserve local storage across tests
const localStorageKey = 'cypress-auth-token';

beforeEach(() => {
  // Set up authentication token if available
  const token = localStorage.getItem(localStorageKey);
  if (token) {
    window.localStorage.setItem('authToken', token);
  }
});

afterEach(() => {
  // Save auth token for next test
  const token = window.localStorage.getItem('authToken');
  if (token) {
    localStorage.setItem(localStorageKey, token);
  }
});
