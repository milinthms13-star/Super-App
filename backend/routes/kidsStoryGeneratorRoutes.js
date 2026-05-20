const express = require("express");
const {
  buildKidsStoryPrompt,
  fallbackKidsStory,
  sanitizeText,
} = require("../services/kidsStoryGeneratorService");

const router = express.Router();

router.post("/generate-story", async (req, res) => {
  const payload = req.body || {};
  const idea = sanitizeText(payload.idea, 300);

  if (!idea || idea.length < 5) {
    return res.status(400).json({
      success: false,
      message: "Story idea is required and must be at least 5 characters.",
    });
  }

  try {
    // TODO: Plug real provider call here:
    // const prompt = buildKidsStoryPrompt(payload);
    // const aiJson = await callYourProvider(prompt);
    // return res.json({ success: true, story: aiJson, source: "ai" });
    return res.json({
      success: true,
      story: fallbackKidsStory(payload),
      source: "fallback",
      promptForAiProvider: buildKidsStoryPrompt(payload),
      note: "AI provider not connected in this route yet; fallback story returned.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Story generation failed.",
    });
  }
});

module.exports = router;
