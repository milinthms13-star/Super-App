# NilaAI Hub User Manual (Front-End)

> Module: `src/modules/nilaaihub/NilaAIHub.js`

## 1) What this module does
**NilaAI Hub** provides an AI-powered hub/experience in the app. It typically allows users to:
- Access AI features (chat / guidance / tools / workflows—depending on your configuration)
- Send prompts or requests to the AI
- View and refine AI responses
- Use follow-up prompts to improve the result
- Save/continue/export the interaction (if supported by your UI/backend)

## 2) Entry point
1. Login.
2. Open **NilaAI Hub** from the app navigation/menu.
3. You land on the **AI home/dashboard** or the AI chat/results screen.

## 3) Main screen layout (what you see)

### 3.1 AI feature area (if present)
- Feature/workflow selector (for example: different AI modes or tools)

### 3.2 Prompt input
- A text input area for your request/prompt
- A **Send / Submit** button

### 3.3 Response/results panel
- AI response output (often shown as chat messages or a results panel)
- Possible loading indicator while the AI is generating

### 3.4 Interaction history (if present)
- A list of previous interactions or threads
- May support selecting an earlier conversation context

## 4) Step-by-step user flows

### 4.1 Start an AI interaction
1. Open **NilaAI Hub**.
2. (Optional) Select an AI feature/workflow if your hub shows multiple options.
3. In the prompt box, describe what you want.
4. Click **Send / Submit**.

Expected result:
- The AI response appears in the response/results panel.

### 4.2 Refine / ask follow-up
1. Read the AI response.
2. In the prompt input, add follow-up instructions, for example:
   - “Summarize this in 5 bullet points.”
   - “Translate to Hindi.”
   - “Give me step-by-step instructions.”
   - “Make it shorter and more actionable.”
3. Click **Send / Submit** again.

Expected result:
- The updated response appears as a follow-up message/thread.

### 4.3 Use Save / Continue / Export (if supported)
1. Look for buttons like **Save**, **Continue**, **Export**, or similar actions.
2. Use them based on your current goal:
   - Save the interaction for later (if history is enabled)
   - Export results (e.g., copy/export feature—depends on your app implementation)

Expected result:
- The interaction/result is preserved according to the selected action.

## 5) Prompting best practices (quick examples)
To get better results, you can include:
- Your goal (what outcome you want)
- Context (what the AI should assume)
- Constraints (length, tone, format)
- Output format (bullets, steps, table, checklist, etc.)

Example prompts:
- “Create a daily study plan for the next 14 days for a beginner. Output as a table.”
- “Draft a polite email requesting an appointment. Keep it under 120 words.”
- “Act as a product reviewer. Critique the following content and suggest improvements.”

## 6) Troubleshooting (UI-level)

### 6.1 AI response not generated
- Verify you’re logged in.
- Check your internet connectivity.
- Refresh the page and retry.
- If the issue persists, wait a few minutes and try again (AI calls can be temporarily delayed).

### 6.2 Slow responses
- Large prompts or complex workflows may take longer.
- Stay on the screen until the response finishes; then refine using follow-ups.

### 6.3 Unexpected or low-quality response
- Add more detail in your prompt (goal + context + desired format).
- Use follow-up prompts to correct direction (tone/length/structure).

## 7) UI sections reference
- AI feature selector (if present)
- Prompt input + Send/Submit button
- Loading indicator (while generating)
- Response/results panel
- Interaction history (if present)
- Optional Save/Continue/Export controls (if supported)
