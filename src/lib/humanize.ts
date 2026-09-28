/** Humanize an enum slug for display until per-enum translation keys land with the translation pass. */
export function humanizeEnum(value: string): string {
  const text = value.replace(/_/g, ' ');
  return text.charAt(0).toUpperCase() + text.slice(1);
}
