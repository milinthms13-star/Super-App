import { VideoStudioApiError, requestVideoStudio } from "./videoStudioApi";

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
});
