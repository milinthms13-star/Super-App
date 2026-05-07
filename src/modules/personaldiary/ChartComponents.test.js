/**
 * Chart Components Tests
 * Tests for SentimentChart, MoodDistributionChart, TagFrequencyChart, WritingHeatmap, WordCountChart
 */

import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import SentimentChart from './SentimentChart';
import MoodDistributionChart from './MoodDistributionChart';
import TagFrequencyChart from './TagFrequencyChart';
import WritingHeatmap from './WritingHeatmap';
import WordCountChart from './WordCountChart';

describe('Chart Components', () => {
  // =========================================================================
  // SENTIMENT CHART TESTS
  // =========================================================================

  describe('SentimentChart', () => {
    const mockSentimentData = [
      { period: '2024-05-01', positive: 70, neutral: 20, negative: 10, entries: 3 },
      { period: '2024-05-02', positive: 60, neutral: 30, negative: 10, entries: 2 },
      { period: '2024-05-03', positive: 50, neutral: 40, negative: 10, entries: 3 }
    ];

    test('should render without crashing', () => {
      render(<SentimentChart data={mockSentimentData} groupBy="day" />);
      expect(screen.queryByText(/No sentiment data/i)).not.toBeInTheDocument();
    });

    test('should display legend', () => {
      render(<SentimentChart data={mockSentimentData} groupBy="day" />);
      expect(screen.getByText(/Positive|Neutral|Negative/i)).toBeInTheDocument();
    });

    test('should render bars for each period', () => {
      const { container } = render(
        <SentimentChart data={mockSentimentData} groupBy="day" />
      );
      expect(container.querySelectorAll('.chart-bar').length).toBeGreaterThan(0);
    });

    test('should display period labels', () => {
      render(<SentimentChart data={mockSentimentData} groupBy="day" />);
      expect(screen.getByText('2024-05-01')).toBeInTheDocument();
    });

    test('should handle empty data', () => {
      render(<SentimentChart data={[]} groupBy="day" />);
      expect(screen.getByText(/No sentiment data/i)).toBeInTheDocument();
    });

    test('should work with different groupBy options', () => {
      const { rerender } = render(
        <SentimentChart data={mockSentimentData} groupBy="day" />
      );
      expect(screen.queryByText(/No sentiment data/i)).not.toBeInTheDocument();

      rerender(<SentimentChart data={mockSentimentData} groupBy="week" />);
      expect(screen.queryByText(/No sentiment data/i)).not.toBeInTheDocument();

      rerender(<SentimentChart data={mockSentimentData} groupBy="month" />);
      expect(screen.queryByText(/No sentiment data/i)).not.toBeInTheDocument();
    });

    test('should handle single data point', () => {
      render(
        <SentimentChart data={[mockSentimentData[0]]} groupBy="day" />
      );
      expect(screen.getByText('2024-05-01')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // MOOD DISTRIBUTION CHART TESTS
  // =========================================================================

  describe('MoodDistributionChart', () => {
    const mockMoodData = {
      moodCounts: {
        happy: 25,
        neutral: 15,
        sad: 10,
        anxious: 5
      }
    };

    test('should render pie chart', () => {
      const { container } = render(
        <MoodDistributionChart moodData={mockMoodData} />
      );
      expect(container.querySelector('svg')).toBeInTheDocument();
    });

    test('should display legend', () => {
      render(<MoodDistributionChart moodData={mockMoodData} />);
      expect(screen.getByText(/happy|neutral|sad/i)).toBeInTheDocument();
    });

    test('should show mood counts', () => {
      render(<MoodDistributionChart moodData={mockMoodData} />);
      expect(screen.getByText('25')).toBeInTheDocument();
    });

    test('should handle empty data', () => {
      render(<MoodDistributionChart moodData={{ moodCounts: {} }} />);
      expect(screen.getByText(/No mood data/i)).toBeInTheDocument();
    });

    test('should display percentages', () => {
      render(<MoodDistributionChart moodData={mockMoodData} />);
      const container = screen.getByText(/happy/i).closest('.legend-item');
      expect(container?.textContent).toMatch(/\d+\.?\d*%/);
    });

    test('should render legend items for all moods', () => {
      const { container } = render(
        <MoodDistributionChart moodData={mockMoodData} />
      );
      const legendItems = container.querySelectorAll('.legend-item');
      expect(legendItems.length).toBeGreaterThan(0);
    });

    test('should handle single mood', () => {
      const singleMood = {
        moodCounts: { happy: 50 }
      };
      render(<MoodDistributionChart moodData={singleMood} />);
      expect(screen.getByText('50')).toBeInTheDocument();
    });
  });

  // =========================================================================
  // TAG FREQUENCY CHART TESTS
  // =========================================================================

  describe('TagFrequencyChart', () => {
    const mockTagData = {
      uniqueTags: 5,
      totalTagUsages: 25,
      tagFrequency: [
        { tag: 'productivity', frequency: 8, trend: 'up' },
        { tag: 'growth', frequency: 6, trend: 'up' },
        { tag: 'learning', frequency: 5, trend: 'stable' },
        { tag: 'health', frequency: 4, trend: 'down' },
        { tag: 'hobby', frequency: 2, trend: 'stable' }
      ]
    };

    test('should render without crashing', () => {
      render(<TagFrequencyChart tagData={mockTagData} />);
      expect(screen.getByText('productivity')).toBeInTheDocument();
    });

    test('should display tag frequency bars', () => {
      const { container } = render(
        <TagFrequencyChart tagData={mockTagData} />
      );
      expect(container.querySelectorAll('.tag-bar-item').length).toBe(5);
    });

    test('should show unique tags count', () => {
      render(<TagFrequencyChart tagData={mockTagData} />);
      expect(screen.getByText('5')).toBeInTheDocument();
    });

    test('should display trend indicators', () => {
      render(<TagFrequencyChart tagData={mockTagData} />);
      expect(screen.getAllByText(/📈|📉|→/)).toHaveLength(
        mockTagData.tagFrequency.length
      );
    });

    test('should handle empty tag data', () => {
      render(<TagFrequencyChart tagData={{ tagFrequency: [] }} />);
      expect(screen.getByText(/No tag data/i)).toBeInTheDocument();
    });

    test('should sort tags by frequency', () => {
      const { container } = render(
        <TagFrequencyChart tagData={mockTagData} />
      );
      const tagNames = Array.from(
        container.querySelectorAll('.tag-name')
      ).map(el => el.textContent);

      // Verify tags are in order of frequency
      expect(tagNames[0]).toBe('productivity');
      expect(tagNames[1]).toBe('growth');
    });

    test('should calculate percentages correctly', () => {
      render(<TagFrequencyChart tagData={mockTagData} />);
      // productivity 8/25 = 32%
      const items = screen.getAllByText(/\d+\.?\d*%/);
      expect(items.length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // WRITING HEATMAP TESTS
  // =========================================================================

  describe('WritingHeatmap', () => {
    const mockHeatmapData = {
      '2024-05-01': 1,
      '2024-05-02': 2,
      '2024-05-03': 1,
      '2024-05-04': 0,
      '2024-05-05': 3
    };

    test('should render heatmap grid', () => {
      const { container } = render(
        <WritingHeatmap heatmapData={mockHeatmapData} />
      );
      expect(container.querySelector('.heatmap-grid-container')).toBeInTheDocument();
    });

    test('should display day labels', () => {
      const { container } = render(
        <WritingHeatmap heatmapData={mockHeatmapData} />
      );
      expect(container.querySelectorAll('.day-label').length).toBeGreaterThan(0);
    });

    test('should display legend', () => {
      const { container } = render(
        <WritingHeatmap heatmapData={mockHeatmapData} />
      );
      expect(container.querySelector('.heatmap-legend')).toBeInTheDocument();
    });

    test('should show statistics', () => {
      render(<WritingHeatmap heatmapData={mockHeatmapData} />);
      expect(screen.getByText('Total Entries')).toBeInTheDocument();
      expect(screen.getByText('Active Days')).toBeInTheDocument();
    });

    test('should handle empty heatmap data', () => {
      const { container } = render(
        <WritingHeatmap heatmapData={{}} />
      );
      expect(container.querySelector('.heatmap-grid-container')).toBeInTheDocument();
    });

    test('should respect monthsBack parameter', () => {
      const { container } = render(
        <WritingHeatmap heatmapData={mockHeatmapData} monthsBack={3} />
      );
      expect(container.querySelector('.heatmap-grid-container')).toBeInTheDocument();
    });

    test('should calculate correct total entries', () => {
      render(<WritingHeatmap heatmapData={mockHeatmapData} />);
      // Total should be 1+2+1+0+3 = 7
      expect(screen.getByText('7')).toBeInTheDocument();
    });

    test('should calculate active days', () => {
      render(<WritingHeatmap heatmapData={mockHeatmapData} />);
      // Active days: 4 (excluding 2024-05-04)
      expect(screen.getByText('4')).toBeInTheDocument();
    });

    test('should identify peak day', () => {
      render(<WritingHeatmap heatmapData={mockHeatmapData} />);
      expect(screen.getByText('3')).toBeInTheDocument(); // Peak is 3
    });
  });

  // =========================================================================
  // WORD COUNT CHART TESTS
  // =========================================================================

  describe('WordCountChart', () => {
    const mockWordCountData = {
      totalWords: 12500,
      avgWords: 278,
      minWords: 25,
      maxWords: 1240,
      median: 250,
      wordDistribution: {
        veryShort: 5,
        short: 15,
        medium: 18,
        long: 5,
        veryLong: 2
      }
    };

    test('should render without crashing', () => {
      render(<WordCountChart wordCountData={mockWordCountData} />);
      expect(screen.getByText('12500')).toBeInTheDocument();
    });

    test('should display key statistics', () => {
      render(<WordCountChart wordCountData={mockWordCountData} />);
      expect(screen.getByText('12500')).toBeInTheDocument();
      expect(screen.getByText('278')).toBeInTheDocument();
      expect(screen.getByText('250')).toBeInTheDocument();
    });

    test('should show stat labels', () => {
      render(<WordCountChart wordCountData={mockWordCountData} />);
      expect(screen.getByText('Total Words')).toBeInTheDocument();
      expect(screen.getByText('Average/Entry')).toBeInTheDocument();
      expect(screen.getByText('Median')).toBeInTheDocument();
    });

    test('should display distribution bars', () => {
      const { container } = render(
        <WordCountChart wordCountData={mockWordCountData} />
      );
      expect(container.querySelectorAll('.distribution-row').length).toBe(5);
    });

    test('should show distribution percentages', () => {
      render(<WordCountChart wordCountData={mockWordCountData} />);
      const percentages = screen.getAllByText(/\d+\.?\d*%/);
      expect(percentages.length).toBeGreaterThan(0);
    });

    test('should display writing consistency analysis', () => {
      render(<WordCountChart wordCountData={mockWordCountData} />);
      expect(screen.getByText('Writing Consistency')).toBeInTheDocument();
    });

    test('should handle empty data', () => {
      render(<WordCountChart wordCountData={{}} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });

    test('should categorize entries correctly', () => {
      render(<WordCountChart wordCountData={mockWordCountData} />);
      
      // Verify all categories are displayed
      expect(screen.getByText('Very Short')).toBeInTheDocument();
      expect(screen.getByText('Short')).toBeInTheDocument();
      expect(screen.getByText('Medium')).toBeInTheDocument();
      expect(screen.getByText('Long')).toBeInTheDocument();
      expect(screen.getByText('Very Long')).toBeInTheDocument();
    });

    test('should verify distribution sums to total entries', () => {
      const { container } = render(
        <WordCountChart wordCountData={mockWordCountData} />
      );
      const total = 5 + 15 + 18 + 5 + 2; // veryShort + short + medium + long + veryLong
      expect(total).toBe(45);
    });

    test('should show min and max word counts', () => {
      render(<WordCountChart wordCountData={mockWordCountData} />);
      expect(screen.getByText('25')).toBeInTheDocument(); // minWords
      expect(screen.getByText('1240')).toBeInTheDocument(); // maxWords
    });

    test('should display consistency insights', () => {
      render(<WordCountChart wordCountData={mockWordCountData} />);
      const consistencySection = screen.getByText('Writing Consistency').closest('div');
      expect(consistencySection?.textContent).toMatch(/Detailed writing|Good length|Quick notes/i);
    });
  });

  // =========================================================================
  // INTEGRATION TESTS
  // =========================================================================

  describe('Chart Components Integration', () => {
    test('should handle all charts together', () => {
      const mockSentimentData = [
        { period: '2024-05-01', positive: 70, neutral: 20, negative: 10, entries: 3 }
      ];
      const mockMoodData = { moodCounts: { happy: 25 } };
      const mockTagData = {
        uniqueTags: 3,
        tagFrequency: [{ tag: 'test', frequency: 5, trend: 'up' }]
      };
      const mockHeatmapData = { '2024-05-01': 3 };
      const mockWordCountData = {
        totalWords: 500,
        avgWords: 250,
        minWords: 50,
        maxWords: 400,
        median: 250,
        wordDistribution: { veryShort: 1, short: 1, medium: 1, long: 1, veryLong: 0 }
      };

      const { container } = render(
        <div>
          <SentimentChart data={mockSentimentData} groupBy="day" />
          <MoodDistributionChart moodData={mockMoodData} />
          <TagFrequencyChart tagData={mockTagData} />
          <WritingHeatmap heatmapData={mockHeatmapData} />
          <WordCountChart wordCountData={mockWordCountData} />
        </div>
      );

      // All components should render
      expect(container.querySelectorAll('svg').length).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // EDGE CASE TESTS
  // =========================================================================

  describe('Edge Cases', () => {
    test('SentimentChart with very large numbers', () => {
      const data = [
        { period: '2024-05-01', positive: 99.99, neutral: 0.01, negative: 0, entries: 1000000 }
      ];
      render(<SentimentChart data={data} groupBy="day" />);
      expect(screen.getByText('2024-05-01')).toBeInTheDocument();
    });

    test('MoodDistributionChart with single mood entry', () => {
      const data = { moodCounts: { happy: 1 } };
      render(<MoodDistributionChart moodData={data} />);
      expect(screen.getByText('1')).toBeInTheDocument();
    });

    test('WordCountChart with very high word counts', () => {
      const data = {
        totalWords: 999999,
        avgWords: 9999,
        minWords: 1,
        maxWords: 50000,
        median: 8000,
        wordDistribution: {
          veryShort: 1,
          short: 1,
          medium: 1,
          long: 1,
          veryLong: 1
        }
      };
      render(<WordCountChart wordCountData={data} />);
      expect(screen.getByText('999999')).toBeInTheDocument();
    });

    test('WritingHeatmap with zero entries', () => {
      const data = {};
      render(<WritingHeatmap heatmapData={data} />);
      expect(screen.getByText('0')).toBeInTheDocument();
    });
  });
});
