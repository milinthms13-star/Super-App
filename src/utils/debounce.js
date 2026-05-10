/**
 * Creates a debounced function that delays invoking func until after wait milliseconds
 * have elapsed since the last time the debounced function was invoked
 * @param {Function} func - The function to debounce
 * @param {number} wait - Milliseconds to wait before calling func
 * @returns {Function} Debounced function
 */
export const debounce = (func, wait = 300) => {
  let timeoutId = null;
  let lastArgs = null;
  let lastThis = null;

  const debounced = function (...args) {
    lastArgs = args;
    lastThis = this;

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    timeoutId = setTimeout(() => {
      func.apply(lastThis, lastArgs);
      timeoutId = null;
    }, wait);
  };

  debounced.cancel = () => {
    if (timeoutId) {
      clearTimeout(timeoutId);
      timeoutId = null;
    }
  };

  return debounced;
};

/**
 * Creates a promise-based debounced function
 * @param {Function} func - Async function to debounce
 * @param {number} wait - Milliseconds to wait
 * @returns {Function} Debounced async function
 */
export const debounceAsync = (func, wait = 300) => {
  let timeoutId = null;
  let lastPromise = null;

  return function debounced(...args) {
    return new Promise((resolve, reject) => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        try {
          lastPromise = Promise.resolve(func.apply(this, args))
            .then(resolve)
            .catch(reject);
        } catch (error) {
          reject(error);
        }
      }, wait);
    });
  };
};
