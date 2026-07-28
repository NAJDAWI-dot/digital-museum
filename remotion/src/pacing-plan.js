// The editorial decisions that shape the cut, as opposed to the ones that
// choose its content.
//
// The editing agent used to pick four things: which projects star, which
// optional sections show, how many photos each project gets, and the track.
// All four are content questions. None of them touch how the reel is *cut* —
// pacing, emphasis, which project carries the piece — so the reel could be
// re-decided every week and still feel identical.
//
// Everything here is a weight, an ordinal, a fraction, or a symbol. There are
// no frame numbers, and there should never be: a language model asked for
// frame arithmetic will produce numbers that look reasonable and do not add
// up, and the builder already knows how to turn intent into frames against a
// bar grid. The agent supplies taste; the builder does the arithmetic.

export const ENERGY_LEVELS = ['restrained', 'assertive', 'explosive'];
export const MONTAGE_RHYTHMS = ['steady', 'accelerate', 'wave'];
export const MOVE_STYLES = ['contemplative', 'balanced', 'kinetic'];
export const PERMUTABLE_SECTIONS = ['timeline', 'volunteering', 'testimonial'];

export const DEFAULT_PACING_PLAN = {
  version: 1,
  energy: 'assertive',
  sectionOrder: PERMUTABLE_SECTIONS,
  montage: {
    rhythm: 'steady',
    heroProjectId: null,
    heroShare: 0,
    moveStyle: 'balanced',
    punchIns: true,
  },
  rationale: null,
};

function pickEnum(value, allowed, fallback) {
  return typeof value === 'string' && allowed.includes(value) ? value : fallback;
}

function pickFraction(value, fallback, { min = 0, max = 1 } = {}) {
  return Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
}

/**
 * Validates a plan field by field, each falling back independently.
 *
 * One bad value must not discard the rest — the same reasoning agent-edit
 * already applies to its content decisions. A model that returns a sensible
 * rhythm and a nonsense heroShare should keep the rhythm.
 */
export function validatePacingPlan(raw, { projectIds = [] } = {}) {
  const base = DEFAULT_PACING_PLAN;
  if (!raw || typeof raw !== 'object') return { ...base, montage: { ...base.montage } };

  const order = Array.isArray(raw.sectionOrder)
    ? raw.sectionOrder.filter(id => PERMUTABLE_SECTIONS.includes(id))
    : [];
  // Anything the model left out keeps its usual place rather than vanishing.
  const sectionOrder = [...new Set([...order, ...PERMUTABLE_SECTIONS])];

  const montage = raw.montage && typeof raw.montage === 'object' ? raw.montage : {};
  const heroProjectId = projectIds.includes(montage.heroProjectId) ? montage.heroProjectId : null;

  return {
    version: 1,
    energy: pickEnum(raw.energy, ENERGY_LEVELS, base.energy),
    sectionOrder,
    montage: {
      rhythm: pickEnum(montage.rhythm, MONTAGE_RHYTHMS, base.montage.rhythm),
      heroProjectId,
      // A hero share only means anything if there is a hero.
      heroShare: heroProjectId ? pickFraction(montage.heroShare, 0.2, { min: 0.1, max: 0.4 }) : 0,
      moveStyle: pickEnum(montage.moveStyle, MOVE_STYLES, base.montage.moveStyle),
      punchIns: typeof montage.punchIns === 'boolean' ? montage.punchIns : base.montage.punchIns,
    },
    rationale: raw.rationale && typeof raw.rationale === 'object' ? raw.rationale : null,
  };
}

/** How the energy level translates into cutting. Restrained holds longer and
 * dissolves more; explosive cuts shorter and harder. */
export function energyProfile(energy) {
  switch (energy) {
    case 'restrained':
      return { shotScale: 1.3, transitionScale: 1.25, punchInChance: 0.2 };
    case 'explosive':
      return { shotScale: 0.75, transitionScale: 0.7, punchInChance: 0.6 };
    case 'assertive':
    default:
      return { shotScale: 1, transitionScale: 1, punchInChance: 0.45 };
  }
}

/** Move-style weighting for the montage's camera vocabulary. */
export function moveStyleWeights(style) {
  switch (style) {
    case 'contemplative':
      return { dolly: 3, pull: 2, lateral: 2, push: 1, hold: 2 };
    case 'kinetic':
      return { push: 3, lateral: 3, hold: 2, dolly: 1, pull: 1 };
    case 'balanced':
    default:
      return { dolly: 2, push: 2, lateral: 2, pull: 1, hold: 1 };
  }
}
