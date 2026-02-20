import { Book } from '../types';
import { fetchBooksFromOpenBD } from './openBdService';
import { searchBooksFromOpenLibrary } from './openLibraryService';

const NDL_API_ENDPOINT = 'https://ndlsearch.ndl.go.jp/api/opensearch';

// Helper to wrap URLs with a CORS proxy (wsrv.nl)
// This allows the canvas to export the image data without being tainted.
const getCorsFriendlyUrl = (url: string) => {
  // removing 'https://' from the source url as wsrv prefers clean urls or handling it via parameter
  // wsrv.nl usage: https://wsrv.nl/?url=...
  return `https://wsrv.nl/?url=${encodeURIComponent(url)}&output=jpg`;
};

// Fallback data in case of CORS issues or empty results
const DEMO_BOOKS: Book[] = [
  {
    title: "吾輩は猫である",
    author: "夏目漱石",
    isbn: "9784003101018",
    publisher: "岩波書店",
    imageUrl: getCorsFriendlyUrl("https://ndlsearch.ndl.go.jp/thumbnail/9784003101018.jpg")
  },
  {
    title: "銀河鉄道の夜",
    author: "宮沢賢治",
    isbn: "9784101092058",
    publisher: "新潮社",
    imageUrl: getCorsFriendlyUrl("https://ndlsearch.ndl.go.jp/thumbnail/9784101092058.jpg")
  },
  {
    title: "こころ",
    author: "夏目漱石",
    isbn: "9784101010014",
    publisher: "新潮社",
    imageUrl: getCorsFriendlyUrl("https://ndlsearch.ndl.go.jp/thumbnail/9784101010014.jpg")
  }
];

export const searchBooks = async (query: string): Promise<Book[]> => {
  if (!query) return [];

  // Construct URL for NDL OpenSearch (RSS format)
  const url = `${NDL_API_ENDPOINT}?title=${encodeURIComponent(query)}&cnt=12&dplot=RSS`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`NDL API Error: ${response.status}`);
    }
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const items = xmlDoc.querySelectorAll('item');
    const ndlBooks: Book[] = [];
    const isbns: string[] = [];

    items.forEach((item) => {
      const title = item.querySelector('title')?.textContent || '';
      const author = item.querySelector('author')?.textContent || '';
      
      // ISBN / JP-eコード抽出
      const identifiers = Array.from(item.getElementsByTagName('dc:identifier'));
      let isbn = '';
      let jpCode = ''; // JP-eコード（20桁）
      
      for (const id of identifiers) {
        const text = id.textContent?.replace(/-/g, '') || '';
        
        // JP-eコード（20桁）を優先
        if (text.length === 20 && !jpCode) {
          jpCode = text;
          continue;
        }
        
        // ISBN-13（13桁、978/979で始まる）
        if (text.length === 13 && (text.startsWith('978') || text.startsWith('979')) && !isbn) {
          isbn = text;
        }
        
        // ISBN-10（10桁）
        if (text.length === 10 && !isbn) {
          isbn = text;
        }
      }

      if (title) {
        // 書影URL生成: JP-eコード優先、次にISBN
        // JP-eコードを持つ資料は電子書籍の可能性があり、書影が異なる場合がある
        const imageIdentifier = jpCode || isbn;
        const rawImageUrl = imageIdentifier ? `https://ndlsearch.ndl.go.jp/thumbnail/${imageIdentifier}.jpg` : undefined;
        
        ndlBooks.push({
          title,
          author,
          isbn: isbn || jpCode, // ISBNがなければJP-eコードをisbnフィールドに入れる（互換性のため）
          imageUrl: rawImageUrl ? getCorsFriendlyUrl(rawImageUrl) : undefined,
          source: 'ndl',
        });

        // ISBNがあればopenBD用に保存
        if (isbn) {
          isbns.push(isbn);
        }
      }
    });

    // NDLで結果が見つかった場合、openBDで詳細を取得
    if (isbns.length > 0) {
      try {
        const openBdBooks = await fetchBooksFromOpenBD(isbns);
        
        // openBDの結果をISBNでマッピング
        const openBdMap = new Map<string, Book>();
        openBdBooks.forEach(book => {
          if (book.isbn) {
            openBdMap.set(book.isbn, { ...book, source: 'openbd' });
          }
        });

        // NDLの結果をopenBDで補完
        const enhancedBooks = ndlBooks.map(ndlBook => {
          if (ndlBook.isbn && openBdMap.has(ndlBook.isbn)) {
            const openBdBook = openBdMap.get(ndlBook.isbn)!;
            // openBDの書影があればそれを優先、なければNDLの書影を使用
            return {
              ...ndlBook,
              imageUrl: openBdBook.imageUrl || ndlBook.imageUrl,
              publisher: openBdBook.publisher || ndlBook.publisher,
              source: openBdBook.imageUrl ? 'openbd' : 'ndl',
            } as Book;
          }
          return ndlBook;
        });

        return enhancedBooks;
      } catch (openBdError) {
        console.warn('openBD fetch failed, using NDL data:', openBdError);
        return ndlBooks;
      }
    }

    // NDLで結果がない場合、Open Libraryを試す（海外作品向け）
    if (ndlBooks.length === 0) {
      console.log('No results from NDL, trying Open Library...');
      try {
        const openLibraryBooks = await searchBooksFromOpenLibrary(query, 12);
        return openLibraryBooks.map(book => ({ ...book, source: 'openlibrary' as const }));
      } catch (olError) {
        console.error('Open Library search failed:', olError);
        return [];
      }
    }

    return ndlBooks;

  } catch (error) {
    console.error("Failed to fetch from NDL. Trying Open Library as fallback.", error);
    
    // NDL失敗時はOpen Libraryにフォールバック
    try {
      const openLibraryBooks = await searchBooksFromOpenLibrary(query, 12);
      return openLibraryBooks.map(book => ({ ...book, source: 'openlibrary' as const }));
    } catch (olError) {
      console.error("Open Library also failed. Using demo data.", olError);
      // Filter demo books by query for a fake search experience
      return DEMO_BOOKS.filter(b => b.title.includes(query) || b.author.includes(query));
    }
  }
};