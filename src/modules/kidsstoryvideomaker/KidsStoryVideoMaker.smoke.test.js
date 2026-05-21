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
    global.fetch = jest.fn((requestUrl) => {
      const url = String(requestUrl || "");
      if (url.includes("/api/kids-video-hf/capabilities")) {
        return Promise.resolve(
          okResponse(
            {
              success: true,
              capabilities: {
                hybridMotionAvailable: true,
                hybridPhase2Available: true,
                reasons: [],
              },
            },
            "http://localhost/api/kids-video-hf/capabilities"
          )
        );
      }

      return Promise.resolve(
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

  test("renders and downloads a generated video in Export tab", async () => {
    const createResponse = okResponse(
      {
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
      },
      "http://localhost/api/video-studio/create"
    );

    const jobCreateResponse = okResponse(
      {
        success: true,
        jobId: "job-1",
        progress: 8,
      },
      "http://localhost/api/kids-video-hf/jobs"
    );

    const jobStatusResponse = okResponse(
      {
        success: true,
        status: "completed",
        progress: 100,
        message: "Render complete.",
        result: {
          videoUrl: "http://localhost/videos/story.mp4",
          project: {
            projectId: "proj-1",
          },
        },
      },
      "http://localhost/api/kids-video-hf/jobs/job-1"
    );

    const downloadResponse = okResponse(
      {
        success: true,
        downloadUrl: "http://localhost/videos/story.mp4",
        videoUrl: "http://localhost/videos/story.mp4",
      },
      "http://localhost/api/video-studio/projects/proj-1/download"
    );

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        okResponse(
          {
            success: true,
            capabilities: {
              hybridMotionAvailable: true,
              hybridPhase2Available: true,
              reasons: [],
            },
          },
          "http://localhost/api/kids-video-hf/capabilities"
        )
      )
      .mockResolvedValueOnce(createResponse)
      .mockResolvedValueOnce(jobCreateResponse)
      .mockResolvedValueOnce(jobStatusResponse)
      .mockResolvedValueOnce(downloadResponse);

    const clickSpy = jest.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<KidsStoryVideoMaker />);

    fireEvent.click(screen.getByRole("button", { name: "Create" }));
    fireEvent.click(screen.getByRole("button", { name: "Generate Story Pipeline" }));

    await waitFor(() => {
      expect(screen.getByRole("heading", { name: "Scenes" })).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Export" }));

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Render MP4" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Render MP4" }));

    await waitFor(() => {
      expect(
        screen.getByText(
          /Video rendered successfully\.( Preview and export your MP4\.| AI providers are disabled, so quality may use fallback visuals\/audio\.| Scene pipeline completed with regenerated scenes and AI visuals\.| Render completed using fallback visuals\.)/i
        )
      ).toBeInTheDocument();
      expect(screen.getByRole("button", { name: "Download MP4" })).toBeEnabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Download MP4" }));

    await waitFor(() => {
      expect(clickSpy).toHaveBeenCalled();
      expect(screen.getByText(/Download started\. Your MP4 is ready\./i)).toBeInTheDocument();
    });

    clickSpy.mockRestore();
  });
});
