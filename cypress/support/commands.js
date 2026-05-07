// cypress/support/commands.js

// Auth Commands
Cypress.Commands.add('login', (email = 'testuser@example.com', password = 'password123') => {
  cy.visit('/login');
  cy.get('input[name="email"]').type(email);
  cy.get('input[name="password"]').type(password);
  cy.get('button[type="submit"]').click();
  
  // Wait for redirect to dashboard
  cy.url().should('include', '/dashboard');
  
  // Save auth token
  cy.window().then((win) => {
    const token = win.localStorage.getItem('authToken');
    if (token) {
      localStorage.setItem('cypress-auth-token', token);
    }
  });
});

Cypress.Commands.add('logout', () => {
  cy.get('[data-test="user-menu"]').click();
  cy.get('[data-test="logout-btn"]').click();
  cy.url().should('include', '/login');
});

// Diary Commands
Cypress.Commands.add('navigateToDiary', () => {
  cy.visit('/diary');
  cy.get('[data-test="diary-module"]').should('be.visible');
});

Cypress.Commands.add('createDiaryEntry', (title, content) => {
  cy.get('[data-test="new-entry-btn"]').click();
  cy.get('input[placeholder*="Title"]').type(title);
  cy.get('.ql-editor').type(content);
  cy.get('[data-test="save-entry-btn"]').click();
  cy.get('[data-test="success-toast"]').should('be.visible');
});

Cypress.Commands.add('editDiaryEntry', (newTitle, newContent) => {
  cy.get('[data-test="edit-entry-btn"]').click();
  cy.get('input[placeholder*="Title"]').clear().type(newTitle);
  cy.get('.ql-editor').clear().type(newContent);
  cy.get('[data-test="save-entry-btn"]').click();
  cy.get('[data-test="success-toast"]').should('be.visible');
});

Cypress.Commands.add('deleteDiaryEntry', () => {
  cy.get('[data-test="delete-entry-btn"]').click();
  cy.get('[data-test="confirm-delete-btn"]').click();
  cy.get('[data-test="success-toast"]').should('be.visible');
});

// Comment Commands
Cypress.Commands.add('addComment', (commentText) => {
  cy.get('[data-test="comment-input"]').type(commentText);
  cy.get('[data-test="add-comment-btn"]').click();
  cy.get('[data-test="comment-list"] [data-test="comment-item"]').last().should('contain', commentText);
});

Cypress.Commands.add('replyToComment', (commentIndex, replyText) => {
  cy.get('[data-test="comment-item"]').eq(commentIndex).within(() => {
    cy.get('[data-test="reply-btn"]').click();
  });
  cy.get('[data-test="reply-input"]').type(replyText);
  cy.get('[data-test="add-reply-btn"]').click();
});

Cypress.Commands.add('likeComment', (commentIndex) => {
  cy.get('[data-test="comment-item"]').eq(commentIndex).within(() => {
    cy.get('[data-test="like-btn"]').click();
  });
});

Cypress.Commands.add('deleteComment', (commentIndex) => {
  cy.get('[data-test="comment-item"]').eq(commentIndex).within(() => {
    cy.get('[data-test="delete-comment-btn"]').click();
  });
  cy.get('[data-test="confirm-delete-btn"]').click();
});

// Tag Commands
Cypress.Commands.add('addTag', (tagName) => {
  cy.get('[data-test="tag-input"]').type(tagName);
  cy.get('[data-test="add-tag-btn"]').click();
  cy.get('[data-test="tag-badge"]').should('contain', tagName);
});

Cypress.Commands.add('removeTag', (tagName) => {
  cy.get('[data-test="tag-badge"]').contains(tagName).within(() => {
    cy.get('[data-test="remove-tag-btn"]').click();
  });
});

Cypress.Commands.add('addPredefinedTag', (tagCategory) => {
  cy.get('[data-test="predefined-tags"]').click();
  cy.get('[data-test="tag-option"]').contains(tagCategory).click();
  cy.get('[data-test="tag-badge"]').should('contain', tagCategory);
});

// Share Commands
Cypress.Commands.add('generateShareLink', () => {
  cy.get('[data-test="share-btn"]').click();
  cy.get('[data-test="generate-link-btn"]').click();
  cy.get('[data-test="share-link-input"]').should('be.visible');
  return cy.get('[data-test="share-link-input"]').invoke('val');
});

Cypress.Commands.add('exportAsJSON', () => {
  cy.get('[data-test="share-btn"]').click();
  cy.get('[data-test="export-json-btn"]').click();
  cy.readFile('cypress/downloads/diary-entry.json').should('exist');
});

Cypress.Commands.add('exportAsCSV', () => {
  cy.get('[data-test="share-btn"]').click();
  cy.get('[data-test="export-csv-btn"]').click();
  cy.readFile('cypress/downloads/diary-entry.csv').should('exist');
});

Cypress.Commands.add('revokeShare', (linkId) => {
  cy.get('[data-test="share-btn"]').click();
  cy.get(`[data-test="revoke-link-${linkId}"]`).click();
  cy.get('[data-test="confirm-revoke-btn"]').click();
  cy.get('[data-test="success-toast"]').should('be.visible');
});

// Utility Commands
Cypress.Commands.add('waitForElement', (selector, timeout = 5000) => {
  cy.get(selector, { timeout }).should('be.visible');
});

Cypress.Commands.add('fillFormField', (label, value) => {
  cy.contains('label', label).parent().find('input').type(value);
});
