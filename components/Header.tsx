import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

export const Header: React.FC = () => {
  return (
    <header className="w-full py-4 px-6 bg-white shadow-sm border-b border-brand-100 flex items-center justify-between sticky top-0 z-50">
      <div className="flex items-center gap-2">
        <div className="p-2 bg-brand-600 rounded-lg text-white">
          <BookOpen size={20} />
        </div>
        <div>
          <h1 className="text-xl font-bold text-brand-900 leading-tight font-serif tracking-wide">bookObiMaker</h1>
          <p className="text-xs text-brand-500">勝手に本の帯メーカー</p>
        </div>
      </div>
      <div className="hidden sm:block text-sm text-brand-400">
        Powered by NDL API
      </div>
    </header>
  );
};