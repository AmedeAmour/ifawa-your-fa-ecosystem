export function normalizeSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

export function matchesSearch(value: string, query: string) {
  const needle = normalizeSearch(query);
  if (!needle) return false;
  const haystack = normalizeSearch(value);
  return (
    haystack.split(" ").some((word) => word.startsWith(needle)) ||
    haystack.replaceAll(" ", "").startsWith(needle.replaceAll(" ", ""))
  );
}
