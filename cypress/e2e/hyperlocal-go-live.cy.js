describe('Hyperlocal module go-live smoke', () => {
  it('loads hyperlocal hub and core operational sections', () => {
    cy.visit('/hyperlocal');
    cy.contains('Nila Hyperlocal Delivery', { timeout: 20000 }).should('be.visible');
    cy.contains('Marketplace-ready hyperlocal operations.').should('be.visible');
    cy.contains('Shop Listing API + Distance Validation').should('be.visible');
    cy.contains('Address + Checkout + Tracking').should('be.visible');
    cy.contains('Order Tracking').should('be.visible');
  });
});
