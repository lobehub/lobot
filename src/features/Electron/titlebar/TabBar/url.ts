// Tab identity ignores the fragment: `/settings/agent#llm` and `/settings/agent`
// are the same tab, so an anchor jump keeps the tab's cached meta instead of
// looking like a navigation to a different page.
export const normalizeTabUrl = (url: string): string => {
  const [withoutHash = ''] = url.split('#');
  const [rawPath = '', rawQuery = ''] = withoutHash.split('?');

  let pathname = rawPath || '/';
  if (pathname.length > 1 && pathname.endsWith('/')) {
    pathname = pathname.replace(/\/+$/, '') || '/';
  }
  if (!pathname.startsWith('/')) pathname = `/${pathname}`;

  const queryString = rawQuery;
  if (!queryString) return pathname;

  const params = new URLSearchParams(queryString);
  const entries = [...params.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  if (entries.length === 0) return pathname;

  const sorted = new URLSearchParams();
  for (const [key, value] of entries) sorted.append(key, value);

  return `${pathname}?${sorted.toString()}`;
};
