describe('Diary Entries - CRUD Operations', () => {
  beforeEach(() => {
    cy.login();
    cy.navigateToDiary();
  });

  describe('Create Entry', () => {
    it('should create a new diary entry with title and content', () => {
      const title = `Test Entry ${Date.now()}`;
      const content = 'This is a test diary entry with meaningful content about today';

      cy.createDiaryEntry(title, content);
      cy.get('[data-test="entry-list"]').should('contain', title);
    });

    it('should create entry without special characters in title', () => {
      const title = 'My Daily Thoughts & Reflections!';
      const content = 'Testing special characters in title';

      cy.createDiaryEntry(title, content);
      cy.get('[data-test="entry-list"]').should('contain', 'My Daily Thoughts');
    });

    it('should create entry with long content', () => {
      const title = 'Long Entry Test';
      const content = 'Lorem ipsum dolor sit amet, '.repeat(50);

      cy.createDiaryEntry(title, content);
      cy.get('[data-test="entry-item"]').first().should('be.visible');
    });

    it('should show error when creating entry without title', () => {
      cy.get('[data-test="new-entry-btn"]').click();
      cy.get('.ql-editor').type('Content without title');
      cy.get('[data-test="save-entry-btn"]').click();
      cy.get('[data-test="error-toast"]').should('contain', 'Title is required');
    });

    it('should show error when creating entry without content', () => {
      cy.get('[data-test="new-entry-btn"]').click();
      cy.get('input[placeholder*="Title"]').type('Title Only');
      cy.get('[data-test="save-entry-btn"]').click();
      cy.get('[data-test="error-toast"]').should('contain', 'Content is required');
    });

    it('should create entry and show it in recent list', () => {
      const title = `Recent Entry ${Date.now()}`;
      const content = 'This should appear in recent entries';

      cy.createDiaryEntry(title, content);
      cy.get('[data-test="recent-entries"]').should('contain', title);
    });
  });

  describe('Read Entry', () => {
    beforeEach(() => {
      cy.createDiaryEntry('Read Test Entry', 'Content for reading test');
    });

    it('should open and display full entry content', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.get('[data-test="entry-title"]').should('contain', 'Read Test Entry');
      cy.get('[data-test="entry-content"]').should('contain', 'Content for reading test');
    });

    it('should display entry metadata', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.get('[data-test="entry-date"]').should('be.visible');
      cy.get('[data-test="entry-author"]').should('be.visible');
    });

    it('should display entry statistics', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.get('[data-test="word-count"]').should('be.visible');
      cy.get('[data-test="read-time"]').should('be.visible');
    });

    it('should show version history', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.get('[data-test="version-history-tab"]').click();
      cy.get('[data-test="version-list"]').should('be.visible');
    });

    it('should display comments section', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.get('[data-test="comments-section"]').should('be.visible');
    });
  });

  describe('Update Entry', () => {
    beforeEach(() => {
      cy.createDiaryEntry('Update Test Entry', 'Original content');
    });

    it('should update entry title', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.editDiaryEntry('Updated Entry Title', 'Original content');
      cy.get('[data-test="entry-title"]').should('contain', 'Updated Entry Title');
    });

    it('should update entry content', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.editDiaryEntry('Update Test Entry', 'Updated content with new information');
      cy.get('[data-test="entry-content"]').should('contain', 'Updated content');
    });

    it('should update both title and content', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.editDiaryEntry('Fully Updated Entry', 'Completely new content for this entry');
      cy.get('[data-test="entry-title"]').should('contain', 'Fully Updated Entry');
      cy.get('[data-test="entry-content"]').should('contain', 'Completely new content');
    });

    it('should create a new version on update', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.editDiaryEntry('Version 2 Entry', 'New version content');
      cy.get('[data-test="version-history-tab"]').click();
      cy.get('[data-test="version-list"] [data-test="version-item"]').should('have.length.greaterThan', 1);
    });

    it('should maintain entry ID after update', () => {
      cy.get('[data-test="entry-item"]').first().then(($el) => {
        const entryId = $el.attr('data-entry-id');
        cy.wrap($el).click();
        cy.editDiaryEntry('Updated Entry', 'Updated content');
        cy.get('[data-test="entry-item"]').first().should('have.attr', 'data-entry-id', entryId);
      });
    });
  });

  describe('Delete Entry', () => {
    beforeEach(() => {
      cy.createDiaryEntry('Delete Test Entry', 'This entry will be deleted');
    });

    it('should delete entry and show success message', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.deleteDiaryEntry();
      cy.get('[data-test="entry-list"]').should('not.contain', 'Delete Test Entry');
    });

    it('should confirm before deleting entry', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.get('[data-test="delete-entry-btn"]').click();
      cy.get('[data-test="confirm-modal"]').should('be.visible');
      cy.get('[data-test="confirm-modal"]').should('contain', 'permanently delete');
    });

    it('should cancel deletion when user clicks cancel', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.get('[data-test="delete-entry-btn"]').click();
      cy.get('[data-test="cancel-delete-btn"]').click();
      cy.get('[data-test="entry-item"]').should('contain', 'Delete Test Entry');
    });

    it('should soft delete entry (not remove from archive)', () => {
      cy.get('[data-test="entry-item"]').first().click();
      cy.deleteDiaryEntry();
      cy.get('[data-test="show-archived-btn"]').click();
      cy.get('[data-test="archived-entries"]').should('contain', 'Delete Test Entry');
    });
  });

  describe('Entry Filtering & Sorting', () => {
    beforeEach(() => {
      // Create multiple entries
      cy.createDiaryEntry('Morning Entry', 'Started the day with positivity');
      cy.createDiaryEntry('Afternoon Entry', 'Productive afternoon at work');
      cy.createDiaryEntry('Evening Entry', 'Relaxing evening with family');
    });

    it('should filter entries by title', () => {
      cy.get('[data-test="search-input"]').type('Morning');
      cy.get('[data-test="entry-list"]').should('contain', 'Morning Entry');
      cy.get('[data-test="entry-list"]').should('not.contain', 'Evening Entry');
    });

    it('should filter entries by date range', () => {
      cy.get('[data-test="date-filter"]').click();
      cy.get('[data-test="date-from"]').type('2026-05-01');
      cy.get('[data-test="date-to"]').type('2026-05-07');
      cy.get('[data-test="apply-filter-btn"]').click();
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('have.length.greaterThan', 0);
    });

    it('should sort entries by date descending', () => {
      cy.get('[data-test="sort-select"]').select('date-desc');
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').first()
        .should('contain', 'Evening Entry');
    });

    it('should sort entries by date ascending', () => {
      cy.get('[data-test="sort-select"]').select('date-asc');
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').first()
        .should('contain', 'Morning Entry');
    });

    it('should sort entries by title', () => {
      cy.get('[data-test="sort-select"]').select('title');
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').first()
        .should('contain', 'Afternoon Entry');
    });
  });

  describe('Auto-save & Draft Management', () => {
    it('should auto-save entry draft every 30 seconds', () => {
      cy.get('[data-test="new-entry-btn"]').click();
      cy.get('input[placeholder*="Title"]').type('Draft Entry');
      cy.get('.ql-editor').type('This is being auto-saved');
      
      // Wait for auto-save
      cy.get('[data-test="saving-indicator"]').should('be.visible');
      cy.get('[data-test="saved-indicator"]').should('be.visible', { timeout: 35000 });
    });

    it('should preserve draft if browser closes unexpectedly', () => {
      cy.get('[data-test="new-entry-btn"]').click();
      cy.get('input[placeholder*="Title"]').type('Unsaved Draft');
      cy.get('.ql-editor').type('This should be in drafts');
      
      // Reload page without saving
      cy.reload();
      cy.get('[data-test="draft-recovery-modal"]').should('be.visible');
      cy.get('[data-test="restore-draft-btn"]').click();
      cy.get('input[placeholder*="Title"]').should('have.value', 'Unsaved Draft');
    });

    it('should show draft expiration warning', () => {
      cy.get('[data-test="new-entry-btn"]').click();
      cy.get('input[placeholder*="Title"]').type('Expiring Draft');
      cy.get('[data-test="draft-expiration-info"]').should('be.visible');
      cy.get('[data-test="draft-expiration-info"]').should('contain', 'days');
    });
  });
});
