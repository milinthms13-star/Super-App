
/**
 * Example Express route patch.
 * In your backend route for POST /api/video-studio/render, replace the old slide renderer with:
 */

const express = require("express");
const { renderRealCartoonProject } = require("./videoStudioRealCartoonRenderer");

const router = express.Router();

router.post("/video-studio/render", async (req, res) => {
  try {
    const project = req.body?.project;
    if (!project) {
      return res.status(400).json({ success: false, error: "Missing project." });
    }

    // Important: do not allow text-only slide output anymore.
    if (project.renderMode !== "real-cartoon") {
      return res.status(422).json({
        success: false,
        error: "Render mode must be real-cartoon. Frontend must send characters, spokenLines, visualPrompt, and audioPlan.",
      });
    }

    const result = await renderRealCartoonProject(project);
    res.json(result);
  } catch (error) {
    console.error("Cartoon render failed:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Cartoon render failed.",
    });
  }
});

module.exports = router;
