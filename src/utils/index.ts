export const RANGES = {
  fontSize:         [100.0, 300.0],
  wordSpacing:      [0.0, 0.5],
  letterSpacing:    [0.0, 0.5],
  pageMargins:      [0.5, 4.0],
  lineHeight:       [1.0, 2.0],
  paragraphMargins: [0.0, 2.0],
}

export const indexOfObjectValue = (obj: any, val: any): number => {
  return Object.values(obj).indexOf(val);
}

export const clamp = (val: number, lower: number, upper: number): number => {
  if (val < lower) return lower;
  if (val > upper) return upper;
  return val;
}
