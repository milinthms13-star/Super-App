import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import "../../i18n";
import KidsStoryVideoMaker from "./KidsStoryVideoMaker";

const okResponse = (payload, url = "http://localhost/api/video-studio/create") => ({
  ok: true,
  status: 200,
  url,
  text: async () => JSON.stringify(payload),
});

describe("KidsStoryVideoMaker smoke", () => {
  beforeEach(() => {
    localStorage.clear();
    global.fetch = jest.fn().mockResolvedValue(
      okResponse({
        success: true,
        project: {
          projectId: "proj-1",
          title: "Demo Story",
          storyPrompt: "A friendly story about teamwork and courage for children.",
          storySource: "paste",
          language: "english",
          style: "cartoon",
          videoSize: "youtube",
          voiceType: "kid-female",
          storyMode: "bedtime",
          safeMode: true,
          ageFilter: "5-8",
          scenes: [
            {
              id: 1,
              title: "Start",
              description: "Friends begin their quest.",
              dialogue: "Let us help each other.",
              durationSeconds: 4,
            },
          ],
        },
      })
    );
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  test("completes create -> scenes flow", async () => {
    render(<KidsStoryVideoMaker />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Story Pipeline" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Scenes" })).toBeInTheDocument();
    });
  });
});
