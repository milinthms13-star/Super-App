/**
 * Waveform Visualizer Component
 * Real-time audio waveform display
 */

import React, { useRef, useEffect } from 'react';

const WaveformVisualizer = ({ data, width = 800, height = 120, color = '#667eea' }) => {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;

    // Set canvas size with device pixel ratio
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw waveform
    const sliceWidth = width / data.length;
    const centerY = height / 2;

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    gradient.addColorStop(0, color);
    gradient.addColorStop(0.5, color);
    gradient.addColorStop(1, color + '80');

    ctx.beginPath();
    ctx.strokeStyle = gradient;
    ctx.lineWidth = 2;

    data.forEach((value, index) => {
      const x = index * sliceWidth;
      const normalized = typeof value === 'number' ? value / 255 : value;
      const y = centerY + (normalized - 0.5) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw center line
    ctx.beginPath();
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1;
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
  }, [data, width, height, color]);

  return (
    <div className="kdp-waveform">
      <canvas ref={canvasRef} />
    </div>
  );
};

export default WaveformVisualizer;
