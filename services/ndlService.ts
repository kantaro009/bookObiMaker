import { Book } from '../types';
import { fetchBooksFromOpenBD } from './openBdService';
import { fetchBooksFromGoogleBooks } from './googleBooksService';
import { buildOpenLibraryCoverCandidates, searchBooksFromOpenLibrary, findIsbnByTitleAuthor } from './openLibraryService';
import { dedupeUrls, getCorsFriendlyUrl } from './imageUtils';
import { normalizeIsbn, isIsbn10, isIsbn13, pickPreferredIsbn } from '../utils/isbnUtils';
import { normalizeForMatch } from '../utils/textMatchUtils';

const NDL_API_ENDPOINT = 'https://ndlsearch.ndl.go.jp/api/opensearch';

// Fallback data in case of CORS issues or empty results
const DEMO_BOOKS: Book[] = [
  {
    title: "吾輩は猫である",
    author: "夏目漱石",
    isbn: "9784003101018",
    publisher: "岩波書店",
    imageUrl: getCorsFriendlyUrl("https://ndlsearch.ndl.go.jp/thumbnail/9784003101018.jpg"),
    source: 'ndl'
  },
  {
    title: "銀河鉄道の夜",
    author: "宮沢賢治",
    isbn: "9784101092058",
    publisher: "新潮社",
    imageUrl: getCorsFriendlyUrl("https://ndlsearch.ndl.go.jp/thumbnail/9784101092058.jpg"),
    source: 'ndl'
  },
  {
    title: "こころ",
    author: "夏目漱石",
    isbn: "9784101010014",
    publisher: "新潮社",
    imageUrl: getCorsFriendlyUrl("https://ndlsearch.ndl.go.jp/thumbnail/9784101010014.jpg"),
    source: 'ndl'
  }
];

/**
 * NDLから書籍情報を検索
 */
