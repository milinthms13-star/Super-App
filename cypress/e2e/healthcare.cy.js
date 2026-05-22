describe('Healthcare Module E2E', () => {
  beforeEach(() => {
    cy.visit('/healthcare', {
      onBeforeLoad(win) {
        Object.defineProperty(win.navigator, 'geolocation', {
          value: {
            getCurrentPosition(success) {
              success({
                coords: {
                  latitude: 11.2588,
                  longitude: 75.7804,
                  accuracy: 10,
                },
              });
            },
          },
          configurable: true,
        });
      },
    });
    cy.get('[data-testid="healthcare-module"]', { timeout: 15000 }).should('be.visible');
  });

  it('loads home dashboard', () => {
    cy.get('[data-testid="healthcare-10home"]').should('be.visible');
    cy.contains('Your complete healthcare companion').should('be.visible');
  });

  it('navigates from home to consultation', () => {
    cy.contains('button', 'Find Doctor').click();
    cy.get('[data-testid="healthcare-nav"]').should('be.visible');
    cy.get('[data-testid="doctor-consultation"]').should('be.visible');
    cy.get('[data-testid="doctor-list"]').should('exist');
  });

  it('navigates across major sections', () => {
    cy.contains('button', 'Find Doctor').click();

    cy.get('[data-testid="nav-lab-booking"]').click();
    cy.get('[data-testid="lab-booking"]').should('be.visible');

    cy.get('[data-testid="nav-health-records"]').click();
    cy.get('[data-testid="records-vault"]').should('be.visible');

    cy.get('[data-testid="nav-pharmacy"]').click();
    cy.get('[data-testid="pharmacy-delivery"]').should('be.visible');

    cy.get('[data-testid="nav-emergency"]').click();
    cy.get('[data-testid="emergency-sos"]').should('be.visible');

    cy.get('[data-testid="nav-elderly-care"]').click();
    cy.get('[data-testid="elderly-care"]').should('be.visible');
  });

  it('supports doctor filtering', () => {
    cy.contains('button', 'Find Doctor').click();
    cy.get('[data-testid="specialty-select"]').should('be.visible');
    cy.get('[data-testid="doctor-card"]').should('exist');
    cy.get('[data-testid="doctor-name"]').first().should('be.visible');
    cy.get('[data-testid="doctor-specialty"]').first().should('be.visible');
  });

  it('supports lab and medicine search', () => {
    cy.contains('button', 'Find Doctor').click();

    cy.get('[data-testid="nav-lab-booking"]').click();
    cy.get('[data-testid="lab-test-search"]').type('cbc');
    cy.get('[data-testid="blood-test-item"]').should('exist');

    cy.get('[data-testid="nav-pharmacy"]').click();
    cy.get('[data-testid="medicine-search"]').type('para');
    cy.get('[data-testid="medicine-result"]').should('exist');
  });

  it('shows emergency action controls', () => {
    cy.contains('button', 'Find Doctor').click();
    cy.get('[data-testid="nav-emergency"]').click();
    cy.get('[data-testid="ambulance-btn"]').should('be.visible');
    cy.get('[data-testid="hospital-finder-btn"]').should('be.visible');
    cy.get('[data-testid="sos-btn"]').should('be.visible');
  });

  it('supports record upload, archive, and audit visibility', () => {
    cy.contains('button', 'Find Doctor').click();
    cy.get('[data-testid="nav-health-records"]').click();

    cy.contains('span', 'Document Title').parent().find('input').type('Blood Sugar Report');
    cy.contains('span', 'Doctor Name').parent().find('input').type('Dr. Nair');
    cy.contains('span', 'Record Date').parent().find('input').type('2026-05-20');
    cy.get('input[type="file"]').first().selectFile({
      contents: Cypress.Buffer.from('sample report'),
      fileName: 'blood-sugar.pdf',
      mimeType: 'application/pdf',
    });
    cy.get('input[type="checkbox"]').check({ force: true });
    cy.contains('button', 'Upload To Vault').click();

    cy.contains('Record uploaded to vault.', { timeout: 10000 }).should('be.visible');
    cy.contains('Blood Sugar Report').should('be.visible');

    cy.on('window:confirm', () => true);
    cy.contains('button', 'Archive').click();
    cy.contains('No records yet.').should('be.visible');
    cy.contains('button', 'Archived').click();
    cy.contains('button', 'Restore').should('be.visible');
    cy.contains('record uploaded', { matchCase: false }).should('be.visible');
  });

  it('supports emergency status progression from open to acknowledged to resolved', () => {
    cy.contains('button', 'Find Doctor').click();
    cy.get('[data-testid="nav-emergency"]').click();

    cy.get('[data-testid="sos-btn"]').click();
    cy.contains('button', 'Confirm SOS').click();

    cy.contains('Emergency Incident History').should('be.visible');
    cy.contains('button', 'Mark Acknowledged', { timeout: 10000 }).click();
    cy.contains('button', 'Mark Resolved', { timeout: 10000 }).click();
    cy.contains('Status: resolved', { matchCase: false }).should('be.visible');
  });
});
