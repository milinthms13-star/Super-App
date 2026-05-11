// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';
import { TextDecoder, TextEncoder } from 'util';
import { ReadableStream, TransformStream, WritableStream } from 'stream/web';

if (typeof global.TextEncoder === 'undefined') {
  global.TextEncoder = TextEncoder;
}

if (typeof global.TextDecoder === 'undefined') {
  global.TextDecoder = TextDecoder;
}

if (typeof global.ReadableStream === 'undefined') {
  global.ReadableStream = ReadableStream;
}

if (typeof global.WritableStream === 'undefined') {
  global.WritableStream = WritableStream;
}

if (typeof global.TransformStream === 'undefined') {
  global.TransformStream = TransformStream;
}

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

if (typeof global.IntersectionObserver === 'undefined') {
  class MockIntersectionObserver {
    constructor(callback, options = {}) {
      this.callback = callback;
      this.options = options;
    }

    observe(target) {
      if (this.callback && target) {
        this.callback([{ isIntersecting: true, target }], this);
      }
    }

    unobserve() {}

    disconnect() {}

    takeRecords() {
      return [];
    }
  }

  global.IntersectionObserver = MockIntersectionObserver;
}

if (typeof navigator !== 'undefined' && typeof navigator.geolocation === 'undefined') {
  navigator.geolocation = {
    getCurrentPosition: (success) => {
      success({
        coords: {
          latitude: 10.8505,
          longitude: 76.2711,
          accuracy: 25,
        },
      });
    },
    watchPosition: (success) => {
      success({
        coords: {
          latitude: 10.8505,
          longitude: 76.2711,
          accuracy: 25,
        },
      });
      return 1;
    },
    clearWatch: () => {},
  };
}
