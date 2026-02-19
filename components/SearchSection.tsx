import React, { useState, FormEvent } from 'react';
import { Search, Book as BookIcon } from 'lucide-react';
import { Button } from './Button';
import { Book } from '../types';
import { searchBooks } from '../services/ndlService';

interface SearchSectionProps {
  onSelectBook: (book: Book) => void;
}

export const SearchSection: React.FC<SearchSectionProps> = ({ onSelectBook }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Book[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSearch = async (e: FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;

    setIsLoading(true);
    setHasSearched(true);
    setError(null);
    setResults([]);

    try {
      const books = await searchBooks(query);
      setResults(books);
    } catch (err) {
      setError("検索中にエラーが発生しました。");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto p-4 flex flex-col items-center">
      <div className="w-full max-w-lg mb-10 text-center">
        <h2 className="text-2xl font-serif font-bold text-brand-800 mb-4">
          帯を作りたい本を探す
        </h2>
        <p className="text-brand-600 mb-6">
          タイトルや著者名を入力してください。<br/>
          国会図書館サーチから書影を取得します。
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
              key={`${book.isbn}-${index}`}
              onClick={() => onSelectBook(book)}
              className="flex flex-col items-start text-left bg-white rounded-lg shadow-sm hover:shadow-md hover:scale-[1.02] transition-all duration-200 p-3 border border-brand-100 group"
            >
              <div className="w-full aspect-[2/3] bg-brand-50 rounded mb-3 overflow-hidden flex items-center justify-center relative">
                {book.imageUrl ? (
                  <img 
                    src={book.imageUrl} 
                    alt={book.title} 
                    className="w-full h-full object-cover"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = 'https://placehold.co/400x600/f2e8e5/a18072?text=No+Image';
                    }}
                  />
                ) : (
                  <BookIcon size={40} className="text-brand-300" />
                )}
                <div className="absolute inset-0 bg-brand-900/0 group-hover:bg-brand-900/10 transition-colors" />
              </div>
              <h3 className="font-bold text-brand-900 line-clamp-2 text-sm mb-1">
                {book.title}
              </h3>
              <p className="text-xs text-brand-500 line-clamp-1">
                {book.author}
              </p>
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