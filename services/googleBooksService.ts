import { Book } from '../types';
import { dedupeUrls, getCorsFriendlyUrl } from './imageUtils';
import { isIsbn10, isIsbn13, normalizeIsbn, toIsbn13 } from '../utils/isbnUtils';

const GOOGLE_BOOKS_API_ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';
const GOOGLE_IMAGE_KEYS = ['extraLarge', 'large', 'medium', 'small', 'thumbnail', 'smallThumbnail'] as const;
const GOOGLE_MAX_RETRIES = 2;
const GOOGLE_MAX_CONCURRENCY = 2;

const googleBookCache = new Map<string, Book | null>();

interface GoogleBooksVolume {
  volumeInfo?: {
    title?: string;
    authors?: string[];
    publisher?: string;
    imageLinks?: Partial<Record<(typeof GOOGLE_IMAGE_KEYS)[number], string>>;
    industryIdentifiers?: Array<{
      type?: string;
      identifier?: string;
    }>;
  };
}

interface GoogleBooksResponse {
  items?: GoogleBooksVolume[];
}

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const fetchGoogleBooksWithRetry = async (url: string): Promise<Response> => {
  for (let attempt = 0; attempt <= GOOGLE_MAX_RETRIES; attempt += 1) {
    const response = await fetch(url);
    if (response.ok) return response;

    const shouldRetry = (response.status === 429 || response.status >= 500) && attempt < GOOGLE_MAX_RETRIES;
    if (!shouldRetry) {
      throw new Error(`Google Books API Error: ${response.status}`);
    }

    const retryAfterHeader = response.headers.get('Retry-After');
    const retryAfterSeconds = retryAfterHeader ? Number(retryAfterHeader) : NaN;
    const backoffMs = Number.isFinite(retryAfterSeconds)
      ? Math.max(0, retryAfterSeconds * 1000)
      : 400 * Math.pow(2, attempt);
    await wait(backoffMs);
  }

  throw new Error('Google Books API retry exhausted');
};

const normalizeGoogleImageUrl = (url: string): string => {
  return url.replace(/^http:\/\//i, 'https://');
};

const extractGoogleBookIsbn = (volume: GoogleBooksVolume): string | undefined => {
  const identifiers = volume.volumeInfo?.industryIdentifiers || [];
  const normalized = identifiers
    .map((identifier) => normalizeIsbn(identifier.identifier))
    .filter((value) => isIsbn10(value) || isIsbn13(value));

  const isbn13 = normalized.find((value) => isIsbn13(value));
  if (isbn13) return isbn13;

  const isbn10 = normalized.find((value) => isIsbn10(value));
  return isbn10 ? toIsbn13(isbn10) || isbn10 : undefined;
};

const buildGoogleCoverCandidates = (volume: GoogleBooksVolume): string[] => {
  const imageLinks = volume.volumeInfo?.imageLinks;
  if (!imageLinks) return [];

  return dedupeUrls(
    GOOGLE_IMAGE_KEYS.map((key) => {
      const url = imageLinks[key];
      return url ? getCorsFriendlyUrl(normalizeGoogleImageUrl(url)) : undefined;
    })
  );
};

const findBestMatchingVolume = (items: GoogleBooksVolume[], requestIsbn: string): GoogleBooksVolume | undefined => {
  return items.find((item) => extractGoogleBookIsbn(item) === requestIsbn)
    || items.find((item) => buildGoogleCoverCandidates(item).length > 0)
    || items[0];
};

const fetchBookFromGoogleBooks = async (isbn: string): Promise<Book | null> => {
  const normalizedIsbn = normalizeIsbn(isbn);
  if (!normalizedIsbn) return null;

  const cached = googleBookCache.get(normalizedIsbn);
  if (cached !== undefined) return cached;

  try {
    const response = await fetchGoogleBooksWithRetry(`${GOOGLE_BOOKS_API_ENDPOINT}?q=isbn:${normalizedIsbn}&maxResults=5`);

    const data: GoogleBooksResponse = await response.json();
    const volume = findBestMatchingVolume(data.items || [], normalizedIsbn);
    if (!volume?.volumeInfo?.title) {
      googleBookCache.set(normalizedIsbn, null);
      return null;
    }

    const coverCandidates = buildGoogleCoverCandidates(volume);
    if (coverCandidates.length === 0) {
      googleBookCache.set(normalizedIsbn, null);
      return null;
    }

    const result: Book = {
      title: volume.volumeInfo.title,
      author: volume.volumeInfo.authors?.[0] || '著者不明',
      isbn: extractGoogleBookIsbn(volume) || normalizedIsbn,
      imageUrl: coverCandidates[0],
      coverCandidates,
      publisher: volume.volumeInfo.publisher,
      source: 'googlebooks',
    };

    googleBookCache.set(normalizedIsbn, result);
    return result;
  } catch (error) {
    console.warn('Failed to fetch from Google Books:', error);
    googleBookCache.set(normalizedIsbn, null);
    return null;
  }
};

export const fetchBooksFromGoogleBooks = async (isbns: string[]): Promise<Book[]> => {
  const requestIsbns = Array.from(new Set(
    isbns
      .map((isbn) => normalizeIsbn(isbn))
      .filter(Boolean)
      .map((isbn) => (isIsbn10(isbn) ? toIsbn13(isbn) || isbn : isbn))
  ));
  if (requestIsbns.length === 0) return [];

  const results: Book[] = [];

  for (let i = 0; i < requestIsbns.length; i += GOOGLE_MAX_CONCURRENCY) {
    const chunk = requestIsbns.slice(i, i + GOOGLE_MAX_CONCURRENCY);
    const chunkResults = await Promise.allSettled(chunk.map((isbn) => fetchBookFromGoogleBooks(isbn)));

    chunkResults
      .filter((result): result is PromiseFulfilledResult<Book | null> => result.status === 'fulfilled')
      .map((result) => result.value)
      .filter((book): book is Book => Boolean(book))
      .forEach((book) => results.push(book));
  }

  return results;
};
