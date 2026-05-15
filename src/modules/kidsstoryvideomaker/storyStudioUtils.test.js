import {
  buildSubtitlesFromScenes,
  getSafetyFailure,
  normalizeProjectForLocal,
  normalizeScenesForRender,
  validateScenesForRender,
} from "./storyStudioUtils";

describe("storyStudioUtils", () => {
  test("buildSubtitlesFromScenes uses cumulative durations", () => {
    const subtitles = buildSubtitlesFromScenes([
      { title: "One", description: "A", durationSeconds: 3 },
      { title: "Two", description: "B", durationSeconds: 5 },
    ]);

    expect(subtitles[0]).toEqual({ start: 0, end: 3, text: "One: A" });
    expect(subtitles[1]).toEqual({ start: 3, end: 8, text: "Two: B" });
  });

  test("normalizeScenesForRender sets defaults and bounds", () => {
    const normalized = normalizeScenesForRender([
      { title: "  Scene ", description: "Desc", durationSeconds: 99 },
    ]);

    expect(normalized[0].title).toBe("Scene");
    expect(normalized[0].dialogue).toBe("Narration continues.");
    expect(normalized[0].durationSeconds).toBe(15);
  });

  test("validateScenesForRender rejects missing dialogue", () => {
    const error = validateScenesForRender([
      { title: "A", description: "B", dialogue: "", durationSeconds: 4 },
    ]);

    expect(error).toContain("missing dialogue");
  });

  test("getSafetyFailure returns structured reasons", () => {
    const result = getSafetyFailure("A story with weapon and terror");
    expect(result.blocked).toBe(true);
    expect(result.reasons.length).toBeGreaterThan(0);
  });

  test("normalizeProjectForLocal applies safe defaults", () => {
    const project = normalizeProjectForLocal({
      projectId: "abc",
      title: "  My Story  ",
      scenes: [{ id: 1, title: "S", description: "D", dialogue: "L" }],
    });

    expect(project.projectId).toBe("abc");
    expect(project.title).toBe("My Story");
    expect(project.storyMode).toBe("bedtime");
    expect(project.schemaVersion).toBe(3);
  });
});
