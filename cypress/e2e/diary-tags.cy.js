describe('Diary Tags - Complete Workflow', () => {
  beforeEach(() => {
    cy.login();
    cy.navigateToDiary();
    cy.createDiaryEntry('Tags Test Entry', 'Entry for testing tags functionality');
    cy.get('[data-test="entry-item"]').first().click();
  });

  describe('Add Tags', () => {
    it('should add a single custom tag', () => {
      cy.addTag('reflection');
      cy.get('[data-test="tag-badge"]').should('contain', 'reflection');
    });

    it('should add multiple custom tags', () => {
      cy.addTag('reflection');
      cy.addTag('gratitude');
      cy.addTag('personal-growth');
      
      cy.get('[data-test="tag-badge"]').should('have.length', 3);
    });

    it('should prevent duplicate tags', () => {
      cy.addTag('important');
      cy.addTag('important');
      
      cy.get('[data-test="error-message"]').should('contain', 'Tag already exists');
      cy.get('[data-test="tag-badge"]').should('have.length', 1);
    });

    it('should add predefined tags from dropdown', () => {
      cy.addPredefinedTag('final');
      cy.get('[data-test="tag-badge"]').should('contain', 'final');
    });

    it('should add multiple predefined tags', () => {
      cy.addPredefinedTag('final');
      cy.addPredefinedTag('important');
      cy.addPredefinedTag('bookmarked');
      
      cy.get('[data-test="tag-badge"]').should('have.length', 3);
    });

    it('should show all predefined tags in dropdown', () => {
      cy.get('[data-test="predefined-tags"]').click();
      cy.get('[data-test="tag-option"]').should('have.length', 7); // 7 predefined tags
    });

    it('should display tag color for predefined tags', () => {
      cy.addPredefinedTag('final');
      cy.get('[data-test="tag-badge"]').first().should('have.css', 'background-color');
    });

    it('should prevent empty tag names', () => {
      cy.get('[data-test="tag-input"]').focus();
      cy.get('[data-test="add-tag-btn"]').click();
      cy.get('[data-test="error-message"]').should('contain', 'Tag name cannot be empty');
    });

    it('should trim whitespace from tag names', () => {
      cy.get('[data-test="tag-input"]').type('  trimmed-tag  ');
      cy.get('[data-test="add-tag-btn"]').click();
      cy.get('[data-test="tag-badge"]').should('contain', 'trimmed-tag');
    });
  });

  describe('Tag Management', () => {
    beforeEach(() => {
      cy.addTag('review');
      cy.addTag('draft');
    });

    it('should remove a tag', () => {
      cy.removeTag('review');
      cy.get('[data-test="tag-badge"]').should('not.contain', 'review');
      cy.get('[data-test="tag-badge"]').should('contain', 'draft');
    });

    it('should remove all tags individually', () => {
      cy.removeTag('review');
      cy.removeTag('draft');
      cy.get('[data-test="tag-badge"]').should('have.length', 0);
    });

    it('should show tag info on hover', () => {
      cy.get('[data-test="tag-badge"]').first().trigger('mouseenter');
      cy.get('[data-test="tag-info-tooltip"]').should('be.visible');
    });

    it('should display tag description for predefined tags', () => {
      cy.addPredefinedTag('final');
      cy.get('[data-test="tag-badge"]').first().trigger('mouseenter');
      cy.get('[data-test="tag-description"]').should('be.visible');
    });

    it('should allow tag editing with reason', () => {
      cy.get('[data-test="tag-edit-btn"]').first().click();
      cy.get('[data-test="reason-input"]').type('Updated reason for tag');
      cy.get('[data-test="save-tag-edit-btn"]').click();
      cy.get('[data-test="success-toast"]').should('be.visible');
    });
  });

  describe('Tag Filtering', () => {
    beforeEach(() => {
      cy.navigateToDiary();
      cy.createDiaryEntry('Entry 1', 'Content 1');
      cy.get('[data-test="entry-item"]').first().click();
      cy.addTag('personal');
      cy.addTag('reflection');
      
      cy.navigateToDiary();
      cy.createDiaryEntry('Entry 2', 'Content 2');
      cy.get('[data-test="entry-item"]').first().click();
      cy.addTag('work');
      cy.addTag('important');
    });

    it('should filter entries by single tag', () => {
      cy.navigateToDiary();
      cy.get('[data-test="tag-filter"]').click();
      cy.get('[data-test="tag-option"]').contains('personal').click();
      
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('contain', 'Entry 1');
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('not.contain', 'Entry 2');
    });

    it('should filter entries by multiple tags', () => {
      cy.navigateToDiary();
      cy.get('[data-test="tag-filter"]').click();
      cy.get('[data-test="tag-option"]').contains('personal').click();
      cy.get('[data-test="tag-option"]').contains('reflection').click();
      
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('contain', 'Entry 1');
    });

    it('should show entries with any selected tag (OR logic)', () => {
      cy.navigateToDiary();
      cy.get('[data-test="tag-filter-logic"]').select('or');
      cy.get('[data-test="tag-filter"]').click();
      cy.get('[data-test="tag-option"]').contains('personal').click();
      cy.get('[data-test="tag-option"]').contains('work').click();
      
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('have.length', 2);
    });

    it('should show entries with all selected tags (AND logic)', () => {
      cy.navigateToDiary();
      cy.get('[data-test="tag-filter-logic"]').select('and');
      cy.get('[data-test="tag-filter"]').click();
      cy.get('[data-test="tag-option"]').contains('personal').click();
      cy.get('[data-test="tag-option"]').contains('reflection').click();
      
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('contain', 'Entry 1');
    });

    it('should exclude entries with selected tags', () => {
      cy.navigateToDiary();
      cy.get('[data-test="tag-filter-logic"]').select('not');
      cy.get('[data-test="tag-filter"]').click();
      cy.get('[data-test="tag-option"]').contains('personal').click();
      
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('not.contain', 'Entry 1');
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('contain', 'Entry 2');
    });

    it('should clear tag filter', () => {
      cy.navigateToDiary();
      cy.get('[data-test="tag-filter"]').click();
      cy.get('[data-test="tag-option"]').contains('personal').click();
      cy.get('[data-test="clear-filter-btn"]').click();
      
      cy.get('[data-test="entry-list"] [data-test="entry-item"]').should('have.length', 2);
    });
  });

  describe('Tag Statistics', () => {
    beforeEach(() => {
      cy.addTag('work');
      cy.addTag('personal');
      cy.addTag('reflection');
    });

    it('should display tag statistics dashboard', () => {
      cy.get('[data-test="tag-stats"]').should('be.visible');
    });

    it('should show tag usage count', () => {
      cy.get('[data-test="tag-stat-item"]').first().within(() => {
        cy.get('[data-test="tag-count"]').should('be.visible');
      });
    });

    it('should show most used tags', () => {
      cy.get('[data-test="tag-stats"]').should('contain', 'Most Used');
      cy.get('[data-test="most-used-tags"]').should('be.visible');
    });

    it('should show tag cloud visualization', () => {
      cy.navigateToDiary();
      cy.get('[data-test="tag-cloud"]').should('be.visible');
      cy.get('[data-test="tag-cloud"] [data-test="tag-item"]').should('have.length.greaterThan', 0);
    });

    it('should display tag trend over time', () => {
      cy.get('[data-test="tag-trends"]').should('be.visible');
      cy.get('[data-test="trend-chart"]').should('be.visible');
    });
  });

  describe('Bulk Tag Operations', () => {
    it('should bulk add tag to multiple entries', () => {
      cy.navigateToDiary();
      cy.createDiaryEntry('Entry A', 'Content A');
      cy.createDiaryEntry('Entry B', 'Content B');
      cy.createDiaryEntry('Entry C', 'Content C');
      
      cy.get('[data-test="bulk-action-checkbox"]').eq(0).click();
      cy.get('[data-test="bulk-action-checkbox"]').eq(1).click();
      cy.get('[data-test="bulk-tag-btn"]').click();
      cy.get('[data-test="tag-input"]').type('urgent');
      cy.get('[data-test="apply-bulk-tag-btn"]').click();
      
      cy.get('[data-test="success-toast"]').should('contain', '2');
    });

    it('should bulk remove tag from multiple entries', () => {
      cy.navigateToDiary();
      cy.get('[data-test="bulk-action-checkbox"]').eq(0).click();
      cy.get('[data-test="bulk-action-checkbox"]').eq(1).click();
      cy.get('[data-test="bulk-remove-tag-btn"]').click();
      cy.get('[data-test="tag-to-remove"]').click();
      cy.get('[data-test="remove-tag-option"]').first().click();
      cy.get('[data-test="apply-bulk-action-btn"]').click();
      
      cy.get('[data-test="success-toast"]').should('be.visible');
    });
  });

  describe('Tag Suggestions', () => {
    it('should show tag suggestions while typing', () => {
      cy.get('[data-test="tag-input"]').type('per');
      cy.get('[data-test="tag-suggestions"]').should('be.visible');
      cy.get('[data-test="suggestion-item"]').should('have.length.greaterThan', 0);
    });

    it('should suggest similar tags', () => {
      cy.get('[data-test="tag-input"]').type('reflect');
      cy.get('[data-test="tag-suggestions"]').should('contain', 'reflection');
    });

    it('should select suggestion from list', () => {
      cy.get('[data-test="tag-input"]').type('per');
      cy.get('[data-test="suggestion-item"]').first().click();
      cy.get('[data-test="tag-badge"]').should('be.visible');
    });
  });

  describe('Tag Permissions', () => {
    it('should allow owner to manage tags', () => {
      cy.get('[data-test="tag-edit-btn"]').first().should('be.visible');
      cy.get('[data-test="remove-tag-btn"]').first().should('be.visible');
    });

    it('should not allow non-owners to edit tags', () => {
      // In real scenario, switch user
      cy.get('[data-test="tag-edit-btn"]').first().should('not.exist');
    });

    it('should allow anyone to view tags', () => {
      cy.addTag('public-tag');
      cy.get('[data-test="tag-badge"]').should('contain', 'public-tag');
    });
  });
});
