// The reel with its own edit drawn on top of it.
//
// Beat alignment is hard to judge by watching, and easy to judge by looking
// at a number. verify-edl already reports one — how far each cut sits from a
// bar line — but a number cannot tell you whether a cut that is technically
// on the grid actually *feels* like it lands, or whether a shot is holding
// too long, or whether a punch-in reads as a second look rather than a jump.
//
// So this renders the real composition and overlays what the EDL believes:
// a beat ruler with the downbeats marked, a border flash on every downbeat, a
// live readout of the current section and shot, and a marker on every cut.
// Twenty seconds of this says more than ninety seconds of the finished reel.
//
// Never imported by HighlightsReel — it wraps it, the same way the Preview3D*
// sandboxes sit alongside the real compositions in Root.jsx.
import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from 'remotion';
import HighlightsReel from './HighlightsReel.jsx';
import { EDL } from './edl.js';
import { reelData } from './data.js';
import { COLORS } from './theme.js';
import { FONT_SANS } from './fonts.js';

const MONO = { fontFamily: FONT_SANS, letterSpacing: 1 };

function nearestDistance(list, frame) {
  if (!list?.length) return null;
  let best = Infinity;
  for (const f of list) {
    const d = Math.abs(f - frame);
    if (d < best) best = d;
  }
  return best;
}

/** Which section and montage shot a frame falls in, per the EDL. */
function locate(frame) {
  const section = EDL.sections.find(
    s => frame >= s.startFrame && frame < s.startFrame + s.durationInFrames,
  ) ?? EDL.sections[EDL.sections.length - 1];

  let shot = null;
  if (section?.shots?.length) {
    const local = frame - section.startFrame;
    shot = section.shots.find(
      s => local >= s.startFrame && local < s.startFrame + s.durationInFrames,
    ) ?? null;
  }
  return { section, shot };
}

export default function BeatDebug() {
  const frame = useCurrentFrame();
  const { width, fps } = useVideoConfig();
  const music = EDL.music;
  const beats = music?.beatFrames ?? [];
  const downbeats = music?.downbeatFrames ?? [];
  const { section, shot } = locate(frame);

  const toBeat = nearestDistance(beats, frame);
  const toDownbeat = nearestDistance(downbeats, frame);
  const onDownbeat = toDownbeat != null && toDownbeat <= 1;

  // Every cut the EDL knows about: section boundaries plus montage shots.
  const cuts = [];
  for (const s of EDL.sections) {
    if (s.transitionIn) cuts.push(s.startFrame + Math.round(s.transitionIn.durationInFrames / 2));
    else if (s.startFrame > 0) cuts.push(s.startFrame);
    for (const sh of s.shots ?? []) {
      if (sh.cutIn === 'hard') cuts.push(s.startFrame + sh.startFrame);
    }
  }

  const scale = width / Math.max(1, EDL.totalFrames);

  return (
    <AbsoluteFill>
      <HighlightsReel data={reelData} />

      {/* Border flash on the downbeat — the fastest way to see whether the
          picture is actually changing when the music does. */}
      {onDownbeat && (
        <AbsoluteFill style={{ border: `6px solid ${COLORS.gold}`, pointerEvents: 'none' }} />
      )}

      <AbsoluteFill style={{ pointerEvents: 'none' }}>
        <div
          style={{
            ...MONO,
            position: 'absolute',
            top: 24,
            left: 28,
            padding: '10px 14px',
            background: 'rgba(0,0,0,0.72)',
            color: COLORS.linen,
            fontSize: 20,
            lineHeight: 1.5,
          }}
        >
          <div>
            f{frame} · {(frame / fps).toFixed(2)}s · {EDL.mode}
          </div>
          <div style={{ color: COLORS.gold }}>
            {music ? `${music.track?.slice(0, 34)} · ${music.bpm?.toFixed(1)}bpm · ${music.quality}` : 'no music grid'}
          </div>
          <div>
            section <b>{section?.id}</b>
            {shot ? ` · shot ${shot.index} plate ${shot.plateIndex} · ${shot.move}/${shot.cutIn}${shot.isPunchIn ? ' · PUNCH-IN' : ''}` : ''}
          </div>
          <div style={{ color: toBeat != null && toBeat <= 1 ? COLORS.gold : COLORS.dust }}>
            {toBeat == null ? 'no beats' : `${toBeat} frame(s) to nearest beat · ${toDownbeat} to downbeat`}
          </div>
        </div>

        {/* Ruler: every beat a tick, downbeats taller, cuts in gold below,
            and a playhead. Cuts that do not sit under a downbeat tick are the
            thing to look for. */}
        <div style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 74, background: 'rgba(0,0,0,0.66)' }}>
          {beats.map((f, i) => (
            <div
              key={`b${i}`}
              style={{
                position: 'absolute',
                left: f * scale,
                bottom: 30,
                width: 1,
                height: downbeats.includes(f) ? 22 : 10,
                background: downbeats.includes(f) ? COLORS.gold : COLORS.dust,
                opacity: downbeats.includes(f) ? 0.95 : 0.5,
              }}
            />
          ))}
          {cuts.map((f, i) => (
            <div
              key={`c${i}`}
              style={{
                position: 'absolute',
                left: f * scale - 1,
                bottom: 4,
                width: 3,
                height: 22,
                background: COLORS.goldLight ?? COLORS.gold,
              }}
            />
          ))}
          <div
            style={{
              position: 'absolute',
              left: frame * scale - 1,
              bottom: 0,
              width: 2,
              height: 74,
              background: COLORS.linen,
            }}
          />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}
