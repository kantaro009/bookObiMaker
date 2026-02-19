import { Book } from '../types';

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
  // Note: Using a proxy service might be required in production for CORS, 
  // but for this demo we attempt direct access and fallback gracefully.
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
    const books: Book[] = [];

    items.forEach((item) => {
      const title = item.querySelector('title')?.textContent || '';
      const author = item.querySelector('author')?.textContent || '';
      // NDL often returns ISBN in <dc:identifier xsi:type="dc:ISBN"> or similar.
      // In RSS, it's often in identifiers. 
      // Simplified parsing logic for demo:
      const identifiers = Array.from(item.getElementsByTagName('dc:identifier'));
      let isbn = '';
      
      for (const id of identifiers) {
        const text = id.textContent?.replace(/-/g, '') || '';
        // Basic check for ISBN-13 or ISBN-10
        if (text.length === 13 && (text.startsWith('978') || text.startsWith('979'))) {
          isbn = text;
          break;
        }
        if (text.length === 10) {
          isbn = text;
          break;
        }
      }

      if (title) {
        // Use the proxy wrapper for the image URL
        const rawImageUrl = isbn ? `https://ndlsearch.ndl.go.jp/thumbnail/${isbn}.jpg` : undefined;
        
        books.push({
          title,
          author,
          isbn,
          imageUrl: rawImageUrl ? getCorsFriendlyUrl(rawImageUrl) : undefined
        });
      }
    });

    if (books.length === 0) {
       console.warn("No books found or parsing failed, returning empty.");
    }
    
    return books;

  } catch (error) {
    console.error("Failed to fetch from NDL (likely CORS or network error). Using demo data.", error);
    // Filter demo books by query for a fake search experience
    return DEMO_BOOKS.filter(b => b.title.includes(query) || b.author.includes(query));
  }
};