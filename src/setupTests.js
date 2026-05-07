// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

if (typeof global.Notification === 'undefined') {
  class MockNotification {
    static permission = 'granted';

    static requestPermission() {
      return Promise.resolve('granted');
    }

    constructor(title, options = {}) {
      this.title = title;
      this.options = options;
      this.onshow = null;
      this.onclose = null;
      this.onerror = null;
      this.onclick = null;
    }

    close() {}
  }

  global.Notification = MockNotification;
}
