import { Book } from '../types';

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
      const isbn = doc.isbn?.[0] || ''; // 最初のISBNを使用
      const publisher = doc.publisher?.[0] || undefined;

      // 書影URL生成
      let imageUrl: string | undefined;
      if (isbn) {
        // ISBNから書影URLを生成（Lサイズ=高解像度）
        imageUrl = `${OPENLIBRARY_COVERS_ENDPOINT}/isbn/${isbn}-L.jpg`;
      } else if (doc.cover_i) {
        // cover_iから書影URLを生成
        imageUrl = `${OPENLIBRARY_COVERS_ENDPOINT}/id/${doc.cover_i}-L.jpg`;
      }

      if (title) {
        books.push({
          title,
          author,
          isbn,
          imageUrl,
          publisher,
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
 * ISBNから書影URLを生成
 * @param isbn ISBN
 * @param size サイズ（S, M, L）デフォルトはL（高解像度）
 * @returns 書影URL
 */
export const getCoverUrlByISBN = (isbn: string, size: 'S' | 'M' | 'L' = 'L'): string => {
  return `${OPENLIBRARY_COVERS_ENDPOINT}/isbn/${isbn}-${size}.jpg`;
};

/**
 * Cover IDから書影URLを生成
 * @param coverId Cover ID
 * @param size サイズ（S, M, L）デフォルトはL（高解像度）
 * @returns 書影URL
 */
export const getCoverUrlByCoverId = (coverId: number, size: 'S' | 'M' | 'L' = 'L'): string => {
  return `${OPENLIBRARY_COVERS_ENDPOINT}/id/${coverId}-${size}.jpg`;
};
