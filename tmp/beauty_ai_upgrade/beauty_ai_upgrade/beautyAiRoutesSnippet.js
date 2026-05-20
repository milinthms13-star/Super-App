// Add to backend/routes/beautyAiRoutes.js or your existing beauty route file
const express = require("express");
const router = express.Router();
const { buildBeautyPrompt, validateBeautyPayload } = require("../services/beautyAiBackendHelpers");

router.post("/plan", async (req, res) => {
  const validation = validateBeautyPayload(req.body);
  if (!validation.ok) return res.status(400).json({ errors: validation.errors });

  const prompt = buildBeautyPrompt(req.body);

  // TODO: connect Gemini/OpenAI here. Until then return safe fallback-friendly response.
  return res.json({
    prompt,
    plan: null,
    fallback: true,
    message: "AI key not configured. Frontend fallback plan can be used.",
  });
});

module.exports = router;
