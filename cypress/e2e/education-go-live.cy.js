describe('Education module go-live regression', () => {
  let educationState;
  const skillCourses = [
    {
      id: 'gulf-hotel-operations-pro',
      title: 'Gulf Hotel Operations Pro',
      level: 'Beginner',
      duration: '45 hours',
      price: 0,
      description: 'Hospitality track.',
      certificateAvailable: true,
      jobLinked: true,
      modules: [],
    },
    {
      id: 'kerala-digital-marketing',
      title: 'Kerala Digital Marketing Launchpad',
      level: 'Intermediate',
      duration: '32 hours',
      price: 1200,
      description: 'Digital marketing track.',
      certificateAvailable: true,
      jobLinked: true,
      modules: [],
    },
  ];
  const educationDiscovery = {
    scholarships: [
      {
        name: 'Kerala State Merit Scholarship',
        amount: 'INR 10,000/year',
        deadline: 'June 30, 2026',
        eligibility: 'Merit-based',
      },
    ],
    governmentSchemes: [
      {
        title: 'Scholarship Eligibility Checker',
        summary: 'Find scholarships you qualify for based on category and academic level.',
      },
    ],
  };

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
        courseProgress: req.body?.courseProgress && typeof req.body.courseProgress === 'object' ? req.body.courseProgress : {},
        roleProfile: req.body?.roleProfile && typeof req.body.roleProfile === 'object'
          ? req.body.roleProfile
          : {
              primaryRole: 'student',
              studentName: '',
              classLevel: '',
              targetExam: '',
              preferredLanguage: 'English',
              careerGoal: '',
            },
        interventionsDismissed: Array.isArray(req.body?.interventionsDismissed) ? req.body.interventionsDismissed : [],
      };

      req.reply({
        statusCode: 200,
        body: { success: true, data: { state: educationState } },
      });
    }).as('patchEducationState');

    cy.intercept('GET', '**/api/app-data/skilllearning/courses', {
      statusCode: 200,
      body: { success: true, data: { courses: skillCourses } },
    }).as('getSkillCourses');

    cy.intercept('GET', '**/api/app-data/education/discovery', {
      statusCode: 200,
      body: { success: true, data: educationDiscovery },
    }).as('getEducationDiscovery');

    cy.intercept('GET', '**/api/app-data/education/learning-path', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          recommendations: ['Gulf Hotel Operations Pro'],
          weakAreas: [],
          path: ['Complete one focused lesson from your enrolled course.'],
          enrolledCourseIds: educationState.enrolledCourseIds,
        },
      },
    }).as('getEducationLearningPath');

    cy.intercept('GET', '**/api/app-data/skilllearning/questions*', {
      statusCode: 200,
      body: { success: true, data: { questions: [] } },
    }).as('getEducationQuestions');

    cy.intercept('GET', '**/api/app-data/skilllearning/certificates', {
      statusCode: 200,
      body: { success: true, data: { certificates: [], govtPortals: [] } },
    }).as('getEducationCertificates');

    cy.intercept('GET', '**/api/app-data/skilllearning/wallet', {
      statusCode: 200,
      body: { success: true, data: { courses: skillCourses, certificates: [], shareText: '' } },
    }).as('getEducationWallet');

    cy.intercept('GET', '**/api/app-data/education/tuition/requests', {
      statusCode: 200,
      body: { success: true, data: { requests: [] } },
    }).as('getTuitionRequests');

    cy.intercept('GET', '**/api/app-data/education/overview360', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          state: educationState,
          outcomeMetrics: {
            readinessScore: 0,
            avgCourseProgress: 0,
            latestTestScore: 0,
            tuitionCompletionRate: 0,
            scholarshipConversionRate: 0,
            certificationVerificationRate: 0,
          },
          interventions: [],
          canvaToolkit: {
            templates: [],
            campaignSizes: [],
            translationTargets: ['English', 'Malayalam', 'Hindi'],
            suggestedCampaigns: [],
          },
        },
      },
    }).as('getEducationOverview360');

    cy.intercept('GET', '**/api/app-data/education/canva-kit', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          canvaToolkit: {
            templates: [],
            campaignSizes: [],
            translationTargets: ['English', 'Malayalam', 'Hindi'],
            suggestedCampaigns: [],
          },
        },
      },
    }).as('getEducationCanvaKit');

    cy.intercept('GET', '**/api/app-data/education/kpis', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          metrics: {
            readinessScore: 0,
            avgCourseProgress: 0,
            tuitionCompletionRate: 0,
            certificationVerificationRate: 0,
          },
          kpiHealth: {
            readiness: 'attention',
            progress: 'attention',
            tuition: 'attention',
            certificates: 'attention',
          },
        },
      },
    }).as('getEducationKpis');

    cy.intercept('POST', '**/api/app-data/education/enroll', (req) => {
      const courseId = req.body?.courseId;
      if (courseId && !educationState.enrolledCourseIds.includes(courseId)) {
        educationState.enrolledCourseIds.push(courseId);
      }
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: {
            state: educationState,
            requiresPayment: false,
          },
        },
      });
    }).as('postEducationEnroll');

    cy.intercept('POST', '**/api/app-data/education/scholarship', (req) => {
      const scholarshipName = req.body?.scholarshipName;
      if (scholarshipName && !educationState.appliedScholarships.includes(scholarshipName)) {
        educationState.appliedScholarships.push(scholarshipName);
      }
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: { state: educationState },
        },
      });
    }).as('postEducationScholarship');

    cy.intercept('POST', '**/api/app-data/education/group', (req) => {
      const groupTitle = req.body?.groupTitle;
      if (groupTitle && !educationState.joinedGroups.includes(groupTitle)) {
        educationState.joinedGroups.push(groupTitle);
      }
      req.reply({
        statusCode: 200,
        body: {
          success: true,
          data: { state: educationState },
        },
      });
    }).as('postEducationGroup');
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
    cy.wait('@getSkillCourses');
    cy.wait('@getEducationDiscovery');
    cy.wait('@getEducationLearningPath');
    cy.wait('@getEducationQuestions');
    cy.wait('@getEducationCertificates');
    cy.wait('@getEducationWallet');
    cy.wait('@getTuitionRequests');
    cy.wait('@getEducationOverview360');
    cy.wait('@getEducationCanvaKit');
    cy.wait('@getEducationKpis');
    cy.get('[data-testid="education-nav-home"]').should('be.visible');
  };

  beforeEach(() => {
    educationState = {
      enrolledCourseIds: [],
      appliedScholarships: [],
      joinedGroups: [],
      courseProgress: {},
      roleProfile: {
        primaryRole: 'student',
        studentName: '',
        classLevel: '',
        targetExam: '',
        preferredLanguage: 'English',
        careerGoal: '',
      },
      interventionsDismissed: [],
    };
  });

  it('persists enrolled courses across reload with account sync', () => {
    bootEducationPage();

    cy.get('[data-testid="education-nav-courses"]').click();
    cy.get('[data-testid="education-enroll-gulf-hotel-operations-pro"]').click();
    cy.wait('@postEducationEnroll');

    cy.get('[data-testid="education-nav-my-learning"]').click();
    cy.contains('Gulf Hotel Operations Pro').should('be.visible');

    cy.reload();
    cy.wait('@getPublicAppData');
    cy.wait('@getAuthMe');
    cy.wait('@getEducationState');
    cy.wait('@getSkillCourses');
    cy.wait('@getEducationDiscovery');
    cy.wait('@getEducationLearningPath');
    cy.wait('@getEducationQuestions');
    cy.wait('@getEducationCertificates');
    cy.wait('@getEducationWallet');
    cy.wait('@getTuitionRequests');
    cy.wait('@getEducationOverview360');
    cy.wait('@getEducationCanvaKit');
    cy.wait('@getEducationKpis');
    cy.get('[data-testid="education-nav-my-learning"]').click();
    cy.contains('Gulf Hotel Operations Pro').should('be.visible');
  });

  it('persists scholarship applications across reload with account sync', () => {
    bootEducationPage();

    cy.get('[data-testid="education-nav-government"]').click();
    cy.get('[data-testid="education-scholarship-kerala-state-merit-scholarship"]').click();
    cy.wait('@postEducationScholarship');
    cy.contains('button', 'Applied').should('be.visible');

    cy.reload();
    cy.wait('@getPublicAppData');
    cy.wait('@getAuthMe');
    cy.wait('@getEducationState');
    cy.wait('@getSkillCourses');
    cy.wait('@getEducationDiscovery');
    cy.wait('@getEducationLearningPath');
    cy.wait('@getEducationQuestions');
    cy.wait('@getEducationCertificates');
    cy.wait('@getEducationWallet');
    cy.wait('@getTuitionRequests');
    cy.wait('@getEducationOverview360');
    cy.wait('@getEducationCanvaKit');
    cy.wait('@getEducationKpis');
    cy.get('[data-testid="education-nav-government"]').click();
    cy.contains('button', 'Applied').should('be.visible');
  });

  it('persists joined community groups across reload with account sync', () => {
    bootEducationPage();

    cy.get('[data-testid="education-nav-community"]').click();
    cy.get('[data-testid="education-community-sslc-exam-preparation"]').click();
    cy.wait('@postEducationGroup');
    cy.contains('button', 'Joined').should('be.visible');

    cy.reload();
    cy.wait('@getPublicAppData');
    cy.wait('@getAuthMe');
    cy.wait('@getEducationState');
    cy.wait('@getSkillCourses');
    cy.wait('@getEducationDiscovery');
    cy.wait('@getEducationLearningPath');
    cy.wait('@getEducationQuestions');
    cy.wait('@getEducationCertificates');
    cy.wait('@getEducationWallet');
    cy.wait('@getTuitionRequests');
    cy.wait('@getEducationOverview360');
    cy.wait('@getEducationCanvaKit');
    cy.wait('@getEducationKpis');
    cy.get('[data-testid="education-nav-community"]').click();
    cy.contains('button', 'Joined').should('be.visible');
  });

  it('loads education 360 dashboard and canva studio sections', () => {
    bootEducationPage();

    cy.get('[data-testid="education-nav-dashboard-360"]').click();
    cy.contains('Education 360 Dashboard').should('be.visible');

    cy.get('[data-testid="education-nav-canva-studio"]').click();
    cy.contains('Canva Studio for Education').should('be.visible');
  });
});
