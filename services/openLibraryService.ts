import { Book } from '../types';
import { getCorsFriendlyUrl } from './imageUtils';
import { pickPreferredIsbn } from '../utils/isbnUtils';

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
    publisher?: string[];
    first_publish_year?: number;
  }>;
}

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
      const publisher = doc.publisher?.[0] || undefined;

      // 書影URL生成
      let imageUrl: string | undefined;
      if (isbn) {
        // ISBNから書影URLを生成（Lサイズ=高解像度）
        // default=false を追加して、画像がない場合に404を返すようにする（wsrv.nlがよしなに処理してくれることを期待、またはonErrorで対応）
        const rawUrl = `${OPENLIBRARY_COVERS_ENDPOINT}/isbn/${isbn}-L.jpg?default=false`;
        imageUrl = getCorsFriendlyUrl(rawUrl);
      } else if (doc.cover_i) {
        // cover_iから書影URLを生成
        const rawUrl = `${OPENLIBRARY_COVERS_ENDPOINT}/id/${doc.cover_i}-L.jpg?default=false`;
        imageUrl = getCorsFriendlyUrl(rawUrl);
      }

      if (title) {
        books.push({
          title,
          author,
          isbn,
          imageUrl,
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

const normalizeForMatch = (value: string): string => {
  return value
    .toLowerCase()
    .replace(/[\s\u3000]/g, '')
    .replace(/["'“”‘’()（）\[\]【】:：\-–—・]/g, '');
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

/**
 * Cover IDから書影URLを生成
 * @param coverId Cover ID
 * @param size サイズ（S, M, L）デフォルトはL（高解像度）
 * @returns 書影URL
 */
export const getCoverUrlByCoverId = (coverId: number, size: 'S' | 'M' | 'L' = 'L'): string => {
  return getCorsFriendlyUrl(`${OPENLIBRARY_COVERS_ENDPOINT}/id/${coverId}-${size}.jpg?default=false`);
};
