// GoatCounter's stats API sends no Access-Control-Allow-Origin header at
// all (confirmed directly against https://najdawi.goatcounter.com), so it
// can never be called from browser JavaScript on any origin, regardless of
// how correct the API token is. This function is a thin same-origin relay:
// it forwards the caller's Authorization header straight through to
// GoatCounter and returns the response with CORS headers attached. It never
// sees or stores the token itself, and never touches Supabase's own
// database — deploy with --no-verify-jwt since the Authorization header is
// reserved for the GoatCounter token, not a Supabase session.
//
// Deploy:
//   npx supabase login
//   npx supabase link --project-ref tqmbdnodqcheivrzdhkc
//   npx supabase functions deploy goatcounter-proxy --no-verify-jwt

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
};

// Single-tenant personal project — the site code is fixed, not
// client-supplied, so this can't be abused as an open proxy to arbitrary
// hosts.
const SITE_CODE = 'najdawi';
const ALLOWED_PATHS = new Set(['stats/total', 'stats/hits', 'stats/toprefs']);

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: CORS_HEADERS });
  }

  const url = new URL(req.url);
  const path = url.searchParams.get('path') || '';
  if (!ALLOWED_PATHS.has(path)) {
    return new Response(JSON.stringify({ error: 'unknown path' }), {
      status: 400,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const authorization = req.headers.get('authorization');
  if (!authorization) {
    return new Response(JSON.stringify({ error: 'missing Authorization header' }), {
      status: 401,
      headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
    });
  }

  const query = url.searchParams.get('query') || '';
  const target = `https://${SITE_CODE}.goatcounter.com/api/v0/${path}${query ? `?${query}` : ''}`;

  const upstream = await fetch(target, {
    headers: { Authorization: authorization, 'Content-Type': 'application/json' },
  });
  const body = await upstream.text();

  return new Response(body, {
    status: upstream.status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
  });
});
