// Generates narration audio + word-level timestamps from text, via
// ElevenLabs' timestamped TTS endpoint. Unlike goatcounter-proxy, this
// function deploys WITH Supabase's default JWT verification (no
// --no-verify-jwt): the caller must send a live Supabase Auth session as
// the Authorization bearer token, and Supabase's gateway rejects anyone
// without one before this code even runs. That's what stops a visitor from
// spending the owner's ElevenLabs quota — only the logged-in editor can
// reach this function at all.
//
// The real ElevenLabs key lives only as a Supabase secret, set once by the
// owner:
//   npx supabase login
//   npx supabase link --project-ref tqmbdnodqcheivrzdhkc
//   npx supabase secrets set ELEVENLABS_API_KEY=sk_...
//   npx supabase functions deploy elevenlabs-generate

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

// Generous but not unbounded — a single narration script shouldn't approach
// a meaningful fraction of the free tier's monthly character budget in one
// call by accident (e.g. a pasted write-up instead of a short script).
const MAX_CHARS = 5000;

// Supabase's platform-level JWT verification (the default deploy mode this
// function relies on) only checks that the token is a validly SIGNED JWT
// for this project — it does NOT check which role issued it. The public
// anon key is itself a permanently-valid signed JWT (role: "anon"), shipped
// in every visitor's browser bundle, so it passes that gateway check same
// as a real login session. Without this extra role check, any visitor
// could call this function directly with the anon key and spend the
// owner's ElevenLabs quota with no login at all.
function isAuthenticatedSession(authHeader: string | null): boolean {
  const token = authHeader?.replace(/^Bearer\s+/i, '');
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload.role === 'authenticated';
  } catch {
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (!isAuthenticatedSession(req.headers.get('authorization'))) {
    return new Response(JSON.stringify({ error: 'A signed-in editor session is required.' }), {
      status: 403,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const apiKeyEarly = Deno.env.get('ELEVENLABS_API_KEY');
  if (!apiKeyEarly) {
    return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY secret is not set' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  // GET — lists voices actually in this account (not the shared Voice
  // Library), so the editor can pick a real one instead of guessing IDs
  // that come back 402 (free tier can't call Library voices directly).
  if (req.method === 'GET') {
    const voicesRes = await fetch('https://api.elevenlabs.io/v1/voices', {
      headers: { 'xi-api-key': apiKeyEarly },
    });
    if (!voicesRes.ok) {
      const detail = await voicesRes.text().catch(() => '');
      return new Response(
        JSON.stringify({ error: `Could not list voices (HTTP ${voicesRes.status})`, detail: detail.slice(0, 500) }),
        { status: voicesRes.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
      );
    }
    const voicesJson = await voicesRes.json();
    const voices = (voicesJson.voices || []).map((v: { voice_id: string; name: string; category?: string }) => ({
      voiceId: v.voice_id,
      name: v.name,
      category: v.category,
    }));
    return new Response(JSON.stringify({ voices }), {
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'GET or POST only' }), {
      status: 405,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  let body: { text?: string; voiceId?: string };
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: 'invalid JSON body' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const text = (body.text || '').trim();
  if (!text) {
    return new Response(JSON.stringify({ error: 'text is required' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }
  if (text.length > MAX_CHARS) {
    return new Response(JSON.stringify({ error: `text exceeds ${MAX_CHARS} characters` }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  if (!body.voiceId) {
    return new Response(JSON.stringify({ error: 'voiceId is required — GET this endpoint to list usable voices' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${body.voiceId}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKeyEarly,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text,
        model_id: 'eleven_multilingual_v2',
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    }
  );

  if (!upstream.ok) {
    const detail = await upstream.text().catch(() => '');
    return new Response(
      JSON.stringify({ error: `ElevenLabs request failed (HTTP ${upstream.status})`, detail: detail.slice(0, 500) }),
      { status: upstream.status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
    );
  }

  const json = await upstream.json();
  // Flatten ElevenLabs' alignment shape to exactly what the client needs —
  // parallel arrays of character, start-second, end-second.
  const alignment = json.alignment || {};

  return new Response(
    JSON.stringify({
      audioBase64: json.audio_base64,
      characters: alignment.characters || [],
      charStart: alignment.character_start_times_seconds || [],
      charEnd: alignment.character_end_times_seconds || [],
    }),
    { headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } }
  );
});
