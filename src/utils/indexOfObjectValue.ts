export const indexOfObjectValue = (
  obj: Record<string, unknown>,
  val: unknown
): number => {
  return Object.values(obj).indexOf(val);
};
