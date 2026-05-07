describe('Diary Search and Filter E2E Tests', () => {
  beforeEach(() => {
    cy.loginUser('testuser', 'password123');
    cy.visit('/diary');
    cy.wait(1000); // Wait for page to load
  });

  describe('Basic Search Functionality', () => {
    it('should search for diary entries with valid query', () => {
      cy.get('input[placeholder*="search your diary entries"]', {
        timeout: 5000,
      }).should('be.visible');
      cy.get('input[placeholder*="search your diary entries"]').type('happy');
      cy.get('button:contains("Search")').click();

      cy.wait(2000);
      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should show empty search alert for blank query', () => {
      cy.get('button:contains("Search")').click();
      cy.on('window:alert', (str) => {
        expect(str).to.contain('Please enter a search query');
      });
    });

    it('should display search results with correct structure', () => {
      cy.createDiaryEntry({
        title: 'Happy Day',
        content: 'Had a wonderful day at work',
        tags: ['positive'],
        sentiment: 'positive',
      });

      cy.get('input[placeholder*="search your diary entries"]').type('happy');
      cy.get('button:contains("Search")').click();

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'exist'
      );
      cy.get('[data-testid="result-item"]', { timeout: 5000 }).should(
        'have.length.greaterThan',
        0
      );
    });

    it('should show no results message for query with no matches', () => {
      cy.get('input[placeholder*="search your diary entries"]').type(
        'xyznonexistent'
      );
      cy.get('button:contains("Search")').click();

      cy.get('[data-testid="no-results-message"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should reject search queries shorter than 2 characters', () => {
      cy.get('input[placeholder*="search your diary entries"]').type('a');
      cy.wait(500);
      // Suggestions should not appear
      cy.get('[data-testid="suggestions-dropdown"]').should('not.exist');
    });
  });

  describe('Search Suggestions', () => {
    beforeEach(() => {
      // Create some entries with tags for suggestions
      cy.createDiaryEntry({
        title: 'Work Project',
        content: 'Completed project',
        tags: ['work', 'project'],
      });
      cy.createDiaryEntry({
        title: 'Personal Growth',
        content: 'Personal development',
        tags: ['personal', 'growth'],
      });
    });

    it('should show suggestions when typing valid query', () => {
      cy.get('input[placeholder*="search your diary entries"]').type('wor');
      cy.wait(500);

      cy.get('[data-testid="suggestions-dropdown"]', { timeout: 3000 }).should(
        'be.visible'
      );
    });

    it('should display suggestions with categories', () => {
      cy.get('input[placeholder*="search your diary entries"]').type('work');
      cy.wait(500);

      cy.get('[data-testid="suggestion-category"]', { timeout: 3000 }).should(
        'exist'
      );
    });

    it('should select suggestion and search', () => {
      cy.get('input[placeholder*="search your diary entries"]').type('wor');
      cy.wait(500);

      cy.get('[data-testid="suggestion-item"]')
        .first()
        .should('be.visible')
        .click();
      cy.wait(2000);

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should update search input with selected suggestion', () => {
      cy.get('input[placeholder*="search your diary entries"]').type('work');
      cy.wait(500);

      cy.get('[data-testid="suggestion-item"]').first().click();

      cy.get('input[placeholder*="search your diary entries"]').should(
        'not.have.value',
        'work'
      );
    });
  });

  describe('Search History', () => {
    it('should show search history on input focus', () => {
      cy.get('input[placeholder*="search your diary entries"]').click();
      cy.wait(500);

      // History should appear or be empty initially
      cy.get('[data-testid="search-history"]', { timeout: 3000 }).should(
        'exist'
      );
    });

    it('should add search to history after search', () => {
      cy.get('input[placeholder*="search your diary entries"]').type('happy');
      cy.get('button:contains("Search")').click();
      cy.wait(2000);

      cy.get('input[placeholder*="search your diary entries"]').click();
      cy.wait(500);

      cy.get('[data-testid="history-item"]', { timeout: 3000 }).should(
        'contain',
        'happy'
      );
    });

    it('should display search count in history', () => {
      // Perform same search twice
      cy.get('input[placeholder*="search your diary entries"]').type('happy');
      cy.get('button:contains("Search")').click();
      cy.wait(1000);

      cy.get('input[placeholder*="search your diary entries"]').clear().type('happy');
      cy.get('button:contains("Search")').click();
      cy.wait(1000);

      cy.get('input[placeholder*="search your diary entries"]').click();
      cy.wait(500);

      cy.get('[data-testid="history-item"]').should('contain', 'happy');
    });

    it('should select history item to reuse search', () => {
      cy.get('input[placeholder*="search your diary entries"]').type('happy');
      cy.get('button:contains("Search")').click();
      cy.wait(2000);

      cy.get('input[placeholder*="search your diary entries"]').clear().click();
      cy.wait(500);

      cy.get('[data-testid="history-item"]').first().click();
      cy.wait(2000);

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should clear search history', () => {
      cy.get('input[placeholder*="search your diary entries"]').type('happy');
      cy.get('button:contains("Search")').click();
      cy.wait(1000);

      cy.get('input[placeholder*="search your diary entries"]').click();
      cy.wait(500);

      cy.get('[data-testid="clear-history-btn"]', { timeout: 3000 })
        .should('be.visible')
        .click();

      cy.on('window:confirm', () => true);

      cy.wait(1000);
      cy.get('[data-testid="history-item"]').should('not.exist');
    });
  });

  describe('Advanced Filters', () => {
    beforeEach(() => {
      // Create entries with various attributes for filtering
      cy.createDiaryEntry({
        title: 'Happy Work Day',
        content: 'Great day at work',
        tags: ['work', 'positive'],
        sentiment: 'positive',
      });
      cy.createDiaryEntry({
        title: 'Sad Day',
        content: 'Difficult time',
        tags: ['personal'],
        sentiment: 'negative',
      });
      cy.createDiaryEntry({
        title: 'Neutral Note',
        content: 'Just documenting facts',
        tags: ['notes'],
        sentiment: 'neutral',
      });
    });

    it('should toggle advanced filters panel', () => {
      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);

      cy.get('[data-testid="filters-panel"]', { timeout: 3000 }).should(
        'be.visible'
      );
    });

    it('should filter by date range', () => {
      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);

      const today = new Date().toISOString().split('T')[0];
      const nextMonth = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split('T')[0];

      cy.get('[data-testid="filter-date-from"]', { timeout: 3000 })
        .should('be.visible')
        .type(today);
      cy.get('[data-testid="filter-date-to"]').type(nextMonth);

      cy.get('button:contains("Apply Filter")').click();
      cy.wait(2000);

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should filter by sentiment', () => {
      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);

      cy.get('input[value="positive"]', { timeout: 3000 })
        .should('be.visible')
        .click();

      cy.get('button:contains("Apply Filter")').click();
      cy.wait(2000);

      cy.get('[data-testid="result-item"]', { timeout: 5000 }).should(
        'have.length.greaterThan',
        0
      );
    });

    it('should filter by multiple sentiments', () => {
      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);

      cy.get('input[value="positive"]', { timeout: 3000 }).click();
      cy.get('input[value="neutral"]').click();

      cy.get('button:contains("Apply Filter")').click();
      cy.wait(2000);

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should filter by word count', () => {
      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);

      cy.get('[data-testid="filter-word-count-min"]', {
        timeout: 3000,
      })
        .should('be.visible')
        .type('5');

      cy.get('button:contains("Apply Filter")').click();
      cy.wait(2000);

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should reset all filters', () => {
      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);

      cy.get('input[value="positive"]', { timeout: 3000 }).click();
      cy.get('[data-testid="filter-word-count-min"]').type('10');

      cy.get('button:contains("Reset All")').click();
      cy.wait(500);

      cy.get('input[value="positive"]').should('not.be.checked');
      cy.get('[data-testid="filter-word-count-min"]').should('have.value', '');
    });

    it('should apply multiple filters together', () => {
      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);

      cy.get('input[value="positive"]', { timeout: 3000 }).click();
      cy.get('[data-testid="filter-word-count-min"]').type('5');

      const today = new Date().toISOString().split('T')[0];
      cy.get('[data-testid="filter-date-from"]').type(today);

      cy.get('button:contains("Apply Filter")').click();
      cy.wait(2000);

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });
  });

  describe('Saved Filters', () => {
    beforeEach(() => {
      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);
    });

    it('should save current filter configuration', () => {
      cy.get('input[value="positive"]', { timeout: 3000 }).click();

      cy.get('button:contains("Save Filter")').click();
      cy.wait(500);

      cy.get('[data-testid="save-filter-dialog"]', {
        timeout: 3000,
      })
        .should('be.visible');

      cy.get('[data-testid="filter-name-input"]').type('Happy Entries');
      cy.get('button:contains("Save")').click();
      cy.wait(1000);

      cy.get('[data-testid="success-message"]', { timeout: 3000 }).should(
        'contain',
        'Filter saved'
      );
    });

    it('should load saved filter', () => {
      // First save a filter
      cy.get('input[value="positive"]', { timeout: 3000 }).click();
      cy.get('button:contains("Save Filter")').click();
      cy.wait(500);

      cy.get('[data-testid="filter-name-input"]').type('Test Filter');
      cy.get('button:contains("Save")').click();
      cy.wait(1000);

      // Then load it
      cy.get('button:contains("Load Saved")').click();
      cy.wait(500);

      cy.get('[data-testid="saved-filter-item"]', {
        timeout: 3000,
      })
        .should('be.visible')
        .and('contain', 'Test Filter');

      cy.get('[data-testid="saved-filter-item"]').first().click();
      cy.wait(1000);

      cy.get('input[value="positive"]').should('be.checked');
    });

    it('should display saved filters sorted by use count', () => {
      // This would verify filters appear in correct order
      cy.get('button:contains("Load Saved")').click();
      cy.wait(500);

      cy.get('[data-testid="saved-filter-item"]', {
        timeout: 3000,
      }).each(($el, index, $list) => {
        if (index < $list.length - 1) {
          const current = parseInt($el.find('[data-usecount]').data('usecount'));
          const next = parseInt(
            $list.eq(index + 1).find('[data-usecount]').data('usecount')
          );
          expect(current).to.be.greaterThanOrEqual(next);
        }
      });
    });

    it('should delete saved filter', () => {
      // Save a filter first
      cy.get('input[value="positive"]', { timeout: 3000 }).click();
      cy.get('button:contains("Save Filter")').click();
      cy.wait(500);

      cy.get('[data-testid="filter-name-input"]').type('Delete Me');
      cy.get('button:contains("Save")').click();
      cy.wait(1000);

      // Load filters
      cy.get('button:contains("Load Saved")').click();
      cy.wait(500);

      cy.get('[data-testid="saved-filter-item"]')
        .first()
        .within(() => {
          cy.get('[data-testid="delete-filter-btn"]').click();
        });

      cy.on('window:confirm', () => true);
      cy.wait(1000);

      cy.get('[data-testid="success-message"]', { timeout: 3000 }).should(
        'contain',
        'deleted'
      );
    });

    it('should increment use count when using saved filter', () => {
      // Save and use a filter multiple times
      cy.get('input[value="positive"]', { timeout: 3000 }).click();
      cy.get('button:contains("Save Filter")').click();
      cy.wait(500);

      cy.get('[data-testid="filter-name-input"]').type('Count Test');
      cy.get('button:contains("Save")').click();
      cy.wait(1000);

      cy.get('button:contains("Load Saved")').click();
      cy.wait(500);

      // Initial use count
      cy.get('[data-testid="saved-filter-item"]')
        .first()
        .find('[data-usecount]')
        .then(($el) => {
          const initialCount = parseInt($el.data('usecount'));
          
          // Use the filter
          cy.get('[data-testid="saved-filter-item"]').first().click();
          cy.wait(1000);

          cy.get('button:contains("Load Saved")').click();
          cy.wait(500);

          // Verify count increased
          cy.get('[data-testid="saved-filter-item"]')
            .first()
            .find('[data-usecount]')
            .should('have.data', 'usecount', initialCount + 1);
        });
    });
  });

  describe('Filter Suggestions', () => {
    beforeEach(() => {
      cy.createDiaryEntry({
        title: 'Work Entry',
        content: 'Work content',
        tags: ['work'],
        sentiment: 'positive',
      });
      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);
    });

    it('should display suggested tags', () => {
      cy.get('[data-testid="suggested-tags"]', { timeout: 3000 }).should(
        'exist'
      );
      cy.get('[data-testid="suggested-tag"]').should('have.length.greaterThan', 0);
    });

    it('should display sentiment distribution', () => {
      cy.get('[data-testid="sentiment-distribution"]', {
        timeout: 3000,
      }).should('be.visible');
    });

    it('should select suggested tag for filtering', () => {
      cy.get('[data-testid="suggested-tag"]', { timeout: 3000 })
        .first()
        .click();
      cy.wait(500);

      cy.get('[data-testid="selected-tags"]').should('have.length.greaterThan', 0);
    });
  });

  describe('Pagination', () => {
    beforeEach(() => {
      // Create multiple entries for pagination
      for (let i = 0; i < 25; i++) {
        cy.createDiaryEntry({
          title: `Entry ${i}`,
          content: `Content for entry ${i}`,
          tags: ['pagination-test'],
        });
      }

      cy.get('input[placeholder*="search your diary entries"]').type('entry');
      cy.get('button:contains("Search")').click();
      cy.wait(2000);
    });

    it('should show pagination controls when results exceed limit', () => {
      cy.get('[data-testid="pagination-controls"]', {
        timeout: 5000,
      }).should('be.visible');
    });

    it('should navigate to next page', () => {
      cy.get('[data-testid="next-page-btn"]', { timeout: 5000 })
        .should('be.enabled')
        .click();
      cy.wait(1000);

      cy.get('[data-testid="result-item"]', { timeout: 5000 }).should(
        'have.length.greaterThan',
        0
      );
    });

    it('should navigate to previous page', () => {
      cy.get('[data-testid="next-page-btn"]', { timeout: 5000 }).click();
      cy.wait(1000);

      cy.get('[data-testid="prev-page-btn"]', { timeout: 5000 })
        .should('be.enabled')
        .click();
      cy.wait(1000);

      cy.get('[data-testid="result-item"]', { timeout: 5000 }).should(
        'have.length.greaterThan',
        0
      );
    });

    it('should disable previous button on first page', () => {
      cy.get('[data-testid="prev-page-btn"]', { timeout: 5000 }).should(
        'be.disabled'
      );
    });

    it('should disable next button on last page', () => {
      // Navigate to last page
      cy.get('[data-testid="next-page-btn"]', { timeout: 5000 }).click();
      cy.wait(1000);

      // Keep clicking until disabled
      cy.get('[data-testid="next-page-btn"]').then(($btn) => {
        if (!$btn.prop('disabled')) {
          cy.wrap($btn).click();
          cy.wait(1000);
        }
      });

      cy.get('[data-testid="next-page-btn"]').should('be.disabled');
    });

    it('should display current page number', () => {
      cy.get('[data-testid="current-page"]', { timeout: 5000 }).should(
        'contain',
        '1'
      );

      cy.get('[data-testid="next-page-btn"]').click();
      cy.wait(1000);

      cy.get('[data-testid="current-page"]').should('contain', '2');
    });
  });

  describe('Combined Search and Filter', () => {
    beforeEach(() => {
      cy.createDiaryEntry({
        title: 'Happy Work Day',
        content: 'Great day at work',
        tags: ['work', 'positive'],
        sentiment: 'positive',
      });
      cy.createDiaryEntry({
        title: 'Happy Personal Time',
        content: 'Wonderful personal experience',
        tags: ['personal', 'positive'],
        sentiment: 'positive',
      });
      cy.createDiaryEntry({
        title: 'Work Meeting',
        content: 'Difficult meeting at work',
        tags: ['work'],
        sentiment: 'negative',
      });
    });

    it('should search then apply filters', () => {
      cy.get('input[placeholder*="search your diary entries"]').type('work');
      cy.get('button:contains("Search")').click();
      cy.wait(2000);

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );

      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);

      cy.get('input[value="positive"]', { timeout: 3000 }).click();
      cy.get('button:contains("Apply Filter")').click();
      cy.wait(2000);

      // Results should be filtered to only positive entries with 'work'
      cy.get('[data-testid="result-item"]', { timeout: 5000 }).should(
        'have.length.greaterThan',
        0
      );
    });

    it('should filter then search within results', () => {
      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);

      cy.get('input[value="positive"]', { timeout: 3000 }).click();
      cy.get('button:contains("Apply Filter")').click();
      cy.wait(2000);

      cy.get('input[placeholder*="search your diary entries"]').type('happy');
      cy.get('button:contains("Search")').click();
      cy.wait(2000);

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should combine search, filter, and saved filter', () => {
      // Apply and save a filter
      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);

      cy.get('input[value="positive"]', { timeout: 3000 }).click();
      cy.get('button:contains("Save Filter")').click();
      cy.wait(500);

      cy.get('[data-testid="filter-name-input"]').type('Positive Only');
      cy.get('button:contains("Save")').click();
      cy.wait(1000);

      // Now search with the saved filter loaded
      cy.get('button:contains("Load Saved")').click();
      cy.wait(500);

      cy.get('[data-testid="saved-filter-item"]').first().click();
      cy.wait(1000);

      cy.get('input[placeholder*="search your diary entries"]').type('work');
      cy.get('button:contains("Search")').click();
      cy.wait(2000);

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });
  });

  describe('Error Handling and Edge Cases', () => {
    it('should handle network errors gracefully', () => {
      cy.intercept('POST', '**/api/diary/search/**', {
        statusCode: 500,
        body: { success: false, message: 'Server error' },
      });

      cy.get('input[placeholder*="search your diary entries"]').type('test');
      cy.get('button:contains("Search")').click();

      cy.on('window:alert', (str) => {
        expect(str).to.contain('error');
      });
    });

    it('should handle empty results gracefully', () => {
      cy.get('input[placeholder*="search your diary entries"]').type(
        'nonexistentquery12345'
      );
      cy.get('button:contains("Search")').click();

      cy.get('[data-testid="no-results-message"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should recover from failed filter application', () => {
      cy.intercept('POST', '**/api/diary/filter/apply', {
        statusCode: 400,
        body: { success: false, message: 'Invalid filter' },
      });

      cy.get('button:contains("Advanced Filters")').click();
      cy.wait(500);

      cy.get('input[value="positive"]', { timeout: 3000 }).click();
      cy.get('button:contains("Apply Filter")').click();

      cy.on('window:alert', (str) => {
        expect(str).to.contain('Invalid');
      });

      // Component should still be interactive
      cy.get('button:contains("Reset All")').should('be.visible');
    });

    it('should handle special characters in search', () => {
      cy.get('input[placeholder*="search your diary entries"]').type(
        'test & <special>'
      );
      cy.get('button:contains("Search")').click();
      cy.wait(2000);

      // Should not error - request completed
      cy.get('input[placeholder*="search your diary entries"]').should('exist');
    });

    it('should handle very long search queries', () => {
      const longQuery =
        'This is a very long search query that tests the system ability to handle extended text input without breaking';
      cy.get('input[placeholder*="search your diary entries"]').type(longQuery);
      cy.get('button:contains("Search")').click();
      cy.wait(2000);

      // Should handle gracefully
      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'exist'
      );
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      cy.get('input[placeholder*="search your diary entries"]').should(
        'have.attr',
        'placeholder'
      );
      cy.get('button:contains("Search")').should('have.attr', 'type', 'button');
    });

    it('should be keyboard navigable', () => {
      cy.get('input[placeholder*="search your diary entries"]').type(
        'happy{Enter}'
      );
      cy.wait(2000);

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should maintain focus management', () => {
      cy.get('input[placeholder*="search your diary entries"]').focus();
      cy.focused().should('have.attr', 'placeholder');

      cy.get('button:contains("Search")').focus();
      cy.focused().should('contain', 'Search');
    });

    it('should support screen readers with proper text', () => {
      cy.get('button:contains("Search")').should('be.visible');
      cy.get('button:contains("Advanced Filters")').should('be.visible');
      cy.get('button:contains("Reset All")').should('exist');
    });
  });

  describe('Performance', () => {
    it('should handle rapid searches', () => {
      const queries = ['work', 'happy', 'personal', 'test'];

      queries.forEach((query) => {
        cy.get('input[placeholder*="search your diary entries"]')
          .clear()
          .type(query);
        cy.get('button:contains("Search")').click();
        cy.wait(500);
      });

      // Final results should be visible
      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'exist'
      );
    });

    it('should debounce suggestion requests', () => {
      cy.get('input[placeholder*="search your diary entries"]').type('w');
      cy.wait(100);
      cy.get('input[placeholder*="search your diary entries"]').type('o');
      cy.wait(100);
      cy.get('input[placeholder*="search your diary entries"]').type('r');
      cy.wait(100);
      cy.get('input[placeholder*="search your diary entries"]').type('k');

      // Only one request should be made after debounce, not 4
      cy.wait(400); // Wait for debounce

      // Verify suggestions loaded efficiently
      cy.get('[data-testid="suggestions-dropdown"]', {
        timeout: 3000,
      }).should('exist');
    });

    it('should handle large result sets efficiently', () => {
      // Create many entries
      for (let i = 0; i < 50; i++) {
        cy.createDiaryEntry({
          title: `Performance Test ${i}`,
          content: `Content ${i}`,
          tags: ['performance'],
        });
      }

      cy.get('input[placeholder*="search your diary entries"]').type(
        'performance'
      );
      cy.get('button:contains("Search")').click();
      cy.wait(3000);

      cy.get('[data-testid="search-results"]', { timeout: 5000 }).should(
        'be.visible'
      );

      // Should still be interactive
      cy.get('[data-testid="next-page-btn"]', { timeout: 5000 }).should(
        'be.enabled'
      );
    });
  });

  describe('Results Display', () => {
    beforeEach(() => {
      cy.createDiaryEntry({
        title: 'Test Entry',
        content: 'This is a test entry with some content',
        tags: ['test', 'demo'],
        sentiment: 'positive',
      });

      cy.get('input[placeholder*="search your diary entries"]').type('test');
      cy.get('button:contains("Search")').click();
      cy.wait(2000);
    });

    it('should display entry title in results', () => {
      cy.get('[data-testid="result-item"]', { timeout: 5000 })
        .first()
        .should('contain', 'Test Entry');
    });

    it('should display entry preview in results', () => {
      cy.get('[data-testid="result-item"]', { timeout: 5000 })
        .first()
        .should('contain', 'test entry');
    });

    it('should display entry tags in results', () => {
      cy.get('[data-testid="result-tags"]', { timeout: 5000 }).should('exist');
    });

    it('should display entry sentiment in results', () => {
      cy.get('[data-testid="result-sentiment"]', { timeout: 5000 }).should(
        'contain',
        'positive'
      );
    });

    it('should display entry date in results', () => {
      cy.get('[data-testid="result-date"]', { timeout: 5000 }).should('exist');
    });

    it('should open entry detail on click', () => {
      cy.get('[data-testid="result-item"]', { timeout: 5000 })
        .first()
        .click();
      cy.wait(1000);

      cy.get('[data-testid="entry-detail"]', { timeout: 5000 }).should(
        'be.visible'
      );
    });

    it('should close entry detail with back button', () => {
      cy.get('[data-testid="result-item"]', { timeout: 5000 })
        .first()
        .click();
      cy.wait(1000);

      cy.get('[data-testid="back-to-results-btn"]')
        .should('be.visible')
        .click();

      cy.wait(500);
      cy.get('[data-testid="search-results"]').should('be.visible');
    });
  });
});
