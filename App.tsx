import React, { useState } from 'react';
import { Header } from './components/Header';
import { SearchSection } from './components/SearchSection';
import { EditorSection } from './components/EditorSection';
import { Book } from './types';

function App() {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);

  const handleSelectBook = (book: Book) => {
    setSelectedBook(book);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleBack = () => {
    setSelectedBook(null);
  };

  return (
    <div className="min-h-screen bg-brand-50 font-sans text-brand-900 flex flex-col">
      <Header />
      
      <main className="flex-1 flex flex-col py-8 px-4">
        {!selectedBook ? (
          <div className="animate-in fade-in zoom-in duration-300">
            <SearchSection onSelectBook={handleSelectBook} />
          </div>
        ) : (
          <div className="animate-in slide-in-from-right duration-300">
            <EditorSection book={selectedBook} onBack={handleBack} />
          </div>
        )}
      </main>

      <footer className="py-6 text-center text-brand-400 text-xs border-t border-brand-100 mt-auto">
        <p>© 2024 bookObiMaker</p>
        <p className="mt-1">
          国立国会図書館サーチAPIを使用しています。
          <br/>
          生成された画像の著作権は各権利者に帰属します。私的使用の範囲内でご利用ください。
        </p>
      </footer>
    </div>
  );
}

export default App;
