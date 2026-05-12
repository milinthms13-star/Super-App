describe('Education module go-live regression', () => {
  let educationState;

  const publicAppData = {
    businessCategories: [
      { id: 'education', name: 'Education Ecosystem', fee: 999, requiresFoodLicense: false },
    ],
    globeMartCategories: [],
    enabledModules: ['education'],
    registeredAccounts: [],
    moduleData: {
      ecommerceProducts: [],
      classifiedsListings: [],
      classifiedsMessages: [],
      classifiedsReports: [],
      realestateProperties: [],
      restaurants: [],
      rideOffers: [],
      conversations: [],
      matrimonialProfiles: [],
      socialMediaPosts: [],
      socialMediaStories: [],
    },
  };

  const authUser = {
    id: 'edu-user-1',
    email: 'education.user@example.com',
    name: 'Education User',
    role: 'user',
    registrationType: 'user',
    preferences: { language: 'en' },
  };

  const setupAppInterceptors = () => {
    cy.intercept('GET', '**/api/app-data/public', {
      statusCode: 200,
      body: { success: true, data: publicAppData },
    }).as('getPublicAppData');

    cy.intercept('GET', '**/api/auth/me', {
      statusCode: 200,
      body: { success: true, user: authUser },
    }).as('getAuthMe');

    cy.intercept('POST', '**/api/auth/logout', {
      statusCode: 200,
      body: { success: true },
    });

    cy.intercept('GET', '**/api/app-data/education/state', (req) => {
      req.reply({
        statusCode: 200,
        body: { success: true, data: { state: educationState } },
      });
    }).as('getEducationState');

    cy.intercept('PATCH', '**/api/app-data/education/state', (req) => {
      educationState = {
        enrolledCourseIds: Array.isArray(req.body?.enrolledCourseIds) ? req.body.enrolledCourseIds : [],
        appliedScholarships: Array.isArray(req.body?.appliedScholarships) ? req.body.appliedScholarships : [],
        joinedGroups: Array.isArray(req.body?.joinedGroups) ? req.body.joinedGroups : [],
      };

      req.reply({
        statusCode: 200,
        body: { success: true, data: { state: educationState } },
      });
    }).as('patchEducationState');
  };

  const bootEducationPage = () => {
    setupAppInterceptors();

    cy.visit('/education', {
      onBeforeLoad: (win) => {
        win.localStorage.setItem('mb_auth_token', 'test-token');
        win.localStorage.setItem('token', 'test-token');
      },
    });

    cy.wait('@getPublicAppData');
    cy.wait('@getAuthMe');
    cy.wait('@getEducationState');
    cy.get('[data-testid="education-nav-home"]').should('be.visible');
  };

  beforeEach(() => {
    educationState = {
      enrolledCourseIds: [],
      appliedScholarships: [],
      joinedGroups: [],
    };
  });

  it('persists enrolled courses across reload with account sync', () => {
    bootEducationPage();

    cy.get('[data-testid="education-nav-courses"]').click();
    cy.get('[data-testid="education-enroll-spoken-english"]').click();
    cy.wait('@patchEducationState');

    cy.get('[data-testid="education-nav-my-learning"]').click();
    cy.contains('Spoken English').should('be.visible');

    cy.reload();
    cy.wait('@getPublicAppData');
    cy.wait('@getAuthMe');
    cy.wait('@getEducationState');
    cy.get('[data-testid="education-nav-my-learning"]').click();
    cy.contains('Spoken English').should('be.visible');
  });

  it('persists scholarship applications across reload with account sync', () => {
    bootEducationPage();

    cy.get('[data-testid="education-nav-government"]').click();
    cy.get('[data-testid="education-scholarship-kerala-state-merit-scholarship"]').click();
    cy.wait('@patchEducationState');
    cy.contains('button', 'Applied').should('be.visible');

    cy.reload();
    cy.wait('@getPublicAppData');
    cy.wait('@getAuthMe');
    cy.wait('@getEducationState');
    cy.get('[data-testid="education-nav-government"]').click();
    cy.contains('button', 'Applied').should('be.visible');
  });

  it('persists joined community groups across reload with account sync', () => {
    bootEducationPage();

    cy.get('[data-testid="education-nav-community"]').click();
    cy.get('[data-testid="education-community-sslc-exam-preparation"]').click();
    cy.wait('@patchEducationState');
    cy.contains('button', 'Joined').should('be.visible');

    cy.reload();
    cy.wait('@getPublicAppData');
    cy.wait('@getAuthMe');
    cy.wait('@getEducationState');
    cy.get('[data-testid="education-nav-community"]').click();
    cy.contains('button', 'Joined').should('be.visible');
  });
});
