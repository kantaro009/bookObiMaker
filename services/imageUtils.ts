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
