describe('GulfServices module go-live smoke', () => {
  it('loads gulf services hub and key calls to action', () => {
    cy.visit('/gulf-services');
    cy.contains('Gulf Services', { timeout: 20000 }).should('be.visible');
    cy.contains('Start Visa Support').should('be.visible');
    cy.contains('Explore Gulf Jobs').should('be.visible');
  });
});
