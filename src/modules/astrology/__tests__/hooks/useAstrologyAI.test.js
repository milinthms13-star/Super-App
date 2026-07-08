import { renderHook, act } from '@testing-library/react';
import { useAstrologyAI } from '../../hooks/useAstrologyAI';
import { astrologyService } from '../../../../services/astrologyService';

jest.mock('../../../../services/astrologyService');

describe('useAstrologyAI', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
  });

  it('should initialize with empty conversation history', () => {
    const { result } = renderHook(() => useAstrologyAI());

    expect(result.current.conversationHistory).toEqual([]);
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBe('');
  });

  it('should load conversation history from localStorage', () => {
    const mockHistory = [
      { role: 'user', content: 'Test question', timestamp: Date.now() },
      { role: 'assistant', content: 'Test answer', timestamp: Date.now() },
    ];

    localStorage.setItem('astrology_ai_history', JSON.stringify(mockHistory));

    const { result } = renderHook(() => useAstrologyAI());

    expect(result.current.conversationHistory).toEqual(mockHistory);
  });

  it('should ask question and update conversation history', async () => {
    const mockResponse = {
      answer: 'This is the answer',
      tips: ['Tip 1', 'Tip 2'],
    };

    astrologyService.askAstrologyAssistant = jest.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAstrologyAI());

    await act(async () => {
      await result.current.askQuestion('What is my fortune?', 'aries');
    });

    expect(result.current.conversationHistory).toHaveLength(2);
    expect(result.current.conversationHistory[0].role).toBe('user');
    expect(result.current.conversationHistory[0].content).toBe('What is my fortune?');
    expect(result.current.conversationHistory[1].role).toBe('assistant');
    expect(result.current.conversationHistory[1].content).toContain('This is the answer');
  });

  it('should handle error when asking question', async () => {
    astrologyService.askAstrologyAssistant = jest.fn().mockRejectedValue(
      new Error('API Error')
    );

    const { result } = renderHook(() => useAstrologyAI());

    await act(async () => {
      await result.current.askQuestion('What is my fortune?', 'aries');
    });

    expect(result.current.error).toBe('API Error');
  });

  it('should clear conversation history', () => {
    const { result } = renderHook(() => useAstrologyAI());

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.conversationHistory).toEqual([]);
    expect(localStorage.getItem('astrology_ai_history')).toBeNull();
  });

  it('should persist conversation history to localStorage', async () => {
    const mockResponse = {
      answer: 'Answer',
      tips: ['Tip'],
    };

    astrologyService.askAstrologyAssistant = jest.fn().mockResolvedValue(mockResponse);

    const { result } = renderHook(() => useAstrologyAI());

    await act(async () => {
      await result.current.askQuestion('Question?', 'leo');
    });

    const storedHistory = JSON.parse(localStorage.getItem('astrology_ai_history'));
    expect(storedHistory).toHaveLength(2);
  });
});
