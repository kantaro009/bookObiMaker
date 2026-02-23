export const normalizeForMatch = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[\s\u3000]/g, '')
    .replace(/["'“”‘’()（）\[\]【】:：\-–—・]/g, '');
};
