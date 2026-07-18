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
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Rachel — a stable, well-documented default ElevenLabs voice. Callers may
// override with their own voiceId from their ElevenLabs voice library.
const DEFAULT_VOICE_ID = '21m00Tcm4TlvDq8ikWAM';

// Generous but not unbounded — a single narration script shouldn't approach
// a meaningful fraction of the free tier's monthly character budget in one
// call by accident (e.g. a pasted write-up instead of a short script).
const MAX_CHARS = 5000;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }
  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'POST only' }), {
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

  const apiKey = Deno.env.get('ELEVENLABS_API_KEY');
  if (!apiKey) {
    return new Response(JSON.stringify({ error: 'ELEVENLABS_API_KEY secret is not set' }), {
      status: 500,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const voiceId = body.voiceId || DEFAULT_VOICE_ID;

  const upstream = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}/with-timestamps`,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
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
