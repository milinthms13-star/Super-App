import { buildApiUrl } from "../../utils/api";
import { buildLocalKidsStory } from "./kidsStoryGeneratorUtils";

const parseJsonSafe = async (response) => {
  const raw = await response.text();
  if (!raw) return {};
  try {
    return JSON.parse(raw);
  } catch (_error) {
    return {};
  }
};

export const generateKidsStoryFromApi = async (payload, { signal } = {}) => {
  const response = await fetch(buildApiUrl("/kids-story/generate-story"), {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload || {}),
    signal,
  });

  const data = await parseJsonSafe(response);
  if (!response.ok || data?.success === false) {
    const message = data?.message || `Story API failed with status ${response.status}.`;
    throw new Error(message);
  }

  if (!data?.story || typeof data.story !== "object") {
    throw new Error("Story API returned an invalid response.");
  }

  return data.story;
};

export const generateKidsStoryWithFallback = async (payload, options = {}) => {
  try {
    return await generateKidsStoryFromApi(payload, options);
  } catch (_error) {
    return buildLocalKidsStory(payload);
  }
};
