describe('NilaAIHub Module', () => {
  beforeEach(() => {
    cy.visit('/nilaaihub'); // Adjust URL as needed
  });

  it('should load the Nila AI Hub page', () => {
    cy.contains('Nila AI Hub').should('be.visible');
    cy.contains('Your AI Assistant for Local & Gulf Services').should('be.visible');
  });

  it('should display insights cards', () => {
    cy.get('.nila-ai-insight-card').should('have.length', 3);
    cy.contains('Service Matches').should('be.visible');
    cy.contains('Growth Tips').should('be.visible');
    cy.contains('Loan Options').should('be.visible');
  });

  it('should display search panel', () => {
    cy.get('.nila-ai-search-card').should('be.visible');
    cy.contains('Ask Nila AI').should('be.visible');
    cy.get('input[placeholder*="Ask anything"]').should('be.visible');
  });

  it('should display topic buttons', () => {
    cy.get('.nila-ai-topic-list button').should('have.length.greaterThan', 0);
    cy.contains('Gulf visa guidance').should('be.visible');
  });

  it('should display quick actions', () => {
    cy.get('.nila-ai-action-card').should('have.length', 4);
    cy.contains('Ask a Question').should('be.visible');
    cy.contains('Plan a Trip').should('be.visible');
  });

  it('should allow clicking quick action', () => {
    cy.contains('Ask a Question').click();
    // Check if query is set or something
    cy.get('input').should('have.value').and('not.be.empty');
  });

  it('should display AI assistants', () => {
    cy.get('.nila-ai-assistant-card').should('have.length.greaterThan', 0);
    cy.contains('Loan & Government Scheme Assistant').should('be.visible');
  });

  it('should display recommendations', () => {
    cy.contains('Personalized Recommendations').should('be.visible');
    cy.get('.nila-ai-recommendation-card').should('have.length.greaterThan', 0);
  });

  it('should handle search input', () => {
    cy.get('input').type('Test query');
    cy.get('button').contains('Ask AI').click();
    // Check for loading or response
    cy.get('.nila-ai-loading-state').should('be.visible');
  });

  it('should be accessible', () => {
    // Check for ARIA roles
    cy.get('[role="button"]').should('exist');
    cy.get('[aria-live]').should('exist');
  });
});