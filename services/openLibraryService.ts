import { Book } from '../types';
import { dedupeUrls, getCorsFriendlyUrl } from './imageUtils';
import { pickPreferredIsbn } from '../utils/isbnUtils';
import { normalizeForMatch } from '../utils/textMatchUtils';

const OPENLIBRARY_SEARCH_ENDPOINT = 'https://openlibrary.org/search.json';
const OPENLIBRARY_COVERS_ENDPOINT = 'https://covers.openlibrary.org/b';

interface OpenLibrarySearchResult {
  numFound: number;
  docs: Array<{
    title?: string;
    author_name?: string[];
    isbn?: string[];
    cover_i?: number;
    cover_edition_key?: string;
    edition_key?: string[];
    publisher?: string[];
    first_publish_year?: number;
  }>;
}

type CoverSize = 'S' | 'M' | 'L';
const COVER_SIZES: CoverSize[] = ['L', 'M', 'S'];

/**
 * Open Library Search APIで書籍検索
 * @param query 検索クエリ（タイトルまたは著者）
 * @param limit 取得件数（デフォルト12）
 * @returns Book配列
 */
export const searchBooksFromOpenLibrary = async (
  query: string,
  limit: number = 12
): Promise<Book[]> => {
  if (!query) return [];
  if (query.trim().length < 3) return [];

  const url = `${OPENLIBRARY_SEARCH_ENDPOINT}?q=${encodeURIComponent(query)}&limit=${limit}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Open Library API Error: ${response.status}`);
    }

    const data: OpenLibrarySearchResult = await response.json();
    const books: Book[] = [];

    data.docs.forEach((doc) => {
      const title = doc.title || '';
      const author = doc.author_name?.[0] || '著者不明';
      const isbn = pickPreferredIsbn(doc.isbn);
      const olid = doc.cover_edition_key || doc.edition_key?.[0];
      const publisher = doc.publisher?.[0] || undefined;
      const coverCandidates = buildOpenLibraryCoverCandidates({
        isbn,
        olid,
        coverId: doc.cover_i,
      });
      const imageUrl = coverCandidates[0];

      if (title) {
        books.push({
          title,
          author,
          isbn,
          imageUrl,
          coverCandidates,
          publisher,
          source: 'openlibrary',
        });
      }
    });

    return books;
  } catch (error) {
    console.error('Failed to fetch from Open Library:', error);
    return [];
  }
};

/**
 * タイトル/著者からOpen LibraryでISBNを補完取得
 * @param title 書名
 * @param author 著者名
 * @returns ISBN or null
 */
export const findIsbnByTitleAuthor = async (title: string, author?: string): Promise<string | null> => {
  if (!title) return null;
  const url = `${OPENLIBRARY_SEARCH_ENDPOINT}?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author || '')}&limit=5`;

  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const data: OpenLibrarySearchResult = await response.json();

    const normTitle = normalizeForMatch(title);
    const normAuthor = normalizeForMatch(author || '');

    for (const doc of data.docs) {
      const docTitle = normalizeForMatch(doc.title || '');
      const docAuthor = normalizeForMatch(doc.author_name?.[0] || '');

      const titleMatch = docTitle && (docTitle === normTitle || docTitle.includes(normTitle) || normTitle.includes(docTitle));
      const authorMatch = !normAuthor || (docAuthor && (docAuthor === normAuthor || docAuthor.includes(normAuthor) || normAuthor.includes(docAuthor)));

      if (titleMatch && authorMatch) {
        const isbn = pickPreferredIsbn(doc.isbn);
        if (isbn) return isbn;
      }
    }
  } catch (error) {
    console.warn('Open Library ISBN complement failed:', error);
  }

  return null;
};

/**
 * ISBNから書影URLを生成
 * @param isbn ISBN
 * @param size サイズ（S, M, L）デフォルトはL（高解像度）
 * @returns 書影URL
 */
export const getCoverUrlByISBN = (isbn: string, size: 'S' | 'M' | 'L' = 'L'): string => {
  return getCorsFriendlyUrl(`${OPENLIBRARY_COVERS_ENDPOINT}/isbn/${isbn}-${size}.jpg?default=false`);
};

export const getCoverUrlByOLID = (olid: string, size: 'S' | 'M' | 'L' = 'L'): string => {
  return getCorsFriendlyUrl(`${OPENLIBRARY_COVERS_ENDPOINT}/olid/${olid}-${size}.jpg?default=false`);
};

/**
 * Cover IDから書影URLを生成
 * @param coverId Cover ID
 * @param size サイズ（S, M, L）デフォルトはL（高解像度）
 * @returns 書影URL
 */
export const getCoverUrlByCoverId = (coverId: number, size: 'S' | 'M' | 'L' = 'L'): string => {
  return getCorsFriendlyUrl(`${OPENLIBRARY_COVERS_ENDPOINT}/id/${coverId}-${size}.jpg?default=false`);
};

export const buildOpenLibraryCoverCandidates = ({
  isbn,
  olid,
  coverId,
}: {
  isbn?: string;
  olid?: string;
  coverId?: number;
}): string[] => {
  const urls: string[] = [];

  if (isbn) {
    COVER_SIZES.forEach((size) => urls.push(getCoverUrlByISBN(isbn, size)));
  }
  if (olid) {
    COVER_SIZES.forEach((size) => urls.push(getCoverUrlByOLID(olid, size)));
  }
  if (coverId) {
    COVER_SIZES.forEach((size) => urls.push(getCoverUrlByCoverId(coverId, size)));
  }

  return dedupeUrls(urls);
};
