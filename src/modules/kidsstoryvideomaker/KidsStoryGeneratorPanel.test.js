import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import KidsStoryGeneratorPanel from "./KidsStoryGeneratorPanel";

jest.mock("./kidsStoryGeneratorService", () => ({
  generateKidsStoryWithFallback: jest.fn(),
}));

const { generateKidsStoryWithFallback } = require("./kidsStoryGeneratorService");

describe("KidsStoryGeneratorPanel", () => {
  test("generates story and supports convert-to-video callback", async () => {
    const onConvertToVideo = jest.fn();
    generateKidsStoryWithFallback.mockResolvedValue({
      title: "Kids Story: Sharing Mangoes",
      storyText: "A kind rabbit shared mangoes with friends.",
      moral: "Moral: Sharing brings happiness.",
      vocabulary: [{ word: "Kindness", meaning: "Helping others with love" }],
      quiz: ["Who shared mangoes?"],
      scenes: [{ sceneNo: 1, visualPrompt: "Rabbit in a bright village" }],
    });

    render(<KidsStoryGeneratorPanel onConvertToVideo={onConvertToVideo} />);

    fireEvent.change(screen.getByPlaceholderText(/rabbit learns to share mangoes/i), {
      target: { value: "A rabbit learns to share mangoes with friends" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Generate Story" }));

    await waitFor(() => {
      expect(screen.getByDisplayValue("Kids Story: Sharing Mangoes")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole("button", { name: "Convert to Video" }));
    expect(onConvertToVideo).toHaveBeenCalledTimes(1);
    expect(onConvertToVideo.mock.calls[0][0]).toMatchObject({
      title: "Kids Story: Sharing Mangoes",
      storyText: "A kind rabbit shared mangoes with friends.",
    });
  });
});
