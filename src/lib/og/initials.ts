/**
 * First letter of the first and last name: "Ethan Austin-Cruse" → "EA".
 * A hyphenated surname counts once, as people write it on a monogram.
 */
export function initials(name: string): string {
  const words = name.trim().split(/\s+/);
  const first = words[0] ?? "";
  const last = words.length > 1 ? words[words.length - 1] : "";
  return (first.charAt(0) + last.charAt(0)).toUpperCase();
}
