import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, useInView } from 'framer-motion';
import { getSupabaseClient } from '../utils/supabaseClient';
import './Guestbook.css';

const TABLE = 'guestbook_entries';

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

export default function Guestbook() {
  const supabase = getSupabaseClient();

  const sectionRef = useRef(null);
  const inView = useInView(sectionRef, { once: true, margin: '-100px' });

  const [session, setSession] = useState(null);
  const [entries, setEntries] = useState([]);
  const [message, setMessage] = useState('');
  const [posting, setPosting] = useState(false);
  const [error, setError] = useState('');
  const [loaded, setLoaded] = useState(false);

  const loadEntries = useCallback(async () => {
    if (!supabase) return;
    const { data, error: fetchError } = await supabase
      .from(TABLE)
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);
    if (fetchError) { setError(fetchError.message); return; }
    setEntries(data || []);
    setLoaded(true);
  }, [supabase]);

  useEffect(() => {
    if (!supabase) return;

    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, newSession) => setSession(newSession));

    loadEntries();

    // Live updates: new entries from any visitor appear without a refresh.
    const channel = supabase
      .channel('guestbook-entries-changes')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: TABLE }, (payload) => {
        setEntries((prev) => [payload.new, ...prev]);
      })
      .subscribe();

    return () => {
      sub.subscription.unsubscribe();
      supabase.removeChannel(channel);
    };
  }, [supabase, loadEntries]);

  const signIn = () => {
    supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: window.location.href },
    });
  };

  const signOut = () => supabase.auth.signOut();

  const post = async (e) => {
    e.preventDefault();
    const trimmed = message.trim();
    if (!trimmed || !session) return;

    setPosting(true);
    setError('');
    const user = session.user;
    const { error: insertError } = await supabase.from(TABLE).insert({
      user_id: user.id,
      display_name: user.user_metadata?.full_name || user.email || 'Anonymous',
      avatar_url: user.user_metadata?.avatar_url || null,
      message: trimmed,
    });
    setPosting(false);
    if (insertError) { setError(insertError.message); return; }
    setMessage('');
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
                {session ? (
                  <form onSubmit={post}>
                    <div className="guestbook-composer-identity">
                      {session.user.user_metadata?.avatar_url && (
                        <img className="guestbook-avatar" src={session.user.user_metadata.avatar_url} alt="" />
                      )}
                      <span className="mono guestbook-signed-in-as">
                        Signed in as {session.user.user_metadata?.full_name || session.user.email}
                      </span>
                      <button type="button" className="guestbook-signout" onClick={signOut}>Sign out</button>
                    </div>
                    <textarea
                      className="guestbook-input mono"
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      placeholder="Leave a note…"
                      maxLength={500}
                      rows={3}
                    />
                    <button type="submit" className="guestbook-submit mono" disabled={posting || !message.trim()}>
                      {posting ? 'Posting…' : 'Sign the guestbook'}
                    </button>
                  </form>
                ) : (
                  <button type="button" className="guestbook-google-btn mono" onClick={signIn}>
                    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
                      <path fill="#4285F4" d="M23.52 12.27c0-.85-.08-1.66-.22-2.45H12v4.64h6.47c-.28 1.5-1.13 2.77-2.4 3.62v3h3.88c2.27-2.09 3.57-5.17 3.57-8.81z"/>
                      <path fill="#34A853" d="M12 24c3.24 0 5.96-1.07 7.95-2.92l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.96H1.27v3.1C3.25 21.3 7.31 24 12 24z"/>
                      <path fill="#FBBC05" d="M5.27 14.27c-.24-.72-.38-1.49-.38-2.27s.14-1.55.38-2.27v-3.1H1.27A11.96 11.96 0 000 12c0 1.94.46 3.77 1.27 5.37l4-3.1z"/>
                      <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.44-3.44C17.95 1.19 15.23 0 12 0 7.31 0 3.25 2.7 1.27 6.63l4 3.1C6.22 6.86 8.87 4.75 12 4.75z"/>
                    </svg>
                    Sign in with Google
                  </button>
                )}
                {error && <p className="guestbook-error mono">{error}</p>}
              </div>

              <div className="guestbook-entries">
                {loaded && entries.length === 0 && (
                  <p className="guestbook-empty mono">No entries yet — be the first to sign in.</p>
                )}
                {entries.map((entry) => (
                  <div className="guestbook-entry" key={entry.id}>
                    {entry.avatar_url && <img className="guestbook-avatar" src={entry.avatar_url} alt="" />}
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
