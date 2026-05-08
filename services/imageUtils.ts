/**
 * Helper to wrap URLs with a CORS proxy (wsrv.nl)
 * This allows the canvas to export the image data without being tainted.
 */
export const getCorsFriendlyUrl = (url: string) => {
  if (!url) return '';
  // wsrv.nl usage: https://wsrv.nl/?url=...
  // output=jpg ensures we get a consistent format and handles some transparency issues if any
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg`;
};

export const dedupeUrls = (urls: Array<string | undefined | null>): string[] => {
  return Array.from(new Set(urls.filter((url): url is string => Boolean(url && url.trim()))));
};
