describe('Diary Integration - Complete Workflows', () => {
  beforeEach(() => {
    cy.login();
    cy.navigateToDiary();
  });

  describe('Complete Entry Lifecycle', () => {
    it('should create, comment, tag, and share an entry', () => {
      const title = `Complete Lifecycle ${Date.now()}`;
      const content = 'Entry that goes through complete workflow';

      // Create
      cy.createDiaryEntry(title, content);
      cy.get('[data-test="entry-list"]').should('contain', title);

      // Open entry
      cy.get('[data-test="entry-item"]').first().click();

      // Add tags
      cy.addTag('important');
      cy.addPredefinedTag('final');

      // Add comments
      cy.addComment('This is a great entry');
      cy.likeComment(0);

      // Add reply
      cy.replyToComment(0, 'Thanks for the feedback');

      // Share
      cy.generateShareLink().then((link) => {
        expect(link).to.match(/^http/);
      });

      // Verify all features present
      cy.get('[data-test="tag-badge"]').should('have.length', 2);
      cy.get('[data-test="comment-item"]').should('have.length', 1);
    });

    it('should edit entry and create new version with comments', () => {
      cy.createDiaryEntry('Version Test', 'Original content');
      cy.get('[data-test="entry-item"]').first().click();

      // Add comment to version 1
      cy.addComment('Comment on original');

      // Edit entry
      cy.editDiaryEntry('Version Test', 'Updated content');

      // Check versions
      cy.get('[data-test="version-history-tab"]').click();
      cy.get('[data-test="version-item"]').should('have.length', 2);

      // Navigate back to latest and add comment to version 2
      cy.get('[data-test="close-version-tab"]').click();
      cy.addComment('Comment on updated');
    });

    it('should maintain comments through entry updates', () => {
      cy.createDiaryEntry('Comment Persistence', 'Initial content');
      cy.get('[data-test="entry-item"]').first().click();

      // Add initial comments
      cy.addComment('First comment');
      cy.addComment('Second comment');

      // Edit entry
      cy.editDiaryEntry('Comment Persistence', 'Updated content');

      // Verify comments still exist
      cy.get('[data-test="comment-item"]').should('have.length', 2);
    });
  });

  describe('Multiple Entries Workflow', () => {
    it('should manage multiple entries with different tags', () => {
      cy.createDiaryEntry('Work Entry', 'Work related content');
      cy.createDiaryEntry('Personal Entry', 'Personal reflection');
      cy.createDiaryEntry('Mixed Entry', 'Both work and personal');

      // Open first entry
      cy.get('[data-test="entry-item"]').eq(0).click();
      cy.addTag('work');
      cy.addPredefinedTag('important');

      // Go back and open second
      cy.navigateToDiary();
      cy.get('[data-test="entry-item"]').eq(1).click();
      cy.addTag('personal');
      cy.addPredefinedTag('reflection');

      // Verify filtering works
      cy.navigateToDiary();
      cy.get('[data-test="tag-filter"]').click();
      cy.get('[data-test="tag-option"]').contains('work').click();
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('have.length', 2);
    });

    it('should share multiple entries in bulk', () => {
      cy.createDiaryEntry('Shareable 1', 'Content 1');
      cy.createDiaryEntry('Shareable 2', 'Content 2');

      cy.get('[data-test="bulk-action-checkbox"]').eq(0).click();
      cy.get('[data-test="bulk-action-checkbox"]').eq(1).click();
      cy.get('[data-test="bulk-share-btn"]').click();

      cy.get('[data-test="generate-bulk-link-btn"]').click();
      cy.get('[data-test="bulk-share-links"]').should('be.visible');
    });

    it('should search across multiple entries with comments and tags', () => {
      cy.createDiaryEntry('Search Entry 1', 'Implementation details');
      cy.createDiaryEntry('Search Entry 2', 'More implementation');

      // Add tags and comments
      cy.get('[data-test="entry-item"]').eq(0).click();
      cy.addTag('implementation');
      cy.addComment('Critical implementation note');

      cy.navigateToDiary();
      cy.get('[data-test="entry-item"]').eq(1).click();
      cy.addTag('implementation');

      // Search
      cy.navigateToDiary();
      cy.get('[data-test="global-search"]').type('implementation');
      cy.get('[data-test="search-results"]').should('contain', 'Search Entry 1');
      cy.get('[data-test="search-results"]').should('contain', 'Search Entry 2');
    });
  });

  describe('Comment Threaded Discussions', () => {
    it('should create deep conversation thread', () => {
      cy.createDiaryEntry('Discussion Entry', 'Topic for discussion');
      cy.get('[data-test="entry-item"]').first().click();

      // Main comment
      cy.addComment('Initial thought');

      // First level replies
      cy.replyToComment(0, 'I agree with that point');
      cy.replyToComment(0, 'Interesting perspective');

      // Add likes to create engagement
      cy.likeComment(0);

      // Check thread structure
      cy.get('[data-test="comment-item"]').first().within(() => {
        cy.get('[data-test="reply-count"]').should('contain', '2');
      });
    });

    it('should track sentiment across comment thread', () => {
      cy.createDiaryEntry('Sentiment Test', 'Entry content');
      cy.get('[data-test="entry-item"]').first().click();

      cy.addComment('Positive sentiment here');
      cy.addComment('Negative sentiment here');
      cy.addComment('Neutral sentiment');

      // Check sentiment stats
      cy.get('[data-test="sentiment-stats"]').should('be.visible');
      cy.get('[data-test="positive-count"]').should('contain', '1');
      cy.get('[data-test="negative-count"]').should('contain', '1');
      cy.get('[data-test="neutral-count"]').should('contain', '1');
    });
  });

  describe('Tag-based Workflows', () => {
    it('should organize entries by tag categories', () => {
      // Create categorized entries
      cy.createDiaryEntry('Work Meeting', 'Team meeting notes');
      cy.createDiaryEntry('Personal Goals', 'This year goals');
      cy.createDiaryEntry('Health Log', 'Exercise and diet');

      // Tag them
      cy.get('[data-test="entry-item"]').eq(0).click();
      cy.addPredefinedTag('review-ready');
      cy.navigateToDiary();

      cy.get('[data-test="entry-item"]').eq(1).click();
      cy.addTag('goals');
      cy.navigateToDiary();

      cy.get('[data-test="entry-item"]').eq(2).click();
      cy.addTag('health');
      cy.navigateToDiary();

      // Filter by tags
      cy.get('[data-test="tag-filter"]').click();
      cy.get('[data-test="tag-option"]').contains('review-ready').click();
      cy.get('[data-test="entry-list"]').should('contain', 'Work Meeting');
    });

    it('should use tags for entry status management', () => {
      cy.createDiaryEntry('Draft Entry', 'Work in progress');
      cy.get('[data-test="entry-item"]').first().click();

      // Add draft tag
      cy.addPredefinedTag('draft');
      cy.addComment('Still editing this entry');

      // Promote to final
      cy.get('[data-test="tag-edit-btn"]').click();
      cy.removeTag('draft');
      cy.addPredefinedTag('final');

      // Verify status changed
      cy.get('[data-test="tag-badge"]').should('not.contain', 'draft');
      cy.get('[data-test="tag-badge"]').should('contain', 'final');
    });
  });

  describe('Share and Collaboration Workflow', () => {
    it('should share entry and receive comments on shared version', () => {
      cy.createDiaryEntry('Collaborative Entry', 'Shared content');
      cy.get('[data-test="entry-item"]').first().click();

      // Generate share link with comments enabled
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="allow-comments-checkbox"]').check();
      cy.generateShareLink().then((link) => {
        // Access as guest
        cy.logout();
        cy.visit(link);
        cy.get('[data-test="comment-input"]').type('Great entry!');
        cy.get('[data-test="add-comment-btn"]').click();
        
        // Return as owner
        cy.login();
        cy.navigateToDiary();
        cy.get('[data-test="entry-item"]').first().click();
        cy.get('[data-test="comment-item"]').should('contain', 'Great entry!');
      });
    });

    it('should manage shared link permissions', () => {
      cy.createDiaryEntry('Permission Test', 'Testing permissions');
      cy.get('[data-test="entry-item"]').first().click();

      // Create different share links
      cy.get('[data-test="share-btn"]').click();
      cy.get('[data-test="read-only-checkbox"]').check();
      cy.get('[data-test="generate-link-btn"]').click();
      cy.get('[data-test="share-list-item"]').should('have.length', 1);

      // Update permissions
      cy.get('[data-test="share-settings-btn"]').click();
      cy.get('[data-test="allow-comments-toggle"]').click();
      cy.get('[data-test="apply-settings-btn"]').click();

      cy.get('[data-test="success-toast"]').should('be.visible');
    });
  });

  describe('Export and Archive Workflow', () => {
    it('should export complete entry with all related data', () => {
      cy.createDiaryEntry('Export Test', 'Complete content');
      cy.get('[data-test="entry-item"]').first().click();

      // Add tags
      cy.addTag('archive');
      cy.addPredefinedTag('important');

      // Add comments
      cy.addComment('Note about this entry');
      cy.likeComment(0);

      // Edit for version history
      cy.editDiaryEntry('Export Test', 'Updated export content');

      // Export
      cy.exportAsJSON();
      cy.readFile('cypress/downloads/diary-entry.json').then((content) => {
        const data = JSON.parse(content);
        expect(data).to.have.property('tags');
        expect(data.tags).to.include('archive');
        expect(data).to.have.property('comments');
        expect(data.comments.length).to.equal(1);
        expect(data).to.have.property('versions');
        expect(data.versions.length).to.equal(2);
      });
    });

    it('should archive and restore entries', () => {
      cy.createDiaryEntry('Archive Test', 'Entry to archive');
      
      cy.get('[data-test="entry-item"]').first().click();
      cy.get('[data-test="delete-entry-btn"]').click();
      cy.get('[data-test="confirm-delete-btn"]').click();

      // Show archived
      cy.navigateToDiary();
      cy.get('[data-test="show-archived-btn"]').click();
      cy.get('[data-test="archived-entries"]').should('contain', 'Archive Test');

      // Restore
      cy.get('[data-test="archived-entry-item"]').first().within(() => {
        cy.get('[data-test="restore-btn"]').click();
      });

      cy.get('[data-test="success-toast"]').should('contain', 'restored');
      cy.get('[data-test="entry-list"]').should('contain', 'Archive Test');
    });
  });

  describe('Performance & Large Dataset Handling', () => {
    it('should handle loading many entries', () => {
      // Create multiple entries (simulated by API call in real scenario)
      for (let i = 0; i < 10; i++) {
        cy.createDiaryEntry(`Entry ${i + 1}`, `Content for entry ${i + 1}`);
      }

      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('have.length.at.least', 10);
    });

    it('should paginate large entry lists', () => {
      for (let i = 0; i < 25; i++) {
        cy.createDiaryEntry(`Paginated Entry ${i}`, `Content ${i}`);
      }

      cy.get('[data-test="pagination"]').should('be.visible');
      cy.get('[data-test="page-2-btn"]').click();
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('have.length.greaterThan', 0);
    });

    it('should handle search across large dataset', () => {
      for (let i = 0; i < 20; i++) {
        cy.createDiaryEntry(`Search ${i}`, `Searchable content ${i}`);
      }

      cy.get('[data-test="search-input"]').type('Search');
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('have.length.gte', 10);
    });
  });

  describe('Error Recovery & Edge Cases', () => {
    it('should recover from failed comment submission', () => {
      cy.createDiaryEntry('Error Recovery', 'Test entry');
      cy.get('[data-test="entry-item"]').first().click();

      // Simulate network error
      cy.intercept('POST', '**/api/diary/*/comments', { statusCode: 500 });
      cy.addComment('Failed comment');
      cy.get('[data-test="error-toast"]').should('be.visible');

      // Restore connection and retry
      cy.intercept('POST', '**/api/diary/*/comments', { statusCode: 200 });
      cy.get('[data-test="retry-btn"]').click();
      cy.get('[data-test="comment-item"]').should('be.visible');
    });

    it('should handle concurrent tag and comment updates', () => {
      cy.createDiaryEntry('Concurrent Update', 'Test content');
      cy.get('[data-test="entry-item"]').first().click();

      cy.addTag('tag1');
      cy.addComment('Comment 1');
      cy.addTag('tag2');
      cy.addComment('Comment 2');

      cy.get('[data-test="tag-badge"]').should('have.length', 2);
      cy.get('[data-test="comment-item"]').should('have.length', 2);
    });

    it('should handle deleted shared links gracefully', () => {
      cy.createDiaryEntry('Shared Delete Test', 'Content');
      cy.get('[data-test="entry-item"]').first().click();

      cy.generateShareLink().then((link) => {
        cy.revokeShare('link-id');
        cy.logout();
        cy.visit(link);
        cy.get('[data-test="error-message"]').should('contain', 'link');
      });
    });
  });
});
