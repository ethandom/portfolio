const NUMBER = /^(\D*?)(\d[\d,]*(?:\.\d+)?)(.*)$/;

export type Readout = {
  prefix: string;
  suffix: string;
  target: number;
  decimals: number;
  grouped: boolean;
};

/** "100k+" → { prefix: "", target: 100, suffix: "k+" }. Null when there's no number to count. */
export function parseReadout(value: string): Readout | null {
  const match = value.match(NUMBER);
  if (!match) return null;
  const [, prefix, digits, suffix] = match;
  return {
    prefix,
    suffix,
    target: Number(digits.replaceAll(",", "")),
    decimals: digits.split(".")[1]?.length ?? 0,
    grouped: digits.includes(","),
  };
}
