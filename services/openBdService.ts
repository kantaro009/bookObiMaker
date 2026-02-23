import { Book } from '../types';
import { getCorsFriendlyUrl } from './imageUtils';
import { normalizeIsbn } from '../utils/isbnUtils';

const OPENBD_API_ENDPOINT = 'https://api.openbd.jp/v1';

interface OpenBDBook {
  summary?: {
    isbn?: string;
    title?: string;
    author?: string;
    publisher?: string;
    cover?: string;
  };
  onix?: {
    DescriptiveDetail?: {
      TitleDetail?: {
        TitleElement?: Array<{
          TitleText?: {
            content?: string;
          };
        }>;
      };
      Contributor?: Array<{
        PersonName?: {
          content?: string;
        };
      }>;
    };
  };
}

/**
 * openBD APIからISBNで書誌情報を取得
 * @param isbns ISBN配列（最大1000件まで）
 * @returns Book配列
 */
export const fetchBooksFromOpenBD = async (isbns: string[]): Promise<Book[]> => {
  if (!isbns || isbns.length === 0) return [];

  // ISBNをカンマ区切りで連結（最大1000件）
  const isbnQuery = isbns.slice(0, 1000).join(',');
  const url = `${OPENBD_API_ENDPOINT}/get?isbn=${isbnQuery}`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`openBD API Error: ${response.status}`);
    }

    const data: (OpenBDBook | null)[] = await response.json();
    const books: Book[] = [];

    data.forEach((item, index) => {
      if (!item) return; // null の場合はスキップ

      const summary = item.summary;
      const onix = item.onix;

      // タイトル取得（summary優先、なければonixから）
      let title = summary?.title || '';
      if (!title && onix?.DescriptiveDetail?.TitleDetail?.TitleElement?.[0]?.TitleText?.content) {
        title = onix.DescriptiveDetail.TitleDetail.TitleElement[0].TitleText.content;
      }

      // 著者取得（summary優先、なければonixから）
      let author = summary?.author || '';
      if (!author && onix?.DescriptiveDetail?.Contributor?.[0]?.PersonName?.content) {
        author = onix.DescriptiveDetail.Contributor[0].PersonName.content;
      }

      // ISBN取得
      const isbn = normalizeIsbn(summary?.isbn || isbns[index] || '');

      // 書影URL取得（summary.cover）
      const rawImageUrl = summary?.cover || undefined;
      const imageUrl = rawImageUrl ? getCorsFriendlyUrl(rawImageUrl) : undefined;

      // 出版社取得
      const publisher = summary?.publisher || undefined;

      if (title && isbn) {
        books.push({
          title,
          author: author || '著者不明',
          isbn,
          imageUrl,
          publisher,
        });
      }
    });

    return books;
  } catch (error) {
    console.error('Failed to fetch from openBD:', error);
    return [];
  }
};

/**
 * 単一ISBNで書誌情報を取得
 * @param isbn ISBN
 * @returns Book | null
 */
export const fetchBookFromOpenBD = async (isbn: string): Promise<Book | null> => {
  const books = await fetchBooksFromOpenBD([isbn]);
  return books.length > 0 ? books[0] : null;
};
