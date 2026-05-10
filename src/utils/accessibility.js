/**
 * Accessibility (a11y) utilities for Login component
 * WCAG 2.1 AA compliance helpers
 */

/**
 * Announce messages to screen readers
 */
export const announceToScreenReader = (message, priority = 'polite') => {
  const ariaLiveRegion = document.getElementById('aria-live-region');
  
  if (!ariaLiveRegion) {
    const region = document.createElement('div');
    region.id = 'aria-live-region';
    region.setAttribute('aria-live', priority);
    region.setAttribute('aria-atomic', 'true');
    region.style.position = 'absolute';
    region.style.left = '-10000px';
    document.body.appendChild(region);
    region.textContent = message;
  } else {
    ariaLiveRegion.setAttribute('aria-live', priority);
    ariaLiveRegion.textContent = message;
  }
};

/**
 * ARIA labels for form fields
 */
export const getAriaLabel = (fieldType, isLoading = false) => {
  const labels = {
    email: 'Email address',
    phone: 'Phone number',
    fullName: 'Full name',
    username: 'Username',
    otp: 'One-time password',
    mpin: '4-digit MPIN',
  };
  
  const label = labels[fieldType] || fieldType;
  return isLoading ? `${label}, checking availability` : label;
};

/**
 * ARIA descriptions for field validation
 */
export const getAriaDescription = (fieldType, validationState) => {
  const descriptions = {
    username: {
      checking: 'Username availability is being checked',
      available: 'Username is available',
      taken: 'Username is already taken',
      error: 'Invalid username format',
    },
    email: {
      error: 'Please enter a valid email address',
    },
    phone: {
      error: 'Please enter a valid phone number',
    },
    otp: {
      error: 'OTP must be 6 digits',
      expired: 'OTP has expired, request a new one',
    },
  };
  
  return descriptions[fieldType]?.[validationState] || '';
};

/**
 * Focus management helper
 */
export const manageFocus = {
  // Save focus before dialog opens
  saveFocus: () => {
    window.lastFocusedElement = document.activeElement;
  },
  
  // Restore focus after dialog closes
  restoreFocus: () => {
    if (window.lastFocusedElement && window.lastFocusedElement.focus) {
      window.lastFocusedElement.focus();
    }
  },
  
  // Trap focus within modal
  trapFocus: (element) => {
    const focusableElements = element.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];
    
    return (e) => {
      if (e.key === 'Tab') {
        if (e.shiftKey) {
          if (document.activeElement === firstElement) {
            lastElement.focus();
            e.preventDefault();
          }
        } else {
          if (document.activeElement === lastElement) {
            firstElement.focus();
            e.preventDefault();
          }
        }
      }
    };
  },
};

/**
 * Semantic HTML structure validation
 */
export const validateSemanticHTML = () => {
  const issues = [];
  
  // Check for proper heading hierarchy
  const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6');
  let lastLevel = 0;
  headings.forEach(heading => {
    const level = parseInt(heading.tagName[1]);
    if (level > lastLevel + 1) {
      issues.push(`Heading hierarchy issue: ${heading.tagName} after level ${lastLevel}`);
    }
    lastLevel = level;
  });
  
  // Check form labels
  const inputs = document.querySelectorAll('input:not([type="hidden"])');
  inputs.forEach(input => {
    const hasLabel = input.hasAttribute('aria-label') || 
                    input.hasAttribute('aria-labelledby') ||
                    document.querySelector(`label[for="${input.id}"]`);
    if (!hasLabel) {
      issues.push(`Input missing accessible label: ${input.name || input.id}`);
    }
  });
  
  return issues;
};

/**
 * Color contrast checker (simple version)
 * Returns true if contrast ratio >= 4.5:1 for normal text (WCAG AA)
 */
export const isContrastSufficient = (foreground, background) => {
  const getLuminance = (color) => {
    const rgb = parseInt(color.slice(1), 16);
    const r = (rgb >> 16) & 0xff;
    const g = (rgb >> 8) & 0xff;
    const b = (rgb >> 0) & 0xff;
    
    return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  };
  
  const l1 = getLuminance(foreground);
  const l2 = getLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  
  const contrast = (lighter + 0.05) / (darker + 0.05);
  return contrast >= 4.5; // WCAG AA standard
};

/**
 * Keyboard navigation helper
 */
export const setupKeyboardNavigation = (onEscape, onEnter) => {
  return (e) => {
    switch (e.key) {
      case 'Escape':
        onEscape?.();
        break;
      case 'Enter':
        if (!e.target.matches('textarea')) {
          onEnter?.();
        }
        break;
      default:
        break;
    }
  };
};

/**
 * Skip link for keyboard users
 */
export const createSkipLink = (targetId = '#main-content') => {
  const skipLink = document.createElement('a');
  skipLink.href = targetId;
  skipLink.className = 'skip-link';
  skipLink.textContent = 'Skip to main content';
  skipLink.style.cssText = `
    position: absolute;
    top: -40px;
    left: 0;
    background: #000;
    color: #fff;
    padding: 8px;
    z-index: 100;
  `;
  skipLink.addEventListener('focus', () => {
    skipLink.style.top = '0';
  });
  skipLink.addEventListener('blur', () => {
    skipLink.style.top = '-40px';
  });
  document.body.insertBefore(skipLink, document.body.firstChild);
};
