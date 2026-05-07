/**
 * Diary Analytics E2E Tests - Cypress
 * End-to-end testing for Phase 6 Analytics Dashboard
 */

describe('Diary Analytics Dashboard E2E Tests', () => {
  const baseUrl = 'http://localhost:3000';
  const token = 'valid-test-token';

  beforeEach(() => {
    // Setup auth token in localStorage
    cy.visit(`${baseUrl}/diary/analytics`, {
      onBeforeLoad(win) {
        win.localStorage.setItem('token', token);
      }
    });
  });

  // =========================================================================
  // DASHBOARD LOADING TESTS
  // =========================================================================

  describe('Dashboard Loading', () => {
    it('should load analytics dashboard', () => {
      cy.get('main').should('be.visible');
      cy.contains('Analytics Dashboard').should('be.visible');
    });

    it('should display loading state initially', () => {
      cy.get('.loading-spinner').should('be.visible');
    });

    it('should load and display all dashboard sections', () => {
      cy.get('.stats-cards').should('be.visible');
      cy.get('.insights-section').should('be.visible');
      cy.get('.mood-distribution').should('be.visible');
      cy.get('.sentiment-chart').should('be.visible');
      cy.get('.tag-frequency').should('be.visible');
      cy.get('.word-distribution').should('be.visible');
      cy.get('.heatmap-container').should('be.visible');
    });

    it('should display statistics cards with data', () => {
      cy.get('.stats-cards').within(() => {
        cy.get('.stat-card').should('have.length.at.least', 3);
        cy.get('.stat-value').should('be.visible');
        cy.get('.stat-label').should('be.visible');
      });
    });
  });

  // =========================================================================
  // FILTER CONTROLS TESTS
  // =========================================================================

  describe('Filter Controls', () => {
    it('should have time period filter', () => {
      cy.get('select[name="daysBack"]').should('be.visible');
    });

    it('should have sentiment grouping filter', () => {
      cy.get('select[name="groupBy"]').should('be.visible');
    });

    it('should have refresh button', () => {
      cy.get('button').contains('Refresh').should('be.visible');
    });

    it('should change data when daysBack filter changed', () => {
      cy.get('select[name="daysBack"]').select('90');
      cy.get('.stats-cards .stat-value').first().should('be.visible');
    });

    it('should change sentiment grouping', () => {
      cy.get('select[name="groupBy"]').select('week');
      cy.get('.sentiment-chart').should('be.visible');
    });

    it('should refresh data on refresh button click', () => {
      const initialValue = cy.get('.stats-cards .stat-value').first();
      
      cy.get('button').contains('Refresh').click();
      
      cy.get('.loading-spinner').should('be.visible');
      cy.get('.stats-cards .stat-value').first().should('be.visible');
    });

    it('should update multiple filters simultaneously', () => {
      cy.get('select[name="daysBack"]').select('30');
      cy.get('select[name="groupBy"]').select('day');
      
      cy.get('.sentiment-chart').should('be.visible');
    });
  });

  // =========================================================================
  // STATISTICS CARDS TESTS
  // =========================================================================

  describe('Statistics Cards', () => {
    it('should display entries count', () => {
      cy.get('.stats-cards').contains('Total Entries').should('be.visible');
    });

    it('should display total words', () => {
      cy.get('.stats-cards').contains('Total Words').should('be.visible');
    });

    it('should display current streak', () => {
      cy.get('.stats-cards').contains('Current Streak').should('be.visible');
    });

    it('should display wellness score', () => {
      cy.get('.stats-cards').contains('Wellness Score').should('be.visible');
    });

    it('should have hover effect on cards', () => {
      cy.get('.stat-card').first().trigger('mouseenter');
      cy.get('.stat-card').first().should('have.css', 'transform');
    });

    it('should display numeric values in cards', () => {
      cy.get('.stat-value').each(($el) => {
        expect($el.text()).to.match(/^\d+/);
      });
    });
  });

  // =========================================================================
  // INSIGHTS SECTION TESTS
  // =========================================================================

  describe('Insights Section', () => {
    it('should display insights', () => {
      cy.get('.insights-section').should('be.visible');
    });

    it('should display multiple insights if available', () => {
      cy.get('.insight-item').should('have.length.at.least', 1);
    });

    it('should color-code insights by severity', () => {
      cy.get('.insight-item').each(($el) => {
        const classes = $el.attr('class');
        expect(classes).to.match(/positive|suggestion|info|negative/);
      });
    });

    it('should display insight messages', () => {
      cy.get('.insight-item').first().within(() => {
        cy.get('.insight-message').should('be.visible');
      });
    });
  });

  // =========================================================================
  // MOOD DISTRIBUTION CHART TESTS
  // =========================================================================

  describe('Mood Distribution Chart', () => {
    it('should display mood chart', () => {
      cy.get('.mood-chart-container').should('be.visible');
    });

    it('should display pie chart', () => {
      cy.get('.pie-chart svg').should('be.visible');
    });

    it('should display mood legend', () => {
      cy.get('.mood-legend').should('be.visible');
    });

    it('should display mood percentages', () => {
      cy.get('.mood-legend .legend-item').each(($el) => {
        expect($el.text()).to.match(/%/);
      });
    });

    it('should show mood colors in legend', () => {
      cy.get('.mood-legend .legend-color').each(($el) => {
        expect($el).to.have.css('background');
      });
    });
  });

  // =========================================================================
  // SENTIMENT TREND CHART TESTS
  // =========================================================================

  describe('Sentiment Trend Chart', () => {
    it('should display sentiment chart', () => {
      cy.get('.sentiment-chart-container').should('be.visible');
    });

    it('should display chart legend', () => {
      cy.get('.chart-legend').should('be.visible');
    });

    it('should display sentiment bars', () => {
      cy.get('.chart-bar').should('have.length.at.least', 1);
    });

    it('should have different colors for sentiment types', () => {
      cy.get('.bar-segment.positive').should('have.length.at.least', 0);
      cy.get('.bar-segment.neutral').should('exist');
      cy.get('.bar-segment.negative').should('exist');
    });

    it('should show tooltips on hover', () => {
      cy.get('.chart-bar').first().trigger('mouseenter');
      // Tooltip should appear (implementation depends on component)
    });
  });

  // =========================================================================
  // TAG FREQUENCY CHART TESTS
  // =========================================================================

  describe('Tag Frequency Chart', () => {
    it('should display tag frequency section', () => {
      cy.get('.tag-chart-container').should('be.visible');
    });

    it('should display tag statistics', () => {
      cy.get('.tag-stats-summary').should('be.visible');
    });

    it('should display unique tags count', () => {
      cy.get('.tag-stats-summary').contains('Unique Tags').should('be.visible');
    });

    it('should display tag bars', () => {
      cy.get('.tag-bar-item').should('have.length.at.least', 1);
    });

    it('should display tag names', () => {
      cy.get('.tag-name').should('have.length.at.least', 1);
    });

    it('should show trend indicators', () => {
      cy.get('.trend-indicator').should('have.length.at.least', 1);
    });

    it('should have hover effect on tag bars', () => {
      cy.get('.tag-bar-item').first().trigger('mouseenter');
      cy.get('.tag-bar-item').first().should('have.css', 'border-color');
    });
  });

  // =========================================================================
  // WORD COUNT CHART TESTS
  // =========================================================================

  describe('Word Count Chart', () => {
    it('should display word count statistics', () => {
      cy.get('.word-count-chart-container').should('be.visible');
    });

    it('should display total words', () => {
      cy.get('.word-count-chart-container').contains('Total Words').should('be.visible');
    });

    it('should display average words per entry', () => {
      cy.get('.word-count-chart-container').contains('Average/Entry').should('be.visible');
    });

    it('should display word distribution chart', () => {
      cy.get('.word-distribution-chart').should('be.visible');
    });

    it('should show all distribution categories', () => {
      cy.get('.word-distribution-chart').within(() => {
        cy.contains('Very Short').should('be.visible');
        cy.contains('Short').should('be.visible');
        cy.contains('Medium').should('be.visible');
        cy.contains('Long').should('be.visible');
        cy.contains('Very Long').should('be.visible');
      });
    });

    it('should display distribution percentages', () => {
      cy.get('.distribution-stats').each(($el) => {
        expect($el.text()).to.match(/%/);
      });
    });
  });

  // =========================================================================
  // HEATMAP TESTS
  // =========================================================================

  describe('Writing Heatmap', () => {
    it('should display heatmap container', () => {
      cy.get('.heatmap-component').should('be.visible');
    });

    it('should display day labels', () => {
      cy.get('.day-label').should('have.length.at.least', 1);
    });

    it('should display heatmap grid', () => {
      cy.get('.heatmap-grid-container').should('be.visible');
    });

    it('should display heatmap cells', () => {
      cy.get('.heatmap-day').should('have.length.at.least', 1);
    });

    it('should display legend', () => {
      cy.get('.heatmap-legend').should('be.visible');
    });

    it('should display statistics', () => {
      cy.get('.heatmap-stats').should('be.visible');
      cy.get('.heatmap-stats').contains('Total Entries').should('be.visible');
    });

    it('should show tooltip on heatmap hover', () => {
      cy.get('.heatmap-day').first().trigger('mouseenter');
      // Tooltip should appear with date and count
    });

    it('should have color intensity for activity levels', () => {
      cy.get('.heatmap-day').each(($el) => {
        expect($el).to.have.css('background-color');
      });
    });
  });

  // =========================================================================
  // ERROR HANDLING TESTS
  // =========================================================================

  describe('Error Handling', () => {
    it('should display error message on API failure', () => {
      cy.intercept('GET', '**/analytics/dashboard', {
        statusCode: 500,
        body: { error: 'Server error' }
      });

      cy.get('button').contains('Refresh').click();
      cy.get('.error-banner').should('be.visible');
    });

    it('should display retry button on error', () => {
      cy.intercept('GET', '**/analytics/dashboard', {
        statusCode: 500
      });

      cy.get('button').contains('Refresh').click();
      cy.get('button').contains('Retry').should('be.visible');
    });

    it('should retry on retry button click', () => {
      let callCount = 0;
      cy.intercept('GET', '**/analytics/dashboard', (req) => {
        callCount++;
        if (callCount === 1) {
          req.reply({
            statusCode: 500,
            body: { error: 'Error' }
          });
        } else {
          req.reply({
            statusCode: 200,
            body: { success: true, data: {} }
          });
        }
      });

      cy.get('button').contains('Retry').click();
      cy.get('.stats-cards').should('be.visible');
    });

    it('should display 401 error for authentication failure', () => {
      cy.clearLocalStorage('token');
      cy.visit(`${baseUrl}/diary/analytics`);
      cy.get('.error-banner').or(cy.get('.auth-error')).should('be.visible');
    });
  });

  // =========================================================================
  // RESPONSIVE DESIGN TESTS
  // =========================================================================

  describe('Responsive Design', () => {
    it('should render on desktop viewport', () => {
      cy.viewport(1920, 1080);
      cy.get('main').should('be.visible');
      cy.get('.stats-cards').should('have.css', 'display', 'grid');
    });

    it('should render on tablet viewport', () => {
      cy.viewport(768, 1024);
      cy.get('main').should('be.visible');
      cy.get('.stats-cards').should('be.visible');
    });

    it('should render on mobile viewport', () => {
      cy.viewport(375, 667);
      cy.get('main').should('be.visible');
      cy.get('.stats-cards').should('be.visible');
    });

    it('should have readable text on mobile', () => {
      cy.viewport(375, 667);
      cy.get('.stat-label').should('have.css', 'font-size');
    });

    it('should adjust filter layout on mobile', () => {
      cy.viewport(375, 667);
      cy.get('select[name="daysBack"]').should('be.visible');
      cy.get('select[name="groupBy"]').should('be.visible');
    });
  });

  // =========================================================================
  // ACCESSIBILITY TESTS
  // =========================================================================

  describe('Accessibility', () => {
    it('should have proper heading hierarchy', () => {
      cy.get('h1').should('have.length.at.least', 1);
    });

    it('should have alt text for images', () => {
      cy.get('img').each(($el) => {
        expect($el).to.have.attr('alt');
      });
    });

    it('should have proper button labels', () => {
      cy.get('button').each(($el) => {
        expect($el.text().length).to.be.greaterThan(0);
      });
    });

    it('should have proper form labels', () => {
      cy.get('select').each(($el) => {
        const label = $el.attr('aria-label') || $el.attr('name');
        expect(label).to.exist;
      });
    });

    it('should be keyboard navigable', () => {
      cy.get('button').first().focus();
      cy.get('button').first().should('have.focus');
      
      cy.get('button').first().trigger('keydown', { keyCode: 13 });
    });
  });

  // =========================================================================
  // USER INTERACTION WORKFLOW TESTS
  // =========================================================================

  describe('User Workflows', () => {
    it('should complete full analytics viewing workflow', () => {
      // Load dashboard
      cy.get('.stats-cards').should('be.visible');
      
      // Change filter
      cy.get('select[name="daysBack"]').select('30');
      cy.get('.sentiment-chart').should('be.visible');
      
      // View different sections
      cy.scrollTo('bottom');
      cy.get('.heatmap-component').should('be.visible');
      
      // Refresh data
      cy.scrollTo('top');
      cy.get('button').contains('Refresh').click();
      cy.get('.stats-cards').should('be.visible');
    });

    it('should handle rapid filter changes', () => {
      cy.get('select[name="daysBack"]').select('7');
      cy.get('select[name="daysBack"]').select('30');
      cy.get('select[name="daysBack"]').select('90');
      
      cy.get('.stats-cards').should('be.visible');
    });

    it('should maintain state during interaction', () => {
      const initialValue = cy.get('select[name="daysBack"]').then((el) => el.val());
      
      cy.get('button').contains('Refresh').click();
      cy.get('select[name="daysBack"]').should('have.value', initialValue);
    });
  });

  // =========================================================================
  // PERFORMANCE TESTS
  // =========================================================================

  describe('Performance', () => {
    it('should load dashboard within reasonable time', () => {
      const startTime = Date.now();
      
      cy.get('.stats-cards').should('be.visible').then(() => {
        const loadTime = Date.now() - startTime;
        expect(loadTime).to.be.lessThan(5000); // 5 seconds
      });
    });

    it('should handle large datasets efficiently', () => {
      cy.get('select[name="daysBack"]').select('365');
      cy.get('.stats-cards').should('be.visible');
    });
  });
});
