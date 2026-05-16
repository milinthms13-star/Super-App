import { VideoStudioApiError, requestVideoStudio, getProjectDownloadLink, waitForRenderedVideo } from "./videoStudioApi";

const jsonResponse = ({ ok = true, status = 200, payload, url = "http://localhost/api/video-studio/create" }) => ({
  ok,
  status,
  url,
  text: async () => JSON.stringify(payload),
});

describe("videoStudioApi", () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test("parses successful payload", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({ payload: { success: true, project: { projectId: "p1" } } })
    );

    const result = await requestVideoStudio("/video-studio/create", { method: "POST", body: { storyPrompt: "test" } });
    expect(result.payload.success).toBe(true);
    expect(result.payload.project.projectId).toBe("p1");
  });

  test("throws structured safety error", async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        ok: false,
        status: 422,
        payload: {
          success: false,
          code: "SAFETY_FAILED",
          error: "Blocked",
          safety: { context: "story_prompt", reasons: [{ code: "adult", reason: "adult content" }] },
        },
      })
    );

    try {
      await requestVideoStudio("/video-studio/create", { method: "POST", body: { storyPrompt: "bad" } });
      throw new Error("Expected request to fail.");
    } catch (error) {
      expect(error).toBeInstanceOf(VideoStudioApiError);
      expect(error.code).toBe("SAFETY_FAILED");
      expect(error.safety?.context).toBe("story_prompt");
    }
  });

  test("falls back to alternate API origin for network failures", async () => {
    process.env.REACT_APP_API_URL = "https://unreachable.example.com/api";
    process.env.REACT_APP_BACKEND_URL = "https://super-app-api.onrender.com";

    global.fetch = jest
      .fn()
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(
        jsonResponse({
          payload: { success: true, project: { projectId: "p2", title: "x", scenes: [{ title: "s", description: "d", dialogue: "n" }] } },
          url: "https://super-app-api.onrender.com/api/video-studio/create",
        })
      );

    const result = await requestVideoStudio("/video-studio/create", {
      method: "POST",
      body: { storyPrompt: "test" },
      retries: 0,
    });

    expect(result.payload.success).toBe(true);
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });

  test("falls back to project metadata when download endpoint is unavailable", async () => {
    process.env.REACT_APP_API_URL = "https://super-app-api.onrender.com";
    process.env.REACT_APP_BACKEND_URL = "https://super-app-api.onrender.com";

    global.fetch = jest.fn((requestUrl) => {
      if (String(requestUrl || "").includes("/projects/p1/download")) {
        return Promise.resolve(
          jsonResponse({
            ok: false,
            status: 404,
            payload: { success: false, error: "Not Found" },
            url: requestUrl,
          })
        );
      }

      return Promise.resolve(
        jsonResponse({
          payload: {
            success: true,
            project: {
              projectId: "p1",
              videoUrl: "/uploads/video-studio/p1/story-render.mp4",
            },
          },
          url: requestUrl,
        })
      );
    });

    const result = await getProjectDownloadLink("p1", { retries: 0 });
    expect(result.payload.success).toBe(true);
    expect(result.payload.downloadUrl).toBe("/uploads/video-studio/p1/story-render.mp4");
    expect(global.fetch).toHaveBeenCalled();
  });

  test("waits for a newer render url when status returns stale previous video", async () => {
    process.env.REACT_APP_API_URL = "https://super-app-api.onrender.com";
    process.env.REACT_APP_BACKEND_URL = "https://super-app-api.onrender.com";

    global.fetch = jest
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          payload: {
            success: true,
            status: "ready",
            projectId: "p1",
            videoUrl: "https://super-app-api.onrender.com/uploads/video-studio/p1/story-render.mp4?v=1000",
            downloadUrl: "https://super-app-api.onrender.com/uploads/video-studio/p1/story-render.mp4?v=1000",
          },
        })
      )
      .mockResolvedValueOnce(
        jsonResponse({
          payload: {
            success: true,
            status: "ready",
            projectId: "p1",
            videoUrl: "https://super-app-api.onrender.com/uploads/video-studio/p1/story-render.mp4?v=2000",
            downloadUrl: "https://super-app-api.onrender.com/uploads/video-studio/p1/story-render.mp4?v=2000",
          },
        })
      );

    const result = await waitForRenderedVideo("p1", {
      maxAttempts: 2,
      intervalMs: 0,
      timeoutMs: 5000,
      previousVideoUrl: "https://super-app-api.onrender.com/uploads/video-studio/p1/story-render.mp4?v=1000",
    });

    expect(result.payload.videoUrl).toContain("v=2000");
    expect(global.fetch).toHaveBeenCalledTimes(2);
  });
});
