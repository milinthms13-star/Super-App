/**
 * Accessibility utilities for the ReminderAlert module
 * Provides helpers for ARIA attributes, keyboard navigation, and a11y best practices
 */

/**
 * Generate consistent ARIA labels for reminder actions
 * 
 * @param {string} action - Action name (edit, delete, complete, etc.)
 * @param {string} reminderTitle - Title of the reminder
 * @returns {string} Formatted ARIA label
 * 
 * @example
 * getAriaLabel('delete', 'Doctor appointment')
 * // Returns: "Delete reminder: Doctor appointment"
 */
export const getAriaLabel = (action, reminderTitle) => {
  const actions = {
    edit: 'Edit',
    delete: 'Delete',
    complete: 'Mark as complete',
    incomplete: 'Mark as incomplete',
    call: 'Trigger voice call',
    view: 'View details',
  };

  const actionLabel = actions[action] || action;
  return reminderTitle
    ? `${actionLabel} reminder: ${reminderTitle}`
    : actionLabel;
};

/**
 * Check if an element is keyboard visible
 * Useful for showing focus indicators
 * 
 * @param {HTMLElement} element - Element to check
 * @returns {boolean} True if element is visible to keyboard navigation
 */
export const isKeyboardVisible = (element) => {
  if (!element) return false;
  const style = window.getComputedStyle(element);
  return (
    style.display !== 'none' &&
    style.visibility !== 'hidden' &&
    style.opacity !== '0'
  );
};

/**
 * Trap focus within a modal or container
 * Prevents keyboard navigation from leaving the container
 * 
 * @param {React.KeyboardEvent} event - Keyboard event
 * @param {HTMLElement} containerRef - Container element reference
 * 
 * @example
 * const handleKeyDown = (e) => {
 *   trapFocus(e, modalRef.current);
 * };
 */
export const trapFocus = (event, containerRef) => {
  if (!containerRef || event.key !== 'Tab') return;

  const focusableElements = containerRef.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  );

  if (focusableElements.length === 0) return;

  const firstElement = focusableElements[0];
  const lastElement = focusableElements[focusableElements.length - 1];

  if (event.shiftKey) {
    // Shift + Tab
    if (document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
    }
  } else {
    // Tab
    if (document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  }
};

/**
 * Announce changes to screen readers using ARIA live regions
 * Call this when dynamic content changes
 * 
 * @param {string} message - Message to announce
 * @param {string} priority - 'polite' or 'assertive'
 * 
 * @example
 * announceToScreenReader('Reminder deleted successfully', 'polite');
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const announcement = document.createElement('div');
  announcement.setAttribute('role', 'status');
  announcement.setAttribute('aria-live', priority);
  announcement.setAttribute('aria-atomic', 'true');
  announcement.className = 'sr-only';
  announcement.textContent = message;

  document.body.appendChild(announcement);

  // Remove after announcement is made
  setTimeout(() => {
    document.body.removeChild(announcement);
  }, 1000);
};

/**
 * Generate ARIA description for form validation errors
 * 
 * @param {string} fieldName - Name of the form field
 * @param {string} errorMessage - Error message
 * @returns {string} Formatted error description
 */
export const getErrorDescription = (fieldName, errorMessage) => {
  return `${fieldName}: ${errorMessage}`;
};

/**
 * Check if color contrast meets WCAG AA standards
 * (Simple approximation - for actual testing use axe-core or similar)
 * 
 * @param {string} foreground - Foreground color (hex)
 * @param {string} background - Background color (hex)
 * @returns {boolean} True if contrast is sufficient
 */
export const hasGoodContrast = (foreground, background) => {
  // Calculate relative luminance
  const getLuminance = (hex) => {
    const rgb = parseInt(hex.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;

    const [rs, gs, bs] = [r, g, b].map((x) => {
      x = x / 255;
      return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4);
    });

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
  };

  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  const contrast = (lighter + 0.05) / (darker + 0.05);

  return contrast >= 4.5; // WCAG AA standard
};

/**
 * Focus management for modals and dialogs
 * Returns an object with focus trap methods
 * 
 * @param {React.MutableRefObject} containerRef - Container element reference
 * @returns {Object} Focus management methods
 * 
 * @example
 * const focusManager = createFocusManager(formRef);
 * 
 * // In effect:
 * useEffect(() => {
 *   focusManager.trap();
 *   return () => focusManager.restore();
 * }, []);
 */
