describe('Diary Sharing - Complete Workflow', () => {
  beforeEach(() => {
    cy.login();
    cy.navigateToDiary();
    cy.createDiaryEntry('Sharing Test Entry', 'Entry for testing sharing functionality');
    cy.get('[data-test="entry-item"]').first().click();
  });

  describe('Generate Share Links', () => {
    it('should generate shareable link', () => {
      cy.generateShareLink().then((link) => {
        expect(link).to.match(/^http/);
        expect(link).to.include('token=');
      });
    });

    it('should show generated link in share modal', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="generate-link-btn"]').click();
      cy.get('[data-test="share-link-input"]').should('be.visible');
    });

    it('should allow copying share link', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="generate-link-btn"]').click();
      cy.get('[data-test="copy-link-btn"]').click();
      cy.get('[data-test="success-toast"]').should('contain', 'copied');
    });

    it('should generate unique link each time', () => {
      let firstLink;
      
      cy.generateShareLink().then((link) => {
        firstLink = link;
      });
      
      cy.generateShareLink().then((secondLink) => {
        expect(secondLink).to.not.equal(firstLink);
      });
    });

    it('should set link expiration date', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="generate-link-btn"]').click();
      cy.get('[data-test="expiration-date"]').should('be.visible');
    });

    it('should allow custom expiration dates', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="custom-expiration-checkbox"]').click();
      cy.get('[data-test="expiration-input"]').type('2026-06-07');
      cy.get('[data-test="generate-link-btn"]').click();
      cy.get('[data-test="success-toast"]').should('be.visible');
    });

    it('should show expiration info on link', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="generate-link-btn"]').click();
      cy.get('[data-test="expiration-info"]').should('be.visible');
      cy.get('[data-test="expiration-info"]').should('contain', 'days');
    });
  });

  describe('Share Link Access', () => {
    it('should allow accessing shared entry via link', () => {
      let shareLink;
      
      cy.generateShareLink().then((link) => {
        shareLink = link;
        cy.logout();
        cy.visit(shareLink);
        cy.get('[data-test="entry-title"]').should('contain', 'Sharing Test Entry');
      });
    });

    it('should show entry details for shared link', () => {
      cy.generateShareLink().then((link) => {
        cy.logout();
        cy.visit(link);
        cy.get('[data-test="entry-content"]').should('be.visible');
        cy.get('[data-test="entry-date"]').should('be.visible');
      });
    });

    it('should prevent editing via shared link', () => {
      cy.generateShareLink().then((link) => {
        cy.logout();
        cy.visit(link);
        cy.get('[data-test="edit-entry-btn"]').should('not.exist');
      });
    });

    it('should prevent deleting via shared link', () => {
      cy.generateShareLink().then((link) => {
        cy.logout();
        cy.visit(link);
        cy.get('[data-test="delete-entry-btn"]').should('not.exist');
      });
    });

    it('should show expired link error', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="custom-expiration-checkbox"]').click();
      cy.get('[data-test="expiration-input"]').type('2026-05-01'); // Past date
      cy.get('[data-test="generate-link-btn"]').click();
      
      cy.logout();
      cy.visit('/diary/share/expired-token');
      cy.get('[data-test="error-message"]').should('contain', 'expired');
    });

    it('should show invalid link error', () => {
      cy.logout();
      cy.visit('/diary/share/invalid-token');
      cy.get('[data-test="error-message"]').should('contain', 'not found');
    });
  });

  describe('Revoke Shares', () => {
    beforeEach(() => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="generate-link-btn"]').click();
    });

    it('should revoke share link', () => {
      cy.revokeShare('link-id');
      cy.get('[data-test="entry-item"]').first().click();
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="share-list-item"]').should('have.length', 0);
    });

    it('should prevent access to revoked link', () => {
      let shareLink;
      
      cy.get('[data-test="share-link-input"]').invoke('val').then((link) => {
        shareLink = link;
      });
      
      cy.get('[data-test="revoke-link-btn"]').click();
      cy.get('[data-test="confirm-revoke-btn"]').click();
      
      cy.logout();
      cy.visit(shareLink);
      cy.get('[data-test="error-message"]').should('contain', 'revoked');
    });

    it('should show confirmation before revoking', () => {
      cy.get('[data-test="revoke-link-btn"]').click();
      cy.get('[data-test="confirm-modal"]').should('contain', 'revoke');
    });

    it('should confirm revocation was successful', () => {
      cy.get('[data-test="revoke-link-btn"]').click();
      cy.get('[data-test="confirm-revoke-btn"]').click();
      cy.get('[data-test="success-toast"]').should('contain', 'revoked');
    });
  });

  describe('Export Formats', () => {
    it('should export entry as JSON', () => {
      cy.exportAsJSON();
      cy.readFile('cypress/downloads/diary-entry.json').should('exist').then((content) => {
        const data = JSON.parse(content);
        expect(data.title).to.equal('Sharing Test Entry');
      });
    });

    it('should export entry as CSV', () => {
      cy.exportAsCSV();
      cy.readFile('cypress/downloads/diary-entry.csv').should('exist');
    });

    it('should export with all metadata', () => {
      cy.exportAsJSON();
      cy.readFile('cypress/downloads/diary-entry.json').then((content) => {
        const data = JSON.parse(content);
        expect(data).to.have.property('title');
        expect(data).to.have.property('content');
        expect(data).to.have.property('date');
        expect(data).to.have.property('tags');
        expect(data).to.have.property('comments');
      });
    });

    it('should export with version history', () => {
      cy.get('[data-test="edit-entry-btn"]').click();
      cy.get('.ql-editor').type('Updated content');
      cy.get('[data-test="save-entry-btn"]').click();
      
      cy.exportAsJSON();
      cy.readFile('cypress/downloads/diary-entry.json').then((content) => {
        const data = JSON.parse(content);
        expect(data.versions).to.have.length.greaterThan(1);
      });
    });

    it('should include comments in export', () => {
      cy.get('[data-test="comment-input"]').type('Test comment');
      cy.get('[data-test="add-comment-btn"]').click();
      
      cy.exportAsJSON();
      cy.readFile('cypress/downloads/diary-entry.json').then((content) => {
        const data = JSON.parse(content);
        expect(data.comments).to.have.length.greaterThan(0);
      });
    });

    it('should allow bulk export of multiple entries', () => {
      cy.navigateToDiary();
      cy.get('[data-test="bulk-action-checkbox"]').eq(0).click();
      cy.get('[data-test="bulk-action-checkbox"]').eq(1).click();
      cy.get('[data-test="bulk-export-btn"]').click();
      cy.get('[data-test="export-format"]').select('json');
      cy.get('[data-test="execute-export-btn"]').click();
      
      cy.readFile('cypress/downloads/diary-entries.json').should('exist');
    });
  });

  describe('Share via Social Media', () => {
    it('should share to Twitter/X', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="share-twitter-btn"]').click();
      cy.origin('https://twitter.com', () => {
        cy.get('[data-test="tweet-text"]').should('be.visible');
      });
    });

    it('should share to Facebook', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="share-facebook-btn"]').click();
      cy.origin('https://facebook.com', () => {
        cy.get('[data-test="share-dialog"]').should('be.visible');
      });
    });

    it('should share via email', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="share-email-btn"]').click();
      cy.get('[data-test="email-input"]').type('friend@example.com');
      cy.get('[data-test="send-email-btn"]').click();
      cy.get('[data-test="success-toast"]').should('contain', 'sent');
    });

    it('should generate preset share message', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="share-twitter-btn"]').click();
      cy.origin('https://twitter.com', () => {
        cy.get('[data-test="tweet-text"]').invoke('val').then((text) => {
          expect(text).to.include('Sharing Test Entry');
        });
      });
    });
  });

  describe('Share Settings', () => {
    it('should allow comments on shared entry', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="allow-comments-checkbox"]').check();
      cy.get('[data-test="generate-link-btn"]').click();
      
      cy.logout();
      cy.generateShareLink().then((link) => {
        cy.visit(link);
        cy.get('[data-test="comment-input"]').should('be.visible');
      });
    });

    it('should prevent comments on shared entry if disabled', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="allow-comments-checkbox"]').uncheck();
      cy.get('[data-test="generate-link-btn"]').click();
      
      cy.logout();
      cy.generateShareLink().then((link) => {
        cy.visit(link);
        cy.get('[data-test="comment-input"]').should('not.exist');
      });
    });

    it('should allow password protection on shared link', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="password-protect-checkbox"]').check();
      cy.get('[data-test="password-input"]').type('secure123');
      cy.get('[data-test="generate-link-btn"]').click();
      
      cy.logout();
      cy.generateShareLink().then((link) => {
        cy.visit(link);
        cy.get('[data-test="password-input"]').should('be.visible');
      });
    });

    it('should allow read-only sharing', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="read-only-checkbox"]').check();
      cy.get('[data-test="generate-link-btn"]').click();
      
      cy.logout();
      cy.generateShareLink().then((link) => {
        cy.visit(link);
        cy.get('[data-test="edit-entry-btn"]').should('not.exist');
      });
    });

    it('should allow setting view limits', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="view-limit-checkbox"]').check();
      cy.get('[data-test="view-limit-input"]').type('5');
      cy.get('[data-test="generate-link-btn"]').click();
      
      cy.get('[data-test="view-info"]').should('contain', '5');
    });
  });

  describe('Share History', () => {
    it('should display share history', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="share-history"]').should('be.visible');
    });

    it('should show all shared links', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="generate-link-btn"]').click();
      cy.get('[data-test="generate-link-btn"]').click();
      
      cy.get('[data-test="share-list-item"]').should('have.length', 2);
    });

    it('should show share creation date', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="share-list-item"]').first().within(() => {
        cy.get('[data-test="share-created-date"]').should('be.visible');
      });
    });

    it('should show share view count', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="share-list-item"]').first().within(() => {
        cy.get('[data-test="share-view-count"]').should('be.visible');
      });
    });

    it('should show share expiration status', () => {
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="share-list-item"]').first().within(() => {
        cy.get('[data-test="expiration-badge"]').should('be.visible');
      });
    });
  });
});
