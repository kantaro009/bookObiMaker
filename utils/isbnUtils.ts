export const normalizeIsbn = (value?: string): string => {
  if (!value) return '';
  return value.toUpperCase().replace(/[^0-9X]/g, '');
};

export const isIsbn13 = (value: string): boolean => {
  return value.length === 13 && (value.startsWith('978') || value.startsWith('979'));
};

export const isIsbn10 = (value: string): boolean => {
  return value.length === 10;
};

export const pickPreferredIsbn = (isbns?: string[]): string | undefined => {
  if (!isbns || isbns.length === 0) return undefined;
  const normalized = isbns
    .map((value) => normalizeIsbn(value))
    .filter((value) => isIsbn10(value) || isIsbn13(value));

  const isbn13 = normalized.find((value) => isIsbn13(value));
  if (isbn13) return isbn13;

  const isbn10 = normalized.find((value) => isIsbn10(value));
  return isbn10;
};

// Convert ISBN-13 (978 prefix) to ISBN-10 for Amazon URL
export const toIsbn10 = (isbn: string): string | null => {
  const cleanIsbn = normalizeIsbn(isbn);
  if (!cleanIsbn) return null;

  if (isIsbn10(cleanIsbn)) return cleanIsbn;
  if (!isIsbn13(cleanIsbn) || !cleanIsbn.startsWith('978')) return null;

  const core = cleanIsbn.slice(3, 12); // 9 digits
  let sum = 0;
  for (let i = 0; i < 9; i += 1) {
    sum += parseInt(core[i], 10) * (10 - i);
  }

  const remainder = sum % 11;
  const checkDigitVal = 11 - remainder;
  let checkDigit = checkDigitVal.toString();
  if (checkDigitVal === 10) checkDigit = 'X';
  if (checkDigitVal === 11) checkDigit = '0';

  return core + checkDigit;
};
