export const clamp = (val: number, lower: number, upper: number): number => {
  if (val < lower) return lower;
  if (val > upper) return upper;
  return val;
};
