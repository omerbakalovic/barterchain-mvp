export function normalizeItemName(value: string) {
  return value.trim().toLowerCase();
}

export function compareIds(left: string, right: string) {
  return left.localeCompare(right);
}
