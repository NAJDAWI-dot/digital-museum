// Framework-agnostic helper for building shareable links.
//
// Appends a `ref` query parameter (and preserves any existing query string)
// to the current page URL so that GoatCounter's tracking snippet -- which
// captures both the `ref` param and the HTTP referrer on every pageview --
// can attribute visits back to the channel they were shared from. No
// tracking/beacon logic lives here on purpose; this only builds the URL.

/**
 * Build a shareable version of the current site URL with a `ref` query
 * parameter appended.
 *
 * @param {string} source - short channel name, e.g. "linkedin", "github",
 *   "resume", "twitter". Falls back to "share" if omitted.
 * @param {string} [baseUrl] - URL to use instead of the current page
 *   location (useful for testing or non-browser contexts).
 * @returns {string} the shareable URL, or an empty string if no URL is
 *   available at all (e.g. called outside a browser with no baseUrl).
 */
export function buildShareLink(source, baseUrl) {
  const origin = baseUrl || (typeof window !== 'undefined' ? window.location.href : '');
  if (!origin) return '';

  const url = new URL(origin);
  url.searchParams.set('ref', source || 'share');
  return url.toString();
}

export default buildShareLink;
