import React, { FormEvent, useEffect, useMemo, useState } from 'react';
import { Search, Book as BookIcon } from 'lucide-react';
import { Button } from './Button';
import { Book } from '../types';

interface SearchSectionProps {
  query: string;
  setQuery: (query: string) => void;
  results: Book[];
  isLoading: boolean;
  hasSearched: boolean;
  error: string | null;
  onSearch: (query: string) => void;
  onSelectBook: (book: Book) => void;
}

const PLACEHOLDER_IMAGE = 'https://placehold.co/400x600/f2e8e5/a18072?text=No+Image';

const BookCover: React.FC<{ book: Book }> = ({ book }) => {
  const candidates = useMemo(
    () => Array.from(new Set([book.imageUrl, ...(book.coverCandidates || [])].filter(Boolean))) as string[],
    [book.imageUrl, book.coverCandidates]
  );
  const [index, setIndex] = useState(0);
  const [isExhausted, setIsExhausted] = useState(false);

  useEffect(() => {
    setIndex(0);
    setIsExhausted(false);
  }, [book.title, book.isbn, candidates.join('|')]);

  if (candidates.length === 0 || isExhausted) {
    return <img src={PLACEHOLDER_IMAGE} alt={book.title} className="w-full h-full object-cover" />;
  }

  return (
    <img
      src={candidates[index]}
      alt={book.title}
      className="w-full h-full object-cover"
      onError={() => {
        setIndex((prev) => {
          const next = prev + 1;
          if (next < candidates.length) return next;
          setIsExhausted(true);
          return prev;
        });
      }}
    />
  );
};

export const SearchSection: React.FC<SearchSectionProps> = ({ 
  query,
  setQuery,
  results,
  isLoading,
  hasSearched,
  error,
  onSearch,
  onSelectBook 
}) => {
  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    onSearch(query);
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center">
      <div className="w-full max-w-lg mb-10 text-center">
        <h2 className="text-2xl font-serif font-bold text-brand-800 mb-4">
          帯を作りたい本を探す
        </h2>
        <p className="text-brand-600 mb-6">
          タイトルや著者名を入力してください。<br/>
          国内作品は国会図書館・openBD、海外作品はOpen Libraryから書影を取得します。
        </p>
        
        <form onSubmit={handleSearch} className="relative w-full">
          <div className="relative flex items-center">
            <Search className="absolute left-3 text-brand-400" size={20} />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="例: こころ、夏目漱石..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-brand-200 focus:border-brand-500 focus:ring-2 focus:ring-brand-200 outline-none shadow-sm text-lg transition-all bg-white text-brand-900"
            />
            <Button 
              type="submit" 
              className="absolute right-1 top-1 bottom-1"
              isLoading={isLoading}
            >
              検索
            </Button>
          </div>
        </form>
      </div>

      <div className="w-full">
        {hasSearched && !isLoading && results.length === 0 && !error && (
          <div className="text-center text-brand-500 py-10">
            見つかりませんでした。別のキーワードをお試しください。
          </div>
        )}

        {error && (
          <div className="text-center text-red-500 py-10">
            {error}
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
          {results.map((book, index) => (
            <button
              key={`${book.isbn || book.title}-${index}`}
              onClick={() => onSelectBook(book)}
              className="flex flex-col items-start text-left bg-white rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 p-3 border border-brand-100 group"
            >
              <div className="w-full aspect-[2/3] bg-brand-50 rounded mb-3 overflow-hidden flex items-center justify-center relative">
                {book.imageUrl ? (
                  <BookCover book={book} />
                ) : (
                  <BookIcon size={40} className="text-brand-300" />
                )}
                {book.source && (
                  <div className="absolute top-1 right-1 px-1.5 py-0.5 bg-brand-900/60 text-white text-[8px] rounded uppercase backdrop-blur-sm">
                    {book.source === 'openlibrary' ? 'International' : book.source === 'googlebooks' ? 'Google Books' : book.source}
                  </div>
                )}
                <div className="absolute inset-0 bg-brand-900/0 group-hover:bg-brand-900/10 transition-colors" />
              </div>
              <h3 className="font-bold text-brand-900 line-clamp-2 text-sm mb-1">
                {book.title}
              </h3>
              <p className="text-xs text-brand-500 line-clamp-1">
                {book.author}
              </p>
              {book.isbn && (
                <p className="text-[10px] text-brand-400 mt-1">
                  ISBN: {book.isbn}
                </p>
              )}
              {book.publisher && (
                <p className="text-[10px] text-brand-400 mt-1">
                  {book.publisher}
                </p>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
