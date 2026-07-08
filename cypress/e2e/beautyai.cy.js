describe('Beauty AI Module E2E Tests', () => {
  beforeEach(() => {
    // Login before each test
    cy.visit('/login');
    cy.get('input[name="email"]').type('test@example.com');
    cy.get('input[name="password"]').type('password123');
    cy.get('button[type="submit"]').click();
    cy.url().should('include', '/dashboard');

    // Navigate to Beauty AI module
    cy.visit('/nila-beauty-ai');
    cy.url().should('include', '/nila-beauty-ai');
  });

  describe('Module Loading', () => {
    it('loads the beauty AI module successfully', () => {
      cy.contains('Nila Beauty AI').should('be.visible');
      cy.contains('Beauty Tips of the Day').should('be.visible');
    });

    it('displays navigation tabs', () => {
      cy.contains('button', 'Home').should('be.visible');
      cy.contains('button', 'Privacy & Consent').should('be.visible');
      cy.contains('button', 'Usage Stats').should('be.visible');
      cy.contains('button', 'My Selfies').should('be.visible');
      cy.contains('button', 'Products').should('be.visible');
    });
  });

  describe('Beauty Tips Carousel', () => {
    it('displays daily beauty tips', () => {
      cy.get('.beauty-tips-carousel').should('be.visible');
      cy.get('.tip-card').should('be.visible');
    });

    it('navigates through tips', () => {
      cy.get('.carousel-nav.next').click();
      cy.wait(300);
      cy.get('.tip-card').should('be.visible');
    });

    it('filters tips by category', () => {
      cy.get('.category-filters button').contains('Skin Care').click();
      cy.get('.tip-card').should('be.visible');
    });

    it('pauses and resumes autoplay', () => {
      cy.contains('button', 'Pause').click();
      cy.contains('button', 'Play').should('be.visible');
      
      cy.contains('button', 'Play').click();
      cy.contains('button', 'Pause').should('be.visible');
    });
  });

  describe('Consent Management', () => {
    beforeEach(() => {
      cy.contains('button', 'Privacy & Consent').click();
    });

    it('displays consent settings', () => {
      cy.contains('Privacy & Consent Settings').should('be.visible');
      cy.contains('Selfie Analysis').should('be.visible');
      cy.contains('Beauty Plan Generation').should('be.visible');
    });

    it('shows consent details', () => {
      cy.contains('button', 'Show Details').first().click();
      cy.contains('What we collect:').should('be.visible');
      cy.contains('How we use it:').should('be.visible');
      cy.contains('Your rights:').should('be.visible');
    });

    it('hides consent details', () => {
      cy.contains('button', 'Show Details').first().click();
      cy.contains('button', 'Hide Details').click();
      cy.contains('What we collect:').should('not.exist');
    });
  });

  describe('Usage Stats', () => {
    beforeEach(() => {
      cy.contains('button', 'Usage Stats').click();
    });

    it('displays usage statistics', () => {
      cy.contains('Usage Statistics').should('be.visible');
      cy.contains('Selfie Analysis').should('be.visible');
      cy.contains('Beauty Plans').should('be.visible');
    });

    it('shows quota information', () => {
      cy.get('.usage-item').should('have.length.at.least', 1);
      cy.get('.usage-bar').should('be.visible');
    });

    it('displays feature availability', () => {
      cy.contains('Available Features').should('be.visible');
    });
  });

  describe('Selfie Upload and Analysis', () => {
    it('allows selfie upload', () => {
      cy.get('input[type="file"]').first().selectFile(
        {
          contents: 'cypress/fixtures/sample-selfie.jpg',
          fileName: 'selfie.jpg',
          mimeType: 'image/jpeg',
        },
        { force: true }
      );

      cy.get('.selfie-preview', { timeout: 5000 }).should('be.visible');
    });

    it('shows consent requirement for analysis', () => {
      cy.contains('I consent to selfie analysis').should('be.visible');
    });

    it('generates beauty plan after analysis', () => {
      // Upload selfie
      cy.get('input[type="file"]').first().selectFile(
        {
          contents: 'cypress/fixtures/sample-selfie.jpg',
          fileName: 'selfie.jpg',
          mimeType: 'image/jpeg',
        },
        { force: true }
      );

      // Give consent
      cy.get('input[type="checkbox"]').check({ force: true });

      // Fill form
      cy.get('select[name="skinType"]').select('combination');
      cy.get('select[name="concern"]').select('acne');
      cy.get('select[name="budget"]').select('medium');

      // Generate plan
      cy.contains('button', 'Generate Plan').click();

      // Wait for plan generation
      cy.contains('Beauty plan generated', { timeout: 10000 }).should('be.visible');
    });
  });

  describe('Progress Tracking', () => {
    it('displays 7-day glow challenge', () => {
      cy.contains('7-Day Glow Challenge').should('be.visible');
      cy.get('.beauty-progress-grid button').should('have.length', 7);
    });

    it('marks day as completed', () => {
      cy.get('.beauty-progress-grid button').first().click();
      cy.contains('Progress saved', { timeout: 5000 }).should('be.visible');
      cy.get('.beauty-progress-grid button.done').should('have.length.at.least', 1);
    });

    it('saves weekly snapshot', () => {
      cy.contains('button', 'Save weekly selfie snapshot').click();
      cy.contains('snapshot saved', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Selfie Gallery', () => {
    beforeEach(() => {
      cy.contains('button', 'My Selfies').click();
    });

    it('displays saved selfies', () => {
      cy.get('.beauty-selfie-gallery').should('be.visible');
    });

    it('toggles between grid and list view', () => {
      cy.get('button[aria-label="List view"]').click();
      cy.get('.list-view').should('exist');

      cy.get('button[aria-label="Grid view"]').click();
      cy.get('.grid-view').should('exist');
    });

    it('sorts selfies by different criteria', () => {
      cy.get('.sort-select').select('score-desc');
      cy.get('.selfie-card').should('be.visible');
    });

    it('opens selfie detail modal', () => {
      cy.get('.selfie-card').first().click();
      cy.contains('Analysis Results').should('be.visible');
    });

    it('closes selfie detail modal', () => {
      cy.get('.selfie-card').first().click();
      cy.get('.close-modal').click();
      cy.contains('Analysis Results').should('not.exist');
    });
  });

  describe('Product Recommendations', () => {
    beforeEach(() => {
      cy.contains('button', 'Products').click();
    });

    it('displays product recommendations section', () => {
      cy.contains('Product Recommendations').should('be.visible');
    });

    it('filters products by budget', () => {
      cy.contains('button', 'Budget-Friendly').click();
      cy.wait(300);
      // Products should be filtered (if any exist)
    });

    it('sorts products', () => {
      cy.get('.sort-filter select').select('price-asc');
      cy.wait(300);
    });
  });

  describe('Offline Support', () => {
    it('shows offline indicator when connection is lost', () => {
      cy.window().then((win) => {
        cy.stub(win.navigator, 'onLine').value(false);
      });

      // Trigger an action that should queue
      cy.get('.beauty-progress-grid button').first().click();

      // Should show pending sync message
      cy.contains('pending sync', { timeout: 5000 }).should('be.visible');
    });
  });

  describe('Admin Controls', () => {
    beforeEach(() => {
      // Login as admin
      cy.visit('/login');
      cy.get('input[name="email"]').type('admin@example.com');
      cy.get('input[name="password"]').type('adminpass123');
      cy.get('button[type="submit"]').click();
      cy.visit('/nila-beauty-ai');
    });

    it('displays admin tab for admin users', () => {
      cy.contains('button', 'Admin').should('be.visible');
    });

    it('shows admin statistics', () => {
      cy.contains('button', 'Admin').click();
      cy.contains('Platform Statistics').should('be.visible');
    });

    it('allows creating new tips', () => {
      cy.contains('button', 'Admin').click();
      cy.contains('button', 'Create Tip').click();

      cy.get('input[id="tip-title"]').type('Test Beauty Tip');
      cy.get('textarea[id="tip-text"]').type('This is a test tip content.');
      cy.get('select[id="tip-category"]').select('skin-care');

      cy.contains('button', 'Create Tip').click();
      cy.contains('Tip created', { timeout: 5000 }).should('be.visible');
    });

    it('displays system alerts', () => {
      cy.contains('button', 'Admin').click();
      cy.contains('button', 'Alerts').click();
      cy.contains('System Alerts').should('be.visible');
    });
  });

  describe('Responsive Design', () => {
    const viewports = [
      { device: 'iphone-x', width: 375, height: 812 },
      { device: 'ipad-2', width: 768, height: 1024 },
      { device: 'macbook-15', width: 1440, height: 900 },
    ];

    viewports.forEach(({ device, width, height }) => {
      it(`displays correctly on ${device}`, () => {
        cy.viewport(width, height);
        cy.contains('Nila Beauty AI').should('be.visible');
        cy.get('.beauty-tabs button').should('be.visible');
      });
    });
  });

  describe('Accessibility', () => {
    it('allows keyboard navigation', () => {
      cy.get('body').tab();
      cy.focused().should('have.class', 'beauty-tabs').or('be.visible');
    });

    it('has proper ARIA labels', () => {
      cy.get('button[aria-label]').should('have.length.at.least', 1);
    });

    it('supports screen readers', () => {
      cy.get('[role="button"]').should('exist');
      cy.get('[aria-label]').should('exist');
    });
  });
});
