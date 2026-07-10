// Loaded once, at module scope — Remotion's google-fonts helpers register
// their own delayRender/continueRender internally, so the render waits for
// these before capturing the first frame.
import { loadFont as loadSerif } from '@remotion/google-fonts/CormorantGaramond';
import { loadFont as loadSans } from '@remotion/google-fonts/DMSans';

const serif = loadSerif('normal', { weights: ['300', '400', '500', '600'] });
const sans = loadSans('normal', { weights: ['400', '500', '700'] });

export const FONT_SERIF = serif.fontFamily;
export const FONT_SANS = sans.fontFamily;
