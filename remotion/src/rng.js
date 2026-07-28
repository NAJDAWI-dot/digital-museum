// Seeded pseudo-randomness for build-time decisions.
//
// The reel used bare Math.random() to pick its track and its window, which
// gives variety but nothing else: when a rendered reel looks wrong there is
// no way to reproduce it, because the inputs that produced it were never
// written down. A seeded generator keeps the variety and makes any render
// replayable from a single number recorded in the artifact.
//
// mulberry32 — small, fast, and good enough for choosing between edits. It
// is not cryptographic and does not need to be.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), 1 | t);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** A small set of helpers over a seeded stream, so callers don't have to
 * hand-roll the same range/pick/shuffle arithmetic each time. */
export function createRng(seed) {
  const next = mulberry32(seed);
  const api = {
    seed,
    next,
    /** Float in [min, max). */
    range: (min, max) => min + next() * (max - min),
    /** Integer in [min, max], inclusive. */
    int: (min, max) => Math.floor(min + next() * (max - min + 1)),
    /** One element, or undefined for an empty list. */
    pick: (items) => (items.length ? items[Math.floor(next() * items.length)] : undefined),
    /** True with the given probability. */
    chance: (p) => next() < p,
    /** Fisher-Yates, on a copy. */
    shuffle: (items) => {
      const out = items.slice();
      for (let i = out.length - 1; i > 0; i--) {
        const j = Math.floor(next() * (i + 1));
        [out[i], out[j]] = [out[j], out[i]];
      }
      return out;
    },
    /** One element, excluding `avoid` when that leaves anything to choose. */
    pickAvoiding: (items, avoid) => {
      const options = items.filter((i) => i !== avoid);
      return api.pick(options.length ? options : items);
    },
  };
  return api;
}