export const createFocusManager = (containerRef) => {
  let previouslyFocusedElement = null;

  return {
    trap: () => {
      previouslyFocusedElement = document.activeElement;
      if (containerRef?.current?.querySelector) {
        const firstFocusable = containerRef.current.querySelector(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        if (firstFocusable) {
          firstFocusable.focus();
        }
      }
    },
    restore: () => {
      if (previouslyFocusedElement && typeof previouslyFocusedElement.focus === 'function') {
        previouslyFocusedElement.focus();
      }
    },
  };
};

/**
 * Keyboard shortcuts configuration
 * Defines accessible keyboard shortcuts for the reminder app
 */
export const KEYBOARD_SHORTCUTS = {
  newReminder: { key: 'n', ctrl: true, label: 'Create new reminder' },
  save: { key: 's', ctrl: true, label: 'Save reminder' },
  cancel: { key: 'Escape', label: 'Cancel' },
  delete: { key: 'Delete', label: 'Delete reminder' },
  search: { key: '/', label: 'Focus search' },
  filterAll: { key: '1', ctrl: true, label: 'Show all reminders' },
  filterWork: { key: '2', ctrl: true, label: 'Show work reminders' },
  filterPersonal: { key: '3', ctrl: true, label: 'Show personal reminders' },
  filterUrgent: { key: '4', ctrl: true, label: 'Show urgent reminders' },
};

/**
 * Handle keyboard shortcuts globally
 * 
 * @param {React.KeyboardEvent} event - Keyboard event
 * @param {Object} handlers - Object with handler functions
 * @returns {boolean} True if shortcut was handled
 * 
 * @example
 * const handleKeyDown = (e) => {
 *   handleKeyboardShortcut(e, {
 *     newReminder: () => openForm(),
 *     save: () => handleSubmit(),
 *     cancel: () => closeForm(),
 *   });
 * };
 */
export const handleKeyboardShortcut = (event, handlers) => {
  const { ctrlKey, metaKey, key } = event;
  const isMeta = ctrlKey || metaKey;

  // Ctrl/Cmd + N: New reminder
  if (isMeta && key.toLowerCase() === 'n') {
    event.preventDefault();
    handlers.newReminder?.();
    return true;
  }

  // Ctrl/Cmd + S: Save
  if (isMeta && key.toLowerCase() === 's') {
    event.preventDefault();
    handlers.save?.();
    return true;
  }

  // Escape: Cancel
  if (key === 'Escape') {
    event.preventDefault();
    handlers.cancel?.();
    return true;
  }

  // Delete: Delete reminder
  if (key === 'Delete') {
    event.preventDefault();
    handlers.delete?.();
    return true;
  }

  // /: Focus search
  if (key === '/' && !event.target.matches('input, textarea')) {
    event.preventDefault();
    handlers.search?.();
    return true;
  }

  // Ctrl/Cmd + 1-4: Filter reminders
  if (isMeta && key >= '1' && key <= '4') {
    event.preventDefault();
    const filterMap = {
      '1': handlers.filterAll,
      '2': handlers.filterWork,
      '3': handlers.filterPersonal,
      '4': handlers.filterUrgent,
    };
    filterMap[key]?.();
    return true;
  }

  return false;
};

/**
 * Create accessibility instructions for users
 * 
 * @returns {string} Formatted keyboard shortcuts help text
 */
export const getKeyboardShortcutsHelp = () => {
  return Object.entries(KEYBOARD_SHORTCUTS)
    .map(([, { key, ctrl, label }]) => {
      const prefix = ctrl ? 'Ctrl+' : '';
      return `${prefix}${key}: ${label}`;
    })
    .join('\n');
};

/**
 * Validate form accessibility
 * Check if form has proper labels, descriptions, and error associations
 * 
 * @param {HTMLFormElement} formElement - Form to validate
 * @returns {Object} Validation result with issues array
 * 
 * @example
 * const result = validateFormAccessibility(formRef.current);
 * if (!result.isAccessible) {
 *   console.warn('Accessibility issues found:', result.issues);
 * }
 */
export const validateFormAccessibility = (formElement) => {
  const issues = [];

  if (!formElement) {
    return { isAccessible: false, issues: ['Form element not found'] };
  }

  const inputs = formElement.querySelectorAll('input, select, textarea');
  inputs.forEach((input) => {
    const id = input.id;
    const hasLabel = id ? formElement.querySelector(`label[for="${id}"]`) : false;

    if (!hasLabel && !input.getAttribute('aria-label')) {
      issues.push(`Input without associated label: ${input.name || input.type}`);
    }

    if (!input.getAttribute('aria-describedby') && !input.title) {
      issues.push(`Input without description: ${input.name || input.type}`);
    }
  });

  return {
    isAccessible: issues.length === 0,
    issues,
  };
};
