import { Book } from '../types';
import { dedupeUrls, getCorsFriendlyUrl } from './imageUtils';
import { isIsbn10, isIsbn13, normalizeIsbn, toIsbn13 } from '../utils/isbnUtils';

const GOOGLE_BOOKS_API_ENDPOINT = 'https://www.googleapis.com/books/v1/volumes';
const GOOGLE_IMAGE_KEYS = ['extraLarge', 'large', 'medium', 'small', 'thumbnail', 'smallThumbnail'] as const;

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

  try {
    const response = await fetch(`${GOOGLE_BOOKS_API_ENDPOINT}?q=isbn:${normalizedIsbn}&maxResults=5`);
    if (!response.ok) {
      throw new Error(`Google Books API Error: ${response.status}`);
    }

    const data: GoogleBooksResponse = await response.json();
    const volume = findBestMatchingVolume(data.items || [], normalizedIsbn);
    if (!volume?.volumeInfo?.title) return null;

    const coverCandidates = buildGoogleCoverCandidates(volume);
    if (coverCandidates.length === 0) return null;

    return {
      title: volume.volumeInfo.title,
      author: volume.volumeInfo.authors?.[0] || '著者不明',
      isbn: extractGoogleBookIsbn(volume) || normalizedIsbn,
      imageUrl: coverCandidates[0],
      coverCandidates,
      publisher: volume.volumeInfo.publisher,
      source: 'googlebooks',
    };
  } catch (error) {
    console.warn('Failed to fetch from Google Books:', error);
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

  const results = await Promise.allSettled(requestIsbns.map((isbn) => fetchBookFromGoogleBooks(isbn)));

  return results
    .filter((result): result is PromiseFulfilledResult<Book | null> => result.status === 'fulfilled')
    .map((result) => result.value)
    .filter((book): book is Book => Boolean(book));
};
