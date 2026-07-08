import { useState, useCallback, useEffect } from "react";
import { astrologyService } from "../../../services/astrologyService";

export const useAstrologyAI = ({ currentUser, selectedSign }) => {
  const [aiQuestion, setAiQuestion] = useState("");
  const [assistantAnswer, setAssistantAnswer] = useState(null);
  const [assistantHistory, setAssistantHistory] = useState([]);
  const [assistantRetryQuestion, setAssistantRetryQuestion] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");

  // Load assistant history from localStorage on mount
  useEffect(() => {
    try {
      const storedHistory = localStorage.getItem("astrologyAssistantHistory");
      if (storedHistory) {
        const parsed = JSON.parse(storedHistory);
        if (Array.isArray(parsed)) {
          setAssistantHistory(parsed.slice(0, 20)); // Keep last 20 items
        }
      }
    } catch (error) {
      console.error("Failed to load assistant history:", error);
    }
  }, []);

  // Save assistant history to localStorage whenever it changes
  useEffect(() => {
    try {
      if (assistantHistory.length > 0) {
        localStorage.setItem("astrologyAssistantHistory", JSON.stringify(assistantHistory));
      }
    } catch (error) {
      console.error("Failed to save assistant history:", error);
    }
  }, [assistantHistory]);

  const handleAskAssistant = useCallback(async () => {
    const trimmedQuestion = String(aiQuestion || "").trim();

    if (!trimmedQuestion) {
      setAiError("Please enter a question.");
      return;
    }

    if (trimmedQuestion.length < 3) {
      setAiError("Question is too short. Please provide more details.");
      return;
    }

    if (!currentUser?.id && !currentUser?.name) {
      setAiError("Please sign in to use AI Astrology assistant.");
      return;
    }

    setAiLoading(true);
    setAiError("");
    setAssistantRetryQuestion("");

    try {
      const response = await astrologyService.askAstrologyAssistant({
        sign: selectedSign,
        question: trimmedQuestion,
      });

      setAssistantAnswer(response);

      // Add to history
      const historyItem = {
        id: `ai-${Date.now()}-${Math.random().toString(36).slice(2)}`,
        question: trimmedQuestion,
        answer: response.answer || "",
        sign: selectedSign,
        timestamp: new Date().toISOString(),
      };

      setAssistantHistory((prev) => [historyItem, ...prev].slice(0, 20));

      // Clear the question input after successful response
      setAiQuestion("");
    } catch (error) {
      setAiError(error.message || "Unable to get answer from AI assistant.");
      setAssistantRetryQuestion(trimmedQuestion);
    } finally {
      setAiLoading(false);
    }
  }, [aiQuestion, selectedSign, currentUser]);

  const handleRetryAssistantQuestion = useCallback(async () => {
    if (!assistantRetryQuestion) return;

    setAiQuestion(assistantRetryQuestion);
    setAssistantRetryQuestion("");

    // Trigger the question with a slight delay to allow state update
    setTimeout(() => {
      handleAskAssistant();
    }, 100);
  }, [assistantRetryQuestion, handleAskAssistant]);

  const handleClearAssistantHistory = useCallback(() => {
    setAssistantHistory([]);
    setAssistantAnswer(null);
    localStorage.removeItem("astrologyAssistantHistory");
  }, []);

  const handleDeleteHistoryItem = useCallback((itemId) => {
    setAssistantHistory((prev) => prev.filter((item) => item.id !== itemId));
  }, []);

  const handleRestoreQuestion = useCallback((question) => {
    setAiQuestion(question);
    setAiError("");
  }, []);

  const handleSuggestedQuestion = useCallback((question) => {
    setAiQuestion(question);
    setAiError("");
    // Auto-submit after setting the question
    setTimeout(() => {
      handleAskAssistant();
    }, 100);
  }, [handleAskAssistant]);

  const clearAiError = useCallback(() => {
    setAiError("");
  }, []);

  return {
    aiQuestion,
    setAiQuestion,
    assistantAnswer,
    setAssistantAnswer,
    assistantHistory,
    assistantRetryQuestion,
    aiLoading,
    aiError,
    handleAskAssistant,
    handleRetryAssistantQuestion,
    handleClearAssistantHistory,
    handleDeleteHistoryItem,
    handleRestoreQuestion,
    handleSuggestedQuestion,
    clearAiError,
  };
};