async function fetchFromNDL(query: string): Promise<Book[]> {
  const fetchNdlByField = async (field: 'title' | 'creator') => {
    const url = `${NDL_API_ENDPOINT}?${field}=${encodeURIComponent(query)}&cnt=12&dplot=RSS`;
    const response = await fetch(url);
    if (!response.ok) throw new Error(`NDL API Error: ${response.status}`);
    const xmlText = await response.text();
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
    return xmlDoc.querySelectorAll('item');
  };

  const ndlBooks: Book[] = [];

  const extractIsbnFromUrl = (url: string): string | null => {
    if (!url) return null;
    const match13 = url.match(/(97[89]\d{10})/);
    if (match13) return match13[1];
    if (url.toLowerCase().includes('isbn')) {
      const match10 = url.match(/(\d{9}[0-9X])/);
      if (match10) return match10[1];
    }
    return null;
  };

  const isIsbnForOpenLibrary = (value: string): boolean => {
    return isIsbn10(value) || isIsbn13(value);
  };

  const pushBooksFromItems = (items: NodeListOf<Element>) => {
    items.forEach((item) => {
    const title = item.querySelector('title')?.textContent || '';
    const author = item.querySelector('author')?.textContent || '';
    const categories = Array.from(item.getElementsByTagName('category'))
      .map((node) => node.textContent?.trim() || '')
      .filter(Boolean);
    const isBook = categories.includes('図書');
    if (!isBook) return;
    
    // NDL OpenSearch specific identifiers
    const identifiers = Array.from(item.getElementsByTagName('dc:identifier'));
    let isbn = '';
    let jpCode = ''; // JP-eコード（20桁）
    
    for (const id of identifiers) {
      const raw = id.textContent || '';
      // 例: "urn:isbn:978-4-16-392066-5" のような接頭辞や記号を除去
      const normalized = normalizeIsbn(raw);
      if (!normalized) continue;

      // JP-eコード（20桁）
      if (normalized.length === 20 && !jpCode) {
        jpCode = normalized;
        continue;
      }

      // ISBN-13
      if (isIsbn13(normalized) && !isbn) {
        isbn = normalized;
      }

      if (isIsbn10(normalized) && !isbn) {
        isbn = normalized;
      }
    }

    // rdfs:seeAlso からISBN補完（books.or.jp など）
    if (!isbn) {
      const seeAlsoNodes = Array.from(item.getElementsByTagName('rdfs:seeAlso'));
      const candidates: string[] = [];

      for (const node of seeAlsoNodes) {
        const url = node.getAttribute('rdf:resource') || '';
        const found = extractIsbnFromUrl(url);
        if (found) candidates.push(found);
      }

      const preferred = pickPreferredIsbn(candidates);
      isbn = preferred || isbn;
    }

    if (title) {
      const imageIdentifier = jpCode || isbn;
      const rawImageUrl = imageIdentifier ? `https://ndlsearch.ndl.go.jp/thumbnail/${imageIdentifier}.jpg` : undefined;
      const coverCandidates = dedupeUrls([rawImageUrl ? getCorsFriendlyUrl(rawImageUrl) : undefined]);
      const finalIsbn = isbn || jpCode;
      
      ndlBooks.push({
        title,
        author,
        isbn: finalIsbn || undefined,
        imageUrl: coverCandidates[0],
        coverCandidates,
        source: 'ndl',
      });
    }
    });
  };

  const [titleResult, creatorResult] = await Promise.allSettled([
    fetchNdlByField('title'),
    fetchNdlByField('creator'),
  ]);

  if (titleResult.status === 'fulfilled') {
    pushBooksFromItems(titleResult.value);
  }
  if (creatorResult.status === 'fulfilled') {
    pushBooksFromItems(creatorResult.value);
  }

  if (titleResult.status === 'rejected' && creatorResult.status === 'rejected') {
    throw titleResult.reason;
  }

  const uniqueNdlBooks = Array.from(
    new Map(
      ndlBooks.map((book) => {
        const key = `${book.isbn || ''}|${normalizeForMatch(book.title)}|${normalizeForMatch(book.author)}`;
        return [key, book] as const;
      })
    ).values()
  );

  // Open LibraryでISBN補完（タイトル+著者一致）
  const normalizedBooks = await Promise.all(
    uniqueNdlBooks.map(async (book) => {
      if (book.isbn) return book;
      const complemented = await findIsbnByTitleAuthor(book.title, book.author);
      if (!complemented) return book;
      return {
        ...book,
        isbn: complemented,
      } as Book;
    })
  );

  // openBDでの補完
  const isbns = normalizedBooks.map(b => b.isbn).filter(Boolean) as string[];
  if (isbns.length > 0) {
    try {
      const openBdBooks = await fetchBooksFromOpenBD(isbns);
      const openBdMap = new Map(openBdBooks.map(b => [b.isbn, b]));

      return normalizedBooks.map(ndlBook => {
        const isbnValue = ndlBook.isbn || '';
        const bdBook = isbnValue ? openBdMap.get(isbnValue) : undefined;
        const fallbackOlCovers = isbnValue && isIsbnForOpenLibrary(isbnValue)
          ? buildOpenLibraryCoverCandidates({ isbn: isbnValue })
          : [];
        const coverCandidates = dedupeUrls([
          ...(bdBook?.coverCandidates || []),
          ...(ndlBook.coverCandidates || []),
          ...fallbackOlCovers,
        ]);
        const imageUrl = coverCandidates[0];

        if (bdBook || fallbackOlCovers.length > 0) {
          return {
            ...ndlBook,
            imageUrl,
            coverCandidates,
            publisher: bdBook?.publisher || ndlBook.publisher,
            source: bdBook?.imageUrl ? 'openbd' : ndlBook.imageUrl ? 'ndl' : fallbackOlCovers.length > 0 ? 'openlibrary' : 'ndl',
          };
        }
        return ndlBook;
      });
    } catch (e) {
      console.warn('openBD complement failed:', e);
      return normalizedBooks;
    }
  }

  return normalizedBooks;
}

