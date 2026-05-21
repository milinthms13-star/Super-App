describe('DanceDuet queued render flow', () => {
  it('queues job, polls status, and shows output with growth pack', () => {
    cy.intercept('GET', '**/api/dance-duet/jobs/me*', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          jobs: [],
          pagination: { page: 1, limit: 12, total: 0, totalPages: 1 },
        },
      },
    }).as('jobsMe');

    cy.intercept('GET', '**/api/dance-duet/analytics/me', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          summary: {
            totalJobs: 1,
            completedJobs: 1,
            failedJobs: 0,
            deadLetteredJobs: 0,
            completionRatePct: 100,
            averageProcessingMs: 4200,
            averageAttempts: 1,
          },
          modes: [{ mode: 'auto', count: 1 }],
        },
      },
    }).as('analyticsMe');

    cy.intercept('GET', '**/api/dance-duet/jobs/me/counts', {
      statusCode: 200,
      body: {
        success: true,
        data: {
          counts: {
            queued: 1,
            processing: 0,
            completed: 1,
            failed: 0,
            deadLettered: 0,
          },
        },
      },
    }).as('jobCounts');

    cy.intercept('POST', '**/api/dance-duet/merge', {
      statusCode: 202,
      body: {
        success: true,
        message: 'Dance duet accepted and queued for processing.',
        jobId: '664a4f7e0e9f3f7a442211aa',
        pollAfterSeconds: 1,
        data: {
          job: {
            id: '664a4f7e0e9f3f7a442211aa',
            status: 'queued',
            attempts: 0,
            maxAttempts: 2,
          },
          preflight: {
            readinessScore: 83,
            riskLevel: 'low',
            summary: 'Inputs are duet-ready.',
            checks: ['Duration alignment looks good.'],
            suggestions: [],
          },
          growthPack: {
            challengeTitle: 'AI Dance Duet Challenge',
            thumbnailHook: 'Perfect Sync Duet',
            shareCaption: 'We turned two clips into one performance.',
            callToAction: 'Try your own duet.',
            hashtags: ['#NilaHubDanceDuet', '#AIDance'],
          },
        },
      },
    }).as('mergeJob');

    let statusCalls = 0;
    cy.intercept('GET', '**/api/dance-duet/jobs/664a4f7e0e9f3f7a442211aa/status', (req) => {
      statusCalls += 1;
      if (statusCalls === 1) {
        req.reply({
          statusCode: 200,
          body: {
            success: true,
            pollAfterSeconds: 1,
            data: {
              job: {
                id: '664a4f7e0e9f3f7a442211aa',
                status: 'processing',
                attempts: 1,
                maxAttempts: 2,
                outputUrl: '',
                errorMessage: '',
              },
            },
          },
        });
      } else {
        req.reply({
          statusCode: 200,
          body: {
            success: true,
            pollAfterSeconds: 1,
            data: {
              job: {
                id: '664a4f7e0e9f3f7a442211aa',
                status: 'completed',
                attempts: 1,
                maxAttempts: 2,
                outputUrl: '/uploads/dance-duet/outputs/test-output.mp4',
                errorMessage: '',
                output: { warning: '' },
              },
            },
          },
        });
      }
    }).as('jobStatus');

    cy.visit('/dance-duet?investorPreview=user');

    cy.wait('@jobsMe');
    cy.wait('@analyticsMe');
    cy.wait('@jobCounts');

    cy.get('input[type="file"]').eq(0).selectFile({
      contents: Cypress.Buffer.from('video-1'),
      fileName: 'video1.mp4',
      mimeType: 'video/mp4',
    });
    cy.get('input[type="file"]').eq(1).selectFile({
      contents: Cypress.Buffer.from('video-2'),
      fileName: 'video2.mp4',
      mimeType: 'video/mp4',
    });

    cy.contains('button', 'Create 10/10 Dance Duet').click();
    cy.wait('@mergeJob');
    cy.contains('Dance duet queued', { matchCase: false });

    cy.wait('@jobStatus');
    cy.wait('@jobStatus');

    cy.contains('Your AI dance duet is ready.');
    cy.get('video.dance-duet-result-video').should('exist');
    cy.contains('Creator Growth Pack');
  });
});
