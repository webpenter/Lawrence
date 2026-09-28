/**
 * Photography stand-ins from the design preview (§13.2): tonal horizon
 * gradients used wherever a listing has no licensed imagery yet. These are
 * placeholder art, not design tokens — but they live in /src/tokens so the
 * no-hardcoded-colours rule keeps every colour definition in one place.
 * The scrim is §9.3 rule 2, verbatim.
 */

export const HORIZON_GRADIENTS = [
  'linear-gradient(160deg,#C9C2B4 0%,#9A9384 38%,#5C5A52 62%,#1D1E20 100%)',
  'linear-gradient(170deg,#CBD2CC 0%,#9AA79F 40%,#4E5A55 70%,#14181A 100%)',
  'linear-gradient(150deg,#D8CDBB 0%,#B0A184 42%,#6A5F4C 68%,#211E19 100%)',
  'linear-gradient(175deg,#C3CBD4 0%,#8D97A2 42%,#4A5159 70%,#16181B 100%)',
  'linear-gradient(155deg,#E0D8CB 0%,#BCAE97 40%,#7C6F5B 68%,#241F19 100%)',
  'linear-gradient(165deg,#BFC7C3 0%,#8E9994 44%,#48504D 72%,#121514 100%)',
] as const;

export const PHOTO_SCRIM =
  'linear-gradient(180deg,rgba(10,11,13,.5) 0%,rgba(10,11,13,.05) 40%,rgba(10,11,13,.8) 100%)';

export const HERO_SCRIM =
  'linear-gradient(180deg,rgba(10,11,13,.5) 0%,rgba(10,11,13,.05) 40%,rgba(10,11,13,.8) 100%)';

export const HORIZON_LINE = 'rgba(255,255,255,.35)';

/** Deterministic gradient pick so a given listing always shows the same sea. */
export function horizonGradientFor(seed: string | number): string {
  const s = String(seed);
  let hash = 0;
  for (let i = 0; i < s.length; i += 1) hash = (hash * 31 + s.charCodeAt(i)) | 0;
  const index = Math.abs(hash) % HORIZON_GRADIENTS.length;
  return HORIZON_GRADIENTS[index] as string;
}
