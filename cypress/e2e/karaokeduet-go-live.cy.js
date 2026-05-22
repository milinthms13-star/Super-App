describe("KaraokeDuet 360 flow", () => {
  it("creates a room and renders coach + creator pack panels", () => {
    cy.intercept("GET", "**/api/karaoke-duet/analytics/overview", {
      statusCode: 200,
      body: {
        success: true,
        overview: {
          totalRooms: 2,
          activeRooms: 1,
          completedRooms: 1,
          totalMixExports: 3,
          averageBpm: 96,
          recentRooms: [],
        },
      },
    }).as("karaokeAnalytics");

    cy.intercept("GET", "**/api/karaoke-duet/rooms/mine", {
      statusCode: 200,
      body: {
        success: true,
        rooms: [],
      },
    }).as("karaokeRoomsMine");

    cy.intercept("POST", "**/api/karaoke-duet/rooms", {
      statusCode: 201,
      body: {
        success: true,
        message: "Karaoke duet room created.",
        room: {
          roomCode: "KD1234",
          inviteToken: "token-123",
          status: "waiting",
          title: "Weekend Duet Session",
          karaokeTrackUrl: "https://example.com/track.mp3",
          karaokeTrackBpm: 96,
          startedAtMs: null,
          participants: [
            {
              userId: "507f191e810c19729de860ea",
              role: "host",
              displayName: "Host",
            },
          ],
          lyrics: [{ timeSec: 0, text: "Duet starts now..." }],
          settings: {},
          realtimeState: { latestTimecodeMs: 0, beatCount: 0 },
          takes: [],
          mixJobs: [],
          finalOutputs: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        invite: {
          code: "KD1234",
          token: "token-123",
          joinUrl: "https://app.example.com/remote-karaoke-duet?room=KD1234&invite=token-123",
        },
      },
    }).as("createKaraokeRoom");

    cy.intercept("POST", "**/api/karaoke-duet/coach/session-feedback", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          scores: {
            overallScore: 84,
            timingScore: 80,
            collaborationScore: 86,
            completionScore: 82,
            syncScore: 88,
          },
          nextSteps: ["Upload both takes and finalize your mix."],
        },
      },
    }).as("sessionCoach");

    cy.intercept("POST", "**/api/karaoke-duet/coach/creator-pack", {
      statusCode: 200,
      body: {
        success: true,
        data: {
          posterTitles: ["Weekend Duet Session: Performance Locked"],
          shortCaptions: ["Two voices, one final mix."],
          hashtags: ["#KaraokeDuet", "#RemoteSinging", "#MusicCreators"],
          cta: "Tag your duet partner and post your final mix link.",
          theme: {
            name: "Electric Stage",
            fontPair: "Bebas Neue + DM Sans",
            palette: ["#031633", "#0EA5E9", "#F59E0B", "#F8FAFC"],
          },
        },
      },
    }).as("creatorPack");

    cy.visit("/remote-karaoke-duet?investorPreview=user");

    cy.wait("@karaokeAnalytics");
    cy.wait("@karaokeRoomsMine");

    cy.contains("Remote Karaoke Duet").should("exist");
    cy.get('input[placeholder="https://.../karaoke-track.mp3"]').clear().type("https://example.com/track.mp3");
    cy.contains("button", "Create Karaoke Room").click();

    cy.wait("@createKaraokeRoom");
    cy.wait("@sessionCoach");
    cy.wait("@creatorPack");

    cy.contains("Duet Room: KD1234").should("exist");
    cy.contains("Free Duet Coach (Zero Cost)").should("exist");
    cy.contains("Canva Creator Pack (Zero Cost)").should("exist");
    cy.contains("Copy Titles").should("exist");
    cy.contains("Copy Captions").should("exist");
  });
});