export const searchBooks = async (query: string): Promise<Book[]> => {
  if (!query) return [];

  // NDLとOpen Libraryを並行して検索し、取得率を最大化する
  const [ndlResults, olResults] = await Promise.allSettled([
    fetchFromNDL(query),
    searchBooksFromOpenLibrary(query, 12)
  ]);

  const ndlBooks = ndlResults.status === 'fulfilled' ? ndlResults.value.map((b) => ({ ...b })) : [];
  const olBooks = olResults.status === 'fulfilled' ? olResults.value : [];
  const books: Book[] = [...ndlBooks];

  const ndlMap = new Map<string, Book>();
  ndlBooks.forEach((book) => {
    const key = `${normalizeForMatch(book.title)}|${normalizeForMatch(book.author)}`;
    if (key !== '|') ndlMap.set(key, book);
  });

  const seenIsbns = new Set<string>(
    ndlBooks.map((b) => b.isbn).filter((isbn): isbn is string => Boolean(isbn))
  );

  // Open Library の結果を統合（タイトル+著者一致ならNDL優先）
  olBooks.forEach((book) => {
    const key = `${normalizeForMatch(book.title)}|${normalizeForMatch(book.author)}`;
    const ndlMatch = ndlMap.get(key);
    if (ndlMatch) {
      if (!ndlMatch.isbn && book.isbn) {
        ndlMatch.isbn = book.isbn;
      }
      ndlMatch.coverCandidates = dedupeUrls([
        ...(ndlMatch.coverCandidates || []),
        ...(book.coverCandidates || []),
        book.imageUrl,
      ]);
      if (!ndlMatch.imageUrl && ndlMatch.coverCandidates[0]) {
        ndlMatch.imageUrl = ndlMatch.coverCandidates[0];
        ndlMatch.source = 'openlibrary';
      }
      return;
    }

    if (book.isbn && seenIsbns.has(book.isbn)) return;
    if (book.isbn) seenIsbns.add(book.isbn);
    const coverCandidates = dedupeUrls([book.imageUrl, ...(book.coverCandidates || [])]);
    books.push({
      ...book,
      imageUrl: coverCandidates[0],
      coverCandidates,
    });
  });

  // 両方のAPIがエラーまたは結果ゼロの場合、デモデータをフィルタリングして返す
  if (books.length === 0) {
    const lowerQuery = query.toLowerCase();
    const demoMatches = DEMO_BOOKS.filter(b => 
      b.title.toLowerCase().includes(lowerQuery) || 
      b.author.toLowerCase().includes(lowerQuery)
    );
    if (demoMatches.length > 0) return demoMatches;
  }

  const mergedBooks = books.map((book) => {
    const coverCandidates = dedupeUrls([book.imageUrl, ...(book.coverCandidates || [])]);
    return {
      ...book,
      imageUrl: coverCandidates[0],
      coverCandidates,
    };
  });

  const isbns = mergedBooks
    .map((book) => normalizeIsbn(book.isbn))
    .filter((isbn): isbn is string => Boolean(isbn));
  if (isbns.length === 0) return mergedBooks;

  try {
    const googleBooks = await fetchBooksFromGoogleBooks(isbns);
    const googleBookMap = new Map(
      googleBooks
        .map((book) => {
          const isbn = normalizeIsbn(book.isbn);
          return isbn ? [isbn, book] as const : null;
        })
        .filter((entry): entry is readonly [string, Book] => Boolean(entry))
    );

    return mergedBooks.map((book) => {
      const isbn = normalizeIsbn(book.isbn);
      const googleBook = isbn ? googleBookMap.get(isbn) : undefined;
      const coverCandidates = dedupeUrls([
        ...(book.coverCandidates || []),
        ...(googleBook?.coverCandidates || []),
      ]);

      return {
        ...book,
        imageUrl: coverCandidates[0],
        coverCandidates,
        publisher: book.publisher || googleBook?.publisher,
      };
    });
  } catch (error) {
    console.warn('Google Books complement failed:', error);
    return mergedBooks;
  }
};
