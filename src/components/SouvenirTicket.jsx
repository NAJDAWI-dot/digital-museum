import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import { getCount, incrementCount } from '../utils/counterApi';
import { ACHIEVEMENTS, getEarned } from '../lib/achievements';
import './SouvenirTicket.css';

const NUMBER_KEY = 'museum_ticket_number';
const ISSUED_KEY = 'museum_ticket_issued';

/** Each visitor's number is claimed exactly once (CounterAPI increment) and
 * kept in localStorage — return visits show the same ticket. If the counter
 * service is unreachable the ticket still issues, numbered from the date so
 * it's stable and plausible rather than "0". */
async function claimVisitorNumber() {
  try {
    const stored = localStorage.getItem(NUMBER_KEY);
    if (stored) return Number(stored);
  } catch { /* private mode */ }

  let n = await incrementCount('museum-visitors');
  if (n === null) n = (await getCount('museum-visitors')) || null;
  if (n === null) {
    const start = new Date('2026-01-01').getTime();
    n = 100 + Math.floor((Date.now() - start) / 86_400_000) * 3;
  }
  try { localStorage.setItem(NUMBER_KEY, String(n)); } catch { /* ignore */ }
  return n;
}

function drawTicket(canvas, { number, dateText }) {
  const ctx = canvas.getContext('2d');
  const W = canvas.width;   // 1200
  const H = canvas.height;  // 520
  const gold = '#c9a96e';
  const goldDark = '#a8823e';
  const ink = '#0d0d0d';
  const linen = '#f0ede8';
  const dust = '#9a9a9a';

  ctx.fillStyle = ink;
  ctx.fillRect(0, 0, W, H);

  // Inner hairline frame
  ctx.strokeStyle = goldDark;
  ctx.lineWidth = 2;
  ctx.strokeRect(28, 28, W - 56, H - 56);

  // Perforated stub divider
  const stubX = W - 300;
  ctx.setLineDash([2, 10]);
  ctx.strokeStyle = dust;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(stubX, 40);
  ctx.lineTo(stubX, H - 40);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.textAlign = 'left';
  ctx.fillStyle = gold;
  ctx.font = '600 26px "DM Sans", sans-serif';
  ctx.save();
  const kicker = 'THE NAJDAWI COLLECTION';
  ctx.translate(72, 108);
  for (let i = 0; i < kicker.length; i++) {
    ctx.fillText(kicker[i], i * 24, 0);
  }
  ctx.restore();

  ctx.fillStyle = linen;
  ctx.font = 'italic 300 96px "Cormorant Garamond", Georgia, serif';
  ctx.fillText('Admit One', 68, 232);

  ctx.strokeStyle = gold;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(72, 272);
  ctx.lineTo(340, 272);
  ctx.stroke();

  ctx.fillStyle = dust;
  ctx.font = '22px "DM Sans", sans-serif';
  ctx.fillText('A digital museum of engineering, applications & web craft', 72, 322);

  ctx.fillStyle = gold;
  ctx.font = '600 28px "DM Mono", monospace';
  ctx.fillText(`VISITOR  № ${number.toLocaleString()}`, 72, 408);
  ctx.fillStyle = dust;
  ctx.font = '22px "DM Mono", monospace';
  ctx.fillText(dateText, 72, 448);

  // Stub
  ctx.save();
  ctx.translate(stubX + 150, H / 2);
  ctx.rotate(-Math.PI / 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = goldDark;
  ctx.font = '600 24px "DM Mono", monospace';
  ctx.fillText(`№ ${number.toLocaleString()}`, 0, -30);
  ctx.fillStyle = dust;
  ctx.font = '18px "DM Sans", sans-serif';
  ctx.fillText('SOUVENIR STUB', 0, 8);
  ctx.restore();
}

export default function SouvenirTicket() {
  const { t } = useTranslation();
  const [chipVisible, setChipVisible] = useState(false);
  const [open, setOpen] = useState(false);
  const [number, setNumber] = useState(null);
  const canvasRef = useRef(null);
  const issuedRef = useRef(false);

  // First visit: offer the ticket after the visitor has settled in.
  useEffect(() => {
    let issued = false;
    try { issued = Boolean(localStorage.getItem(ISSUED_KEY)); } catch { /* ignore */ }
    issuedRef.current = issued;
    if (issued) return;
    const timer = setTimeout(() => setChipVisible(true), 20_000);
    return () => clearTimeout(timer);
  }, []);

  // Re-open from the footer ("Your ticket").
  useEffect(() => {
    const onOpen = () => setOpen(true);
    window.addEventListener('museum:open-ticket', onOpen);
    return () => window.removeEventListener('museum:open-ticket', onOpen);
  }, []);

  const openTicket = useCallback(async () => {
    setChipVisible(false);
    setOpen(true);
    try { localStorage.setItem(ISSUED_KEY, '1'); } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      const n = await claimVisitorNumber();
      if (cancelled) return;
      setNumber(n);
      await document.fonts?.ready;
      if (cancelled || !canvasRef.current) return;
      const issuedAt = (() => {
        try { return Number(localStorage.getItem(ISSUED_KEY + '_date')) || Date.now(); } catch { return Date.now(); }
      })();
      try { localStorage.setItem(ISSUED_KEY + '_date', String(issuedAt)); } catch { /* ignore */ }
      drawTicket(canvasRef.current, {
        number: n,
        dateText: new Date(issuedAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
      });
    })();
    return () => { cancelled = true; };
  }, [open]);

  const download = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `najdawi-museum-ticket-${number || 'visitor'}.png`;
    a.click();
  };

  const earned = getEarned();

  return (
    <>
      <AnimatePresence>
        {chipVisible && (
          <motion.button
            type="button"
            className="ticket-chip mono"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            onClick={openTicket}
          >
            🎟 {t('ticket.collect')}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            className="ticket-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={() => setOpen(false)}
          >
            <motion.div
              className="ticket-modal"
              initial={{ opacity: 0, y: 24, rotate: -1.5 }}
              animate={{ opacity: 1, y: 0, rotate: 0 }}
              exit={{ opacity: 0, y: 24 }}
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <canvas ref={canvasRef} width={1200} height={520} className="ticket-canvas" />

              <div className="ticket-medals">
                {ACHIEVEMENTS.map(a => (
                  <span
                    key={a.id}
                    className={`ticket-medal ${earned[a.id] ? 'earned' : ''}`}
                    title={earned[a.id] ? a.title : `${t('ticket.locked')} — ${a.hint}`}
                  >
                    <span className="ticket-medal-icon">{a.icon}</span>
                    <span className="ticket-medal-label mono">{earned[a.id] ? a.title : '???'}</span>
                  </span>
                ))}
              </div>

              <div className="ticket-actions">
                <button type="button" className="ticket-btn mono" onClick={download}>↓ {t('ticket.save')}</button>
                <button type="button" className="ticket-btn ghost mono" onClick={() => setOpen(false)}>{t('ticket.close')}</button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
