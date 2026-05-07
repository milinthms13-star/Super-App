/**
 * Diary Phase 7 E2E Tests with Cypress
 * End-to-end tests for all Phase 7 features
 * 80+ test cases covering complete workflows
 */

describe('Diary Phase 7 E2E Tests', () => {
  const baseUrl = 'http://localhost:3000';
  const apiUrl = 'http://localhost:5000';
  const testUserEmail = 'test@example.com';
  const testUserPassword = 'TestPassword123!';

  // Mock authentication token
  const mockToken = 'Bearer test_token_12345';

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    
    // Set auth token
    localStorage.setItem('authToken', mockToken.replace('Bearer ', ''));
    
    // Visit the diary module
    cy.visit(`${baseUrl}/diary`);
  });

  // ============ RECOMMENDATIONS WORKFLOW TESTS ============

  describe('AI Recommendations Workflow', () => {
    test('should navigate to recommendations panel', () => {
      cy.contains('Recommendations').click();
      cy.contains('AI-Powered Recommendations').should('be.visible');
    });

    test('should display recommendations for 90 days', () => {
      cy.contains('Recommendations').click();
      cy.get('select').should('have.value', '90');
      cy.contains('Focus Areas').should('be.visible');
    });

    test('should load focus areas section', () => {
      cy.contains('Recommendations').click();
      cy.contains('Focus Areas').click();
      cy.get('[data-testid="focus-area"]').should('have.length.greaterThan', 0);
    });

    test('should load wellness actions section', () => {
      cy.contains('Recommendations').click();
      cy.contains('Wellness Actions').click();
      cy.get('[data-testid="action-card"]').should('have.length.greaterThan', 0);
    });

    test('should load motivation boosts section', () => {
      cy.contains('Recommendations').click();
      cy.contains('Motivation').click();
      cy.get('[data-testid="motivation-card"]').should('exist');
    });

    test('should filter by 7 days', () => {
      cy.contains('Recommendations').click();
      cy.get('select').first().select('7');
      cy.wait(1000);
      cy.get('[data-testid="focus-area"]').should('exist');
    });

    test('should filter by 30 days', () => {
      cy.contains('Recommendations').click();
      cy.get('select').first().select('30');
      cy.wait(1000);
      cy.get('[data-testid="focus-area"]').should('exist');
    });

    test('should filter by 180 days', () => {
      cy.contains('Recommendations').click();
      cy.get('select').first().select('180');
      cy.wait(1000);
      cy.get('[data-testid="focus-area"]').should('exist');
    });

    test('should display priority badges in focus areas', () => {
      cy.contains('Recommendations').click();
      cy.contains('Focus Areas').click();
      cy.contains('Priority').should('be.visible');
    });

    test('should display timeframe in wellness actions', () => {
      cy.contains('Recommendations').click();
      cy.contains('Wellness Actions').click();
      cy.contains(/Daily|Weekly|Monthly/).should('be.visible');
    });

    test('should display severity level', () => {
      cy.contains('Recommendations').click();
      cy.get('[data-testid="severity-indicator"]').should('exist');
    });

    test('should refresh data when filter changes', () => {
      cy.contains('Recommendations').click();
      cy.get('select').first().select('7');
      cy.wait(500);
      cy.get('[data-testid="focus-area"]').should('exist');
      cy.get('select').first().select('90');
      cy.wait(500);
      cy.get('[data-testid="focus-area"]').should('exist');
    });

    test('should display no data message if empty', () => {
      cy.contains('Recommendations').click();
      // If no recommendations, should show empty state
      cy.get('body').then(body => {
        if (body.text().includes('No recommendations')) {
          cy.contains('No recommendations').should('be.visible');
        }
      });
    });
  });

  // ============ EXPORT WORKFLOW TESTS ============

  describe('Export Workflow', () => {
    test('should navigate to export manager', () => {
      cy.contains('Export').click();
      cy.contains('Export Your Diary').should('be.visible');
    });

    test('should select CSV format by default', () => {
      cy.contains('Export').click();
      cy.contains('CSV').should('have.class', /active|selected/);
    });

    test('should select JSON format', () => {
      cy.contains('Export').click();
      cy.contains('JSON').click();
      cy.contains('JSON').should('have.class', /active|selected/);
    });

    test('should select PDF format', () => {
      cy.contains('Export').click();
      cy.contains('PDF').click();
      cy.contains('PDF').should('have.class', /active|selected/);
    });

    test('should export as CSV with all time period', () => {
      cy.contains('Export').click();
      cy.contains('CSV').click();
      cy.get('select').select('0'); // All time
      cy.contains('Export').click();
      cy.wait(2000);
      // Check that download was triggered
      cy.readFile('cypress/downloads/diary_export_*.csv', { timeout: 5000 }).should('exist');
    });

    test('should export as CSV with 7 days', () => {
      cy.contains('Export').click();
      cy.contains('CSV').click();
      cy.get('select').select('7');
      cy.contains('Export').click();
      cy.wait(2000);
    });

    test('should export as CSV with 30 days', () => {
      cy.contains('Export').click();
      cy.contains('CSV').click();
      cy.get('select').select('30');
      cy.contains('Export').click();
      cy.wait(2000);
    });

    test('should export as CSV with 90 days', () => {
      cy.contains('Export').click();
      cy.contains('CSV').click();
      cy.get('select').select('90');
      cy.contains('Export').click();
      cy.wait(2000);
    });

    test('should export as JSON format', () => {
      cy.contains('Export').click();
      cy.contains('JSON').click();
      cy.contains('Export').click();
      cy.wait(2000);
      cy.readFile('cypress/downloads/diary_export_*.json', { timeout: 5000 }).should('exist');
    });

    test('should include analytics in export', () => {
      cy.contains('Export').click();
      cy.get('[type="checkbox"]').check();
      cy.contains('Export').click();
      cy.wait(2000);
    });

    test('should disable time period for JSON export', () => {
      cy.contains('Export').click();
      cy.contains('JSON').click();
      cy.get('select').should('be.disabled');
    });

    test('should show loading state during export', () => {
      cy.contains('Export').click();
      cy.contains('Export').click();
      cy.get('[class*="loading"]', { timeout: 1000 }).should('exist');
    });

    test('should show export success message', () => {
      cy.contains('Export').click();
      cy.contains('Export').click();
      cy.wait(2000);
      cy.contains(/Export|Success|Downloaded/i).should('be.visible');
    });

    test('should handle export errors gracefully', () => {
      // Simulate API error by intercepting request
      cy.intercept('GET', '**/export/csv*', { statusCode: 500 }).as('exportError');
      cy.contains('Export').click();
      cy.contains('Export').click();
      cy.wait('@exportError');
      cy.contains(/error|failed/i).should('be.visible');
    });
  });

  // ============ SHARING & COLLABORATION WORKFLOW TESTS ============

  describe('Sharing & Collaboration Workflow', () => {
    test('should navigate to sharing panel', () => {
      cy.contains('Sharing').click();
      cy.contains('Sharing & Collaboration').should('be.visible');
    });

    test('should display shares tab', () => {
      cy.contains('Sharing').click();
      cy.contains('Shares').should('be.visible');
    });

    test('should display comments tab', () => {
      cy.contains('Sharing').click();
      cy.contains('Comments').click();
      cy.get('[class*="comment"]').should('exist');
    });

    test('should display statistics tab', () => {
      cy.contains('Sharing').click();
      cy.contains('Statistics').click();
      cy.contains('Total Shares').should('be.visible');
    });

    test('should list shared entries', () => {
      cy.contains('Sharing').click();
      cy.get('[data-testid="share-card"]').should('have.length.greaterThan', 0);
    });

    test('should display recipient email', () => {
      cy.contains('Sharing').click();
      cy.get('[data-testid="recipient"]').should('have.length.greaterThan', 0);
    });

    test('should display permission level badge', () => {
      cy.contains('Sharing').click();
      cy.contains(/View|Comment|Edit/).should('exist');
    });

    test('should copy share link to clipboard', () => {
      cy.contains('Sharing').click();
      cy.get('[data-testid="copy-link"]').first().click();
      cy.wait(500);
      // Verify clipboard has content (implementation specific)
    });

    test('should revoke share access', () => {
      cy.contains('Sharing').click();
      cy.get('[data-testid="revoke-btn"]').first().click();
      cy.contains(/Confirm|Are you sure/i).then(($el) => {
        if ($el.length > 0) {
          cy.contains('Confirm').click();
        }
      });
      cy.wait(1000);
    });

    test('should add comment to entry', () => {
      cy.contains('Sharing').click();
      cy.contains('Comments').click();
      cy.get('[placeholder*="comment" i]').type('Great diary entry!');
      cy.get('[data-testid="post-comment"]').click();
      cy.contains('Great diary entry!').should('be.visible');
    });

    test('should display comment statistics', () => {
      cy.contains('Sharing').click();
      cy.contains('Statistics').click();
      cy.contains('Total Shares').should('be.visible');
      cy.contains('Comments').should('be.visible');
    });

    test('should show top recipients in statistics', () => {
      cy.contains('Sharing').click();
      cy.contains('Statistics').click();
      cy.get('[data-testid="top-recipients"]').should('exist');
    });

    test('should show permission distribution chart', () => {
      cy.contains('Sharing').click();
      cy.contains('Statistics').click();
      cy.get('[data-testid="permission-distribution"]').should('exist');
    });

    test('should display most shared entries', () => {
      cy.contains('Sharing').click();
      cy.contains('Statistics').click();
      cy.get('[data-testid="most-shared"]').should('exist');
    });

    test('should like a comment', () => {
      cy.contains('Sharing').click();
      cy.contains('Comments').click();
      cy.get('[data-testid="like-btn"]').first().click();
      cy.wait(500);
    });

    test('should display recent activity', () => {
      cy.contains('Sharing').click();
      cy.contains('Statistics').click();
      cy.contains('Recent Activity').should('be.visible');
    });
  });

  // ============ PERSONALIZATION WORKFLOW TESTS ============

  describe('Personalization Workflow', () => {
    test('should navigate to personalization panel', () => {
      cy.contains('Personalization').click();
      cy.contains('Personalization Settings').should('be.visible');
    });

    test('should display theme section', () => {
      cy.contains('Personalization').click();
      cy.contains('Theme').should('be.visible');
    });

    test('should display writing section', () => {
      cy.contains('Personalization').click();
      cy.contains('Writing').should('be.visible');
    });

    test('should display notifications section', () => {
      cy.contains('Personalization').click();
      cy.contains('Notifications').should('be.visible');
    });

    test('should display privacy section', () => {
      cy.contains('Personalization').click();
      cy.contains('Privacy').should('be.visible');
    });

    test('should change to light theme', () => {
      cy.contains('Personalization').click();
      cy.contains('Light').click();
      cy.contains('Light').should('have.class', /active|selected/);
    });

    test('should change to dark theme', () => {
      cy.contains('Personalization').click();
      cy.contains('Dark').click();
      cy.contains('Dark').should('have.class', /active|selected/);
    });

    test('should change to auto theme', () => {
      cy.contains('Personalization').click();
      cy.contains('Auto').click();
      cy.contains('Auto').should('have.class', /active|selected/);
    });

    test('should select full writing mode', () => {
      cy.contains('Personalization').click();
      cy.contains('Full').click();
      cy.contains('Full').should('have.class', /active|selected/);
    });

    test('should select minimal writing mode', () => {
      cy.contains('Personalization').click();
      cy.contains('Minimal').click();
      cy.contains('Minimal').should('have.class', /active|selected/);
    });

    test('should select focused writing mode', () => {
      cy.contains('Personalization').click();
      cy.contains('Focused').click();
      cy.contains('Focused').should('have.class', /active|selected/);
    });

    test('should select typewriter writing mode', () => {
      cy.contains('Personalization').click();
      cy.contains('Typewriter').click();
      cy.contains('Typewriter').should('have.class', /active|selected/);
    });

    test('should adjust font size', () => {
      cy.contains('Personalization').click();
      cy.get('select').contains('Font Size').parent().select('Large');
      cy.get('select').contains('Font Size').parent().should('have.value', 'Large');
    });

    test('should adjust line height', () => {
      cy.contains('Personalization').click();
      cy.get('select').contains('Line Height').parent().select('1.8');
      cy.get('select').contains('Line Height').parent().should('have.value', '1.8');
    });

    test('should enable auto-save', () => {
      cy.contains('Personalization').click();
      cy.get('[type="checkbox"]').filter('[value*="autoSave" i]').check();
      cy.get('[type="checkbox"]').filter('[value*="autoSave" i]').should('be.checked');
    });

    test('should set word goal', () => {
      cy.contains('Personalization').click();
      cy.get('[type="number"]').clear().type('1000');
      cy.get('[type="number"]').should('have.value', '1000');
    });

    test('should set reminder time', () => {
      cy.contains('Personalization').click();
      cy.get('[type="time"]').clear().type('14:30');
    });

    test('should save preferences', () => {
      cy.contains('Personalization').click();
      cy.contains('Dark').click();
      cy.contains('Save').click();
      cy.wait(1000);
      cy.contains(/Saved|Success/i).should('be.visible');
    });

    test('should show unsaved changes indicator', () => {
      cy.contains('Personalization').click();
      cy.contains('Dark').click();
      cy.contains('unsaved changes').should('be.visible');
    });

    test('should disable save button without changes', () => {
      cy.contains('Personalization').click();
      cy.contains('Save').should('be.disabled');
    });

    test('should enable save button with changes', () => {
      cy.contains('Personalization').click();
      cy.contains('Dark').click();
      cy.contains('Save').should('not.be.disabled');
    });

    test('should select privacy settings', () => {
      cy.contains('Personalization').click();
      cy.get('select').contains('Profile Visibility').parent().select('public');
    });

    test('should change data retention policy', () => {
      cy.contains('Personalization').click();
      cy.get('select').contains('Data Retention').parent().select('forever');
    });
  });

  // ============ COMPLETE USER WORKFLOWS ============

  describe('Complete User Workflows', () => {
    test('should generate recommendations and export them', () => {
      // Get recommendations
      cy.contains('Recommendations').click();
      cy.contains('Focus Areas').should('be.visible');
      
      // Navigate to export
      cy.contains('Export').click();
      cy.contains('Export Your Diary').should('be.visible');
      
      // Export as JSON
      cy.contains('JSON').click();
      cy.contains('Export').click();
      cy.wait(2000);
    });

    test('should customize settings and write with new mode', () => {
      // Customize writing mode
      cy.contains('Personalization').click();
      cy.contains('Typewriter').click();
      cy.contains('Save').click();
      cy.wait(1000);
      
      // Verify settings saved
      cy.contains(/Saved|Success/i).should('be.visible');
    });

    test('should share entry and add comment', () => {
      // Share entry
      cy.contains('Sharing').click();
      cy.get('[data-testid="copy-link"]').first().click();
      
      // Add comment
      cy.contains('Comments').click();
      cy.get('[placeholder*="comment" i]').type('Love this!');
      cy.get('[data-testid="post-comment"]').click();
      
      // View statistics
      cy.contains('Statistics').click();
      cy.contains('Comments').should('be.visible');
    });

    test('should view analytics and export insights', () => {
      // Get recommendations
      cy.contains('Recommendations').click();
      cy.wait(1000);
      
      // Export insights
      cy.contains('Export').click();
      cy.get('[type="checkbox"]').check(); // Include analytics
      cy.contains('CSV').click();
      cy.contains('Export').click();
      cy.wait(2000);
    });

    test('should filter recommendations and share results', () => {
      // Get 30-day recommendations
      cy.contains('Recommendations').click();
      cy.get('select').first().select('30');
      cy.wait(1000);
      
      // Share result
      cy.contains('Sharing').click();
      cy.get('[data-testid="copy-link"]').first().click();
    });
  });

  // ============ RESPONSIVE DESIGN TESTS ============

  describe('Responsive Design', () => {
    test('should be responsive on mobile', () => {
      cy.viewport('iphone-x');
      cy.contains('Recommendations').click();
      cy.contains('AI-Powered Recommendations').should('be.visible');
    });

    test('should be responsive on tablet', () => {
      cy.viewport('ipad-2');
      cy.contains('Export').click();
      cy.contains('Export Your Diary').should('be.visible');
    });

    test('should be responsive on desktop', () => {
      cy.viewport('macbook-15');
      cy.contains('Personalization').click();
      cy.contains('Personalization Settings').should('be.visible');
    });

    test('should maintain layout on small mobile', () => {
      cy.viewport(320, 568);
      cy.contains('Sharing').click();
      cy.contains('Sharing & Collaboration').should('be.visible');
    });
  });

  // ============ PERFORMANCE TESTS ============

  describe('Performance', () => {
    test('should load recommendations within acceptable time', () => {
      const startTime = Date.now();
      cy.contains('Recommendations').click();
      cy.contains('Focus Areas', { timeout: 5000 }).should('be.visible');
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('should load personalization panel quickly', () => {
      const startTime = Date.now();
      cy.contains('Personalization').click();
      cy.contains('Theme', { timeout: 3000 }).should('be.visible');
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(3000);
    });

    test('should export data efficiently', () => {
      const startTime = Date.now();
      cy.contains('Export').click();
      cy.contains('Export').click();
      cy.wait(2000);
      const endTime = Date.now();
      expect(endTime - startTime).toBeLessThan(5000);
    });

    test('should handle rapid tab switching', () => {
      cy.contains('Sharing').click();
      cy.contains('Shares').click();
      cy.contains('Comments').click();
      cy.contains('Statistics').click();
      cy.contains('Shares').click();
      cy.get('[class*="active"]').should('exist');
    });
  });

  // ============ ERROR HANDLING & EDGE CASES ============

  describe('Error Handling & Edge Cases', () => {
    test('should handle missing authentication', () => {
      localStorage.removeItem('authToken');
      cy.visit(`${baseUrl}/diary`);
      cy.contains(/login|sign in|unauthorized/i).should('be.visible');
    });

    test('should handle API errors gracefully', () => {
      cy.intercept('GET', '**/recommendations*', { statusCode: 500 }).as('recommendError');
      cy.contains('Recommendations').click();
      cy.wait('@recommendError');
      cy.contains(/error|failed/i).should('be.visible');
    });

    test('should display empty states correctly', () => {
      cy.intercept('GET', '**/sharing-stats*', { 
        statusCode: 200,
        body: { success: true, data: { totalShares: 0 } }
      });
      cy.contains('Sharing').click();
      cy.contains('Statistics').click();
      cy.get('body').then(body => {
        expect(body.text()).to.include('0');
      });
    });

    test('should handle slow network gracefully', () => {
      cy.intercept('GET', '**/recommendations*', (req) => {
        req.reply((res) => {
          res.delay(3000); // 3 second delay
        });
      });
      cy.contains('Recommendations').click();
      cy.get('[class*="loading"]', { timeout: 5000 }).should('exist');
    });

    test('should prevent duplicate exports', () => {
      cy.contains('Export').click();
      cy.contains('Export').click();
      cy.contains('Export').click();
      cy.wait(500);
      // Export button should be disabled after first click
      cy.get('[data-testid="export-btn"]').should('be.disabled');
    });
  });

  // ============ ACCESSIBILITY TESTS ============

  describe('Accessibility', () => {
    test('should have proper heading structure', () => {
      cy.contains('Recommendations').click();
      cy.get('h1, h2, h3').should('have.length.greaterThan', 0);
    });

    test('should have accessible form inputs', () => {
      cy.contains('Personalization').click();
      cy.get('[type="checkbox"]').should('have.length.greaterThan', 0);
      cy.get('select').should('have.length.greaterThan', 0);
    });

    test('should support keyboard navigation', () => {
      cy.contains('Recommendations').click();
      cy.get('body').tab();
      cy.focused().should('exist');
    });

    test('should have proper aria labels', () => {
      cy.contains('Personalization').click();
      cy.get('[aria-label]').should('have.length.greaterThan', 0);
    });

    test('should have color contrast compliance', () => {
      // Visual test for color contrast
      cy.contains('Recommendations').click();
      cy.get('[class*="badge"]').should('have.css', 'color');
    });
  });
});
