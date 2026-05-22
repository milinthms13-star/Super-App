import {
  createCreatorPackShareText,
  parseTimedLyrics,
  summarizeDuetReadiness,
} from "./karaokeDuetUpgradeUtils";

describe("karaokeDuetUpgradeUtils", () => {
  test("parseTimedLyrics parses valid lyric script lines", () => {
    const parsed = parseTimedLyrics("0|Start now\n4.5|Sing together\nx|invalid");
    expect(parsed).toHaveLength(2);
    expect(parsed[0]).toEqual({ timeSec: 0, text: "Start now" });
    expect(parsed[1]).toEqual({ timeSec: 4.5, text: "Sing together" });
  });

  test("summarizeDuetReadiness returns high score for complete setup", () => {
    const summary = summarizeDuetReadiness({
      hasTrack: true,
      hasHostTake: true,
      hasGuestTake: true,
      hasPeer: true,
      finalOutputCount: 1,
    });

    expect(summary.score).toBe(100);
    expect(summary.label).toBe("Stage-ready");
  });

  test("summarizeDuetReadiness returns low score for incomplete setup", () => {
    const summary = summarizeDuetReadiness({
      hasTrack: true,
      hasHostTake: false,
      hasGuestTake: false,
      hasPeer: false,
      finalOutputCount: 0,
    });

    expect(summary.score).toBeLessThan(60);
    expect(summary.label).toBe("Warm-up needed");
  });

  test("createCreatorPackShareText builds social text with fallback hashtags", () => {
    const text = createCreatorPackShareText({
      title: "Friday Duet Night",
      roomCode: "ABCD12",
      captions: ["Harmony mode on"],
      hashtags: ["#DuetDrop"],
    });

    expect(text).toContain("Friday Duet Night");
    expect(text).toContain("Room: ABCD12");
    expect(text).toContain("Harmony mode on");
    expect(text).toContain("#DuetDrop");
    expect(text).toContain("#KaraokeDuet");
  });
});
