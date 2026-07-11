import { useAudioData, visualizeAudio } from '@remotion/media-utils';
import { useCurrentFrame, useVideoConfig, staticFile } from 'remotion';

/** A soft, low-frequency "pulse" (0..1) derived from the actual selected
 * score's bass content — used to give a few gold-accent elements (title
 * rule, particle brightness, end-card glow) a gentle breathing sync with
 * whichever track select-score.mjs picked for this render, instead of
 * everything moving on a fixed clock with no relationship to the music.
 * Returns 0 while the audio is still loading (first few frames only —
 * Remotion's delayRender mechanism, handled internally by useAudioData,
 * blocks frame capture until it resolves, so this never captures mid-load). */
export default function useAudioPulse() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const audioData = useAudioData(staticFile('audio/theme.mp3'));

  if (!audioData) return 0;

  const samples = visualizeAudio({ fps, frame, audioData, numberOfSamples: 32 });
  const bass = samples.slice(0, 4).reduce((sum, v) => sum + v, 0) / 4;
  return Math.min(1, bass * 2.2);
}
