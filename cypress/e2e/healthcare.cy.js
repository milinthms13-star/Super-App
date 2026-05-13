describe('Healthcare Module E2E Tests', () => {
  beforeEach(() => {
    // Visit the healthcare module
    cy.visit('/healthcare');

    // Wait for the page to load
    cy.contains('NilaCare', { timeout: 10000 }).should('be.visible');
  });

  it('should load healthcare module successfully', () => {
    // Check if the main healthcare container is visible
    cy.get('[data-testid="healthcare-module"]').should('be.visible');

    // Check if navigation is present
    cy.get('[data-testid="healthcare-nav"]').should('be.visible');

    // Check if hero section is displayed
    cy.get('[data-testid="healthcare-hero"]').should('be.visible');
  });

  it('should display doctor consultation section by default', () => {
    // Doctor consultation should be visible by default
    cy.get('[data-testid="doctor-consultation"]').should('be.visible');

    // Check for specialty selection
    cy.contains('Select Specialty').should('be.visible');

    // Check for doctor cards or loading state
    cy.get('[data-testid="doctor-list"]').should('exist');
  });

  it('should navigate between healthcare sections', () => {
    // Start with consultation
    cy.get('[data-testid="doctor-consultation"]').should('be.visible');

    // Navigate to Lab Booking
    cy.get('[data-testid="nav-lab-booking"]').click();
    cy.get('[data-testid="lab-booking"]').should('be.visible');
    cy.contains('Blood Tests').should('be.visible');

    // Navigate to Health Records
    cy.get('[data-testid="nav-health-records"]').click();
    cy.get('[data-testid="records-vault"]').should('be.visible');
    cy.contains('Health Records Vault').should('be.visible');

    // Navigate to Pharmacy
    cy.get('[data-testid="nav-pharmacy"]').click();
    cy.get('[data-testid="pharmacy-delivery"]').should('be.visible');
    cy.contains('Pharmacy Delivery').should('be.visible');

    // Navigate to Emergency
    cy.get('[data-testid="nav-emergency"]').click();
    cy.get('[data-testid="emergency-sos"]').should('be.visible');
    cy.contains('Emergency & SOS').should('be.visible');

    // Navigate to Elderly Care
    cy.get('[data-testid="nav-elderly-care"]').click();
    cy.get('[data-testid="elderly-care"]').should('be.visible');
    cy.contains('Elderly Care').should('be.visible');
  });

  it('should handle doctor consultation workflow', () => {
    // Select a specialty
    cy.get('[data-testid="specialty-select"]').select('General Physician');

    // Click find doctors
    cy.get('[data-testid="find-doctors-btn"]').click();

    // Should show doctors list
    cy.get('[data-testid="doctor-card"]').should('have.length.greaterThan', 0);

    // Check doctor information is displayed
    cy.get('[data-testid="doctor-name"]').first().should('be.visible');
    cy.get('[data-testid="doctor-specialty"]').first().should('be.visible');
    cy.get('[data-testid="doctor-rating"]').first().should('be.visible');
  });

  it('should handle lab booking workflow', () => {
    // Navigate to lab booking
    cy.get('[data-testid="nav-lab-booking"]').click();

    // Check blood tests section
    cy.contains('Blood Tests').should('be.visible');
    cy.get('[data-testid="blood-test-item"]').should('have.length.greaterThan', 0);

    // Check health packages section
    cy.contains('Health Packages').should('be.visible');
    cy.get('[data-testid="health-package-item"]').should('exist');
  });

  it('should handle pharmacy delivery workflow', () => {
    // Navigate to pharmacy
    cy.get('[data-testid="nav-pharmacy"]').click();

    // Check prescription upload
    cy.get('[data-testid="prescription-upload"]').should('be.visible');

    // Check medicine search
    cy.get('[data-testid="medicine-search"]').should('be.visible');

    // Type in search
    cy.get('[data-testid="medicine-search"]').type('Paracetamol');

    // Should show search results
    cy.get('[data-testid="medicine-result"]').should('exist');
  });

  it('should handle health records vault', () => {
    // Navigate to records
    cy.get('[data-testid="nav-health-records"]').click();

    // Check records sections
    cy.contains('Prescriptions').should('be.visible');
    cy.contains('Lab Reports').should('be.visible');
    cy.contains('Scan Reports').should('be.visible');

    // Check family profiles section
    cy.contains('Family Profiles').should('be.visible');
  });

  it('should handle emergency services', () => {
    // Navigate to emergency
    cy.get('[data-testid="nav-emergency"]').click();

    // Check emergency buttons
    cy.get('[data-testid="ambulance-btn"]').should('be.visible');
    cy.get('[data-testid="hospital-finder-btn"]').should('be.visible');
    cy.get('[data-testid="sos-btn"]').should('be.visible');

    // Check emergency disclaimer
    cy.contains('emergency disclaimer').should('be.visible');
  });

  it('should handle elderly care features', () => {
    // Navigate to elderly care
    cy.get('[data-testid="nav-elderly-care"]').click();

    // Check elderly care sections
    cy.contains('Medicine Reminders').should('be.visible');
    cy.contains('Appointment Tracking').should('be.visible');
    cy.contains('Health Monitoring').should('be.visible');
  });

  it('should be responsive on mobile', () => {
    // Set viewport to mobile
    cy.viewport('iphone-6');

    // Check if navigation adapts
    cy.get('[data-testid="healthcare-nav"]').should('be.visible');

    // Check if content is scrollable
    cy.get('[data-testid="healthcare-module"]').should('be.visible');

    // Test navigation on mobile
    cy.get('[data-testid="nav-lab-booking"]').click();
    cy.get('[data-testid="lab-booking"]').should('be.visible');
  });

  it('should handle API errors gracefully', () => {
    // Simulate API failure by intercepting requests
    cy.intercept('GET', '/api/doctors', { statusCode: 500 });

    // Reload page
    cy.reload();

    // Should show error message or fallback to demo mode
    cy.get('[data-testid="healthcare-module"]').should('be.visible');

    // Should still show basic functionality
    cy.get('[data-testid="healthcare-nav"]').should('be.visible');
  });

  it('should maintain user session across navigation', () => {
    // Navigate through different sections
    cy.get('[data-testid="nav-lab-booking"]').click();
    cy.get('[data-testid="nav-pharmacy"]').click();
    cy.get('[data-testid="nav-emergency"]').click();

    // Go back to consultation
    cy.get('[data-testid="nav-consultation"]').click();

    // Should remember the section
    cy.get('[data-testid="doctor-consultation"]').should('be.visible');
  });

  it('should handle search functionality', () => {
    // Test medicine search
    cy.get('[data-testid="nav-pharmacy"]').click();
    cy.get('[data-testid="medicine-search"]').type('Aspirin');
    cy.get('[data-testid="search-results"]').should('be.visible');

    // Test doctor search by specialty
    cy.get('[data-testid="nav-consultation"]').click();
    cy.get('[data-testid="specialty-select"]').select('Cardiologist');
    cy.get('[data-testid="find-doctors-btn"]').click();
    cy.get('[data-testid="doctor-list"]').should('be.visible');
  });

  it('should validate form inputs', () => {
    // Test prescription upload validation
    cy.get('[data-testid="nav-pharmacy"]').click();

    // Try to upload invalid file type
    cy.get('[data-testid="prescription-upload"]').selectFile('cypress/fixtures/invalid-file.txt', { force: true });

    // Should show error message
    cy.contains('Invalid file type').should('be.visible');
  });

  it('should handle offline functionality', () => {
    // Go offline
    cy.window().then((win) => {
      win.navigator.serviceWorker.controller.postMessage({ type: 'OFFLINE' });
    });

    // Try to access healthcare module
    cy.reload();

    // Should show offline message but still display cached content
    cy.get('[data-testid="healthcare-module"]').should('be.visible');
    cy.contains('offline').should('be.visible');
  });
});