import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { getSupabaseClient } from '../utils/supabaseClient';
import './Guestbook.css';

const TABLE = 'guestbook_entries';
const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// Renders the Cloudflare Turnstile widget into `containerRef` once the
// challenges.cloudflare.com script has loaded, and reports the resulting
// token back via onToken. A no-op (renders nothing, reports no token
// requirement) when no site key is configured -- moderation is still the
// real backstop against spam either way, this only cuts down its volume.
function useTurnstile(containerRef, onToken) {
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current) return;

    let widgetId = null;
    let cancelled = false;

    const render = () => {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      widgetId = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback: (token) => onToken(token),
        'expired-callback': () => onToken(''),
        'error-callback': () => onToken(''),
      });
    };

    if (window.turnstile) {
      render();
    } else {
      const script = document.createElement('script');
      script.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
      script.async = true;
      script.defer = true;
      script.onload = render;
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetId !== null && window.turnstile) window.turnstile.remove(widgetId);
    };
  }, [containerRef, onToken]);
}

export default function Guestbook() {
  const supabase = getSupabaseClient();

  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });
  const turnstileRef = useRef(null);

  const [entries, setEntries] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState('');
  const [message, setMessage] = useState('');
  const [turnstileToken, setTurnstileToken] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  useTurnstile(turnstileRef, setTurnstileToken);

  const loadEntries = useCallback(async () => {
    if (!supabase) return;
    // RLS restricts anonymous reads to approved=true rows already, but the
    // filter is kept explicit here for clarity.
    const { data, error: fetchError } = await supabase
      .from(TABLE)
      .select('*')
      .eq('approved', true)
      .order('created_at', { ascending: false })
      .limit(50);
    if (fetchError) { setError(fetchError.message); return; }
    setEntries(data || []);
    setLoaded(true);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;
    loadEntries();

    // Live updates: an entry the owner approves appears here without a
    // refresh. Filtered server-side to approved rows only, so a pending
    // submission never briefly flashes for other visitors.
    const channel = supabase
      .channel('guestbook-entries-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: TABLE, filter: 'approved=eq.true' },
        (payload) => {
          setEntries((prev) => {
            if (prev.some((e) => e.id === payload.new.id)) return prev;
            return [payload.new, ...prev];
          });
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [supabase, loadEntries]);

  const post = async (e) => {
    e.preventDefault();
    const trimmedName = name.trim();
    const trimmedMessage = message.trim();
    if (!trimmedName || !trimmedMessage) return;
    if (TURNSTILE_SITE_KEY && !turnstileToken) {
      setError('Please complete the verification check.');
      return;
    }

    setPosting(true);
    setError('');
    const { error: insertError } = await supabase.from(TABLE).insert({
      display_name: trimmedName.slice(0, 80),
      message: trimmedMessage,
      // approved defaults to false at the database level; RLS also rejects
      // any insert attempt that tries to set it true directly.
    });
    setPosting(false);
    if (insertError) { setError(insertError.message); return; }

    setName('');
    setMessage('');
    setTurnstileToken('');
    setSubmitted(true);
    // Visitor-delight achievement (lazy import — this chunk shouldn't pull it eagerly)
    import('../lib/achievements').then(m => m.award('signed')).catch(() => {});
    if (window.turnstile && turnstileRef.current) window.turnstile.reset();
  };

  return (
    <section id="guestbook" className="guestbook-section" ref={sectionRef}>
      <div className="container">
        <motion.div
          className="guestbook-header"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
        >
          <div className="section-label">Sign the Register</div>
          <h2 className="guestbook-title serif">Visitor's Log</h2>
          <p className="guestbook-subtitle mono">Leave a note for the next visitor</p>
        </motion.div>

        <motion.div
          className="guestbook-widget"
          initial={{ opacity: 0, y: 24 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.7, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
        >
          {!supabase ? (
            <div className="guestbook-placeholder mono">
              Guestbook not configured yet.
            </div>
          ) : (
            <>
              <div className="guestbook-composer">
                {submitted ? (
                  <div className="guestbook-submitted mono">
                    Thanks — your note is awaiting a quick review before it appears here.
                    <button type="button" className="guestbook-signout" onClick={() => setSubmitted(false)}>
                      Leave another note
                    </button>
                  </div>
                ) : (
                  <form onSubmit={post}>
                    <input
                      className="guestbook-name-input mono"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Your name"
                      maxLength={80}
                    />
                    <textarea
                      className="guestbook-input mono"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Leave a note…"
                      maxLength={500}
                      rows={3}
                    />
                    {TURNSTILE_SITE_KEY && <div ref={turnstileRef} className="guestbook-turnstile" />}
                    <button
                      type="submit"
                      className="guestbook-submit mono"
                      disabled={posting || !name.trim() || !message.trim() || (Boolean(TURNSTILE_SITE_KEY) && !turnstileToken)}
                    >
                      {posting ? 'Posting…' : 'Sign the guestbook'}
                    </button>
                    <p className="guestbook-hint mono">
                      New entries are reviewed before they appear publicly.
                    </p>
                  </form>
                )}
                {error && <p className="guestbook-error mono">{error}</p>}
              </div>

              <div className="guestbook-entries">
                {loaded && entries.length === 0 && (
                  <p className="guestbook-empty mono">No entries yet — be the first to sign it.</p>
                )}
                {entries.map((entry) => (
                  <div className="guestbook-entry" key={entry.id}>
                    <div className="guestbook-entry-body">
                      <div className="guestbook-entry-meta">
                        <span className="guestbook-entry-name">{entry.display_name}</span>
                        <span className="mono guestbook-entry-time">{timeAgo(entry.created_at)}</span>
                      </div>
                      <p className="guestbook-entry-message">{entry.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </motion.div>
      </div>
    </section>
  );
}
