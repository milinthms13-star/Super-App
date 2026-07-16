const express = require("express");
const {
  buildKidsStoryPrompt,
  fallbackKidsStory,
  sanitizeText,
} = require("../services/kidsStoryGeneratorService");
const { 
  getTTSStatus, 
  testTTSConnection 
} = require("../services/googleTTSCredentialLoader");

const router = express.Router();

// Free AI story generation using HuggingFace (already configured in .env)
const HF_API_KEY = process.env.HUGGINGFACE_API_KEY || '';
const HF_BASE_URL = process.env.HUGGINGFACE_API_BASE_URL || 'https://api-inference.huggingface.co/models';
const FREE_TEXT_MODEL = process.env.FREE_TEXT_MODEL || 'mistralai/Mixtral-8x7B-Instruct-v0.1';

async function callFreeAI(prompt, systemInstruction = '') {
  if (!HF_API_KEY) {
    return null; // Fall back to template stories
  }

  try {
    const messages = [];
    if (systemInstruction) {
      messages.push({ role: 'system', content: systemInstruction });
    }
    messages.push({ role: 'user', content: prompt });

    const response = await fetch(`${HF_BASE_URL}/${FREE_TEXT_MODEL}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${HF_API_KEY}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: prompt,
        parameters: {
          max_new_tokens: 800,
          temperature: 0.7,
          top_p: 0.9,
          return_full_text: false
        }
      })
    });

    if (!response.ok) {
      console.warn('HuggingFace API error:', response.status);
      return null;
    }

    const result = await response.json();
    if (Array.isArray(result) && result[0]?.generated_text) {
      return result[0].generated_text;
    }
    
    return null;
  } catch (error) {
    console.warn('Free AI call failed:', error.message);
    return null;
  }
}

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
    const prompt = buildKidsStoryPrompt(payload);
    
    // Try FREE HuggingFace AI first (1M tokens/month free)
    const aiResponse = await callFreeAI(
      prompt,
      'You are a creative children\'s story writer. Generate kid-friendly, educational stories.'
    );

    if (aiResponse) {
      // Parse AI response and return
      let story;
      try {
        // Try to parse as JSON first
        story = JSON.parse(aiResponse);
      } catch {
        // If not JSON, treat as plain text story
        story = {
          title: `Story: ${idea.slice(0, 50)}`,
          content: aiResponse,
          characters: [],
          moral: 'Kindness and courage help us grow.'
        };
      }

      return res.json({
        success: true,
        story: story,
        source: "huggingface-free-ai",
        provider: "HuggingFace Inference API (Free Tier)",
        note: "Generated using free HuggingFace AI"
      });
    }

    // Fallback to template-based story if AI unavailable
    return res.json({
      success: true,
      story: fallbackKidsStory(payload),
      source: "fallback-template",
      note: "Using template-based story (AI unavailable). Configure HUGGINGFACE_API_KEY for AI generation.",
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: error?.message || "Story generation failed.",
    });
  }
});

// Get TTS status endpoint
router.get("/tts-status", (req, res) => {
  const status = getTTSStatus();
  
  res.json({
    success: true,
    tts: {
      enabled: status.enabled,
      fallbackMode: status.fallbackMode,
      configuration: {
        environmentVariable: status.environmentVariable,
        credentialsJson: status.credentialsJson,
        configFile: status.configFileExists
      },
      message: status.enabled 
        ? "✅ Google Cloud TTS is configured and ready"
        : "ℹ️  Using silent audio fallback. To enable spoken dialogue, see: backend/GOOGLE_TTS_SETUP_GUIDE.md",
      freeTier: "1,000,000 characters per month",
      setupGuide: "/backend/GOOGLE_TTS_SETUP_GUIDE.md"
    }
  });
});

// Test TTS connection endpoint
router.post("/test-tts", async (req, res) => {
  try {
    const result = await testTTSConnection();
    
    res.json({
      success: result.success,
      tts: result,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      error: error.message,
      suggestion: "Check credentials and API enablement in Google Cloud Console"
    });
  }
});

module.exports = router;
