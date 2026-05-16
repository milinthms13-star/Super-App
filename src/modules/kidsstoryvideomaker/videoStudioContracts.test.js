import { assertProjectShape, assertRenderResponse, normalizeProject } from "./videoStudioContracts";

describe("videoStudioContracts", () => {
  test("normalizes project scenes", () => {
    const normalized = normalizeProject({
      projectId: "p1",
      title: "Story",
      scenes: [{ title: "S1", description: "D1", dialogue: "L1", durationSeconds: 99 }],
    });

    expect(normalized.scenes[0].durationSeconds).toBe(15);
    expect(normalized.scenes[0].dialogue).toBe("L1");
  });

  test("assertProjectShape rejects invalid projects", () => {
    expect(() => assertProjectShape({ projectId: "", scenes: [] })).toThrow();
  });

  test("assertRenderResponse requires videoUrl", () => {
    expect(() => assertRenderResponse({ success: true })).toThrow("videoUrl");
  });
});
