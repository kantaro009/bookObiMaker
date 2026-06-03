/**
 * Helper to wrap URLs with a CORS proxy (wsrv.nl)
 * This allows the canvas to export the image data without being tainted.
 */
export const getCorsFriendlyUrl = (url: string) => {
  if (!url) return '';
  // wsrv.nl expects URL without protocol in many cases.
  // Including https:// in the query can return non-image responses in some environments.
  const normalized = url.trim().replace(/^https?:\/\//i, '');
  // output=jpg: normalize format, n=-1: disable upscale for clearer thumbnails.
  return `https://wsrv.nl/?url=${encodeURIComponent(normalized)}&output=jpg&n=-1`;
};

export const dedupeUrls = (urls: Array<string | undefined | null>): string[] => {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url && url.trim()))));
};

const getDirectUrlFromWsrv = (url: string): string | undefined => {
  if (!/^https?:\/\/wsrv\.nl\//i.test(url)) return undefined;

  try {
    const parsed = new URL(url);
    const source = parsed.searchParams.get('url');
    if (!source) return undefined;
    if (/^https?:\/\//i.test(source)) return source;
    return `https://${source}`;
  } catch {
    return undefined;
  }
};

export const expandImageCandidates = (urls: Array<string | undefined | null>): string[] => {
  const expanded: string[] = [];

  urls.forEach((url) => {
    if (!url) return;
    expanded.push(url);

    const direct = getDirectUrlFromWsrv(url);
    if (direct && direct !== url) {
      expanded.push(direct);
    }
  });

  return dedupeUrls(expanded);
};
