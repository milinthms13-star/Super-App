describe('KidsStoryVideoMaker main flow', () => {
  it('completes create -> edit -> render flow', () => {
    cy.intercept('POST', '**/api/video-studio/create', {
      statusCode: 200,
      body: {
        success: true,
        project: {
          projectId: 'proj-e2e-1',
          title: 'The Rabbit and the Tortoise',
          storyPrompt: 'A rabbit and a tortoise race and learn that steady effort wins.',
          storySource: 'paste',
          language: 'english',
          style: 'cartoon',
          videoSize: 'youtube',
          voiceType: 'kid-female',
          storyMode: 'moral',
          safeMode: true,
          ageFilter: '5-8',
          scenes: [
            {
              id: 1,
              title: 'Opening',
              description: 'Rabbit and tortoise meet in a sunny field.',
              dialogue: 'Let us race!',
              durationSeconds: 4,
              emotion: 'curious',
              cameraActions: 'soft pan',
              weather: 'sunny',
              timeOfDay: 'Morning',
              background: 'Green meadow',
              characters: [],
            },
          ],
        },
      },
    }).as('createProject');

    cy.intercept('POST', '**/api/video-studio/render', {
      statusCode: 200,
      body: {
        success: true,
        projectId: 'proj-e2e-1',
        videoUrl: 'https://example.com/story-render.mp4',
      },
    }).as('renderProject');

    cy.visit('/kids-story-video-maker');
    cy.contains('button', 'Create').click();
    cy.contains('button', 'Generate Story Pipeline').click();

    cy.wait('@createProject');
    cy.contains('button', 'Scenes').click();
    cy.get('#scene-title-1').clear().type('Opening Scene');

    cy.contains('button', 'Export').click();
    cy.contains('button', 'Render MP4').click();

    cy.wait('@renderProject');
    cy.get('video.story-video-player').should('exist');
  });
});
