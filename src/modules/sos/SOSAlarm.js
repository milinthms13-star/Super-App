import { useEffect, useRef } from "react";

const SOSAlarm = ({ active, muted = false }) => {
  const audioContextRef = useRef(null);
  const oscillatorsRef = useRef([]);
  const intervalRef = useRef(null);

  useEffect(() => {
    if (!active || muted) {
      // Stop alarm
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      if (oscillatorsRef.current.length > 0) {
        oscillatorsRef.current.forEach((osc) => {
          try {
            osc.stop();
          } catch (e) {
            // Already stopped
          }
        });
        oscillatorsRef.current = [];
      }

      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {
          // Already closed
        }
        audioContextRef.current = null;
      }

      return;
    }

    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) {
      console.warn("Web Audio API not supported");
      return;
    }

    const audioContext = new AudioContext();
    audioContextRef.current = audioContext;

    // Siren: Alternating high-low frequency pattern
    const playSiren = () => {
      const frequencies = [800, 1200]; // Hz
      let freqIndex = 0;

      intervalRef.current = setInterval(() => {
        if (!audioContextRef.current || !active) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
          return;
        }

        // Stop previous oscillators
        oscillatorsRef.current.forEach((osc) => {
          try {
            osc.stop();
          } catch (e) {
            // Already stopped
          }
        });

        // Create new oscillators for the current frequency
        try {
          const freq = frequencies[freqIndex % 2];
          const osc = audioContext.createOscillator();
          const gainNode = audioContext.createGain();

          osc.connect(gainNode);
          gainNode.connect(audioContext.destination);

          osc.frequency.setValueAtTime(freq, audioContext.currentTime);
          gainNode.gain.setValueAtTime(0.3, audioContext.currentTime); // 30% volume

          osc.start();
          oscillatorsRef.current = [osc];
        } catch (e) {
          console.error("Error creating oscillator:", e);
        }

        freqIndex++;
      }, 400); // Switch frequency every 400ms
    };

    playSiren();

    // Vibration pattern on mobile
    if (navigator.vibrate) {
      navigator.vibrate([200, 100, 200, 100, 200, 100]); // Vibrate pattern
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }

      oscillatorsRef.current.forEach((osc) => {
        try {
          osc.stop();
        } catch (e) {
          // Already stopped
        }
      });

      if (audioContextRef.current) {
        try {
          audioContextRef.current.close();
        } catch (e) {
          // Already closed
        }
        audioContextRef.current = null;
      }
    };
  }, [active, muted]);

  return null; // Alarm is audio-only, no UI needed
};

export default SOSAlarm;
