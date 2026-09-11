import React from 'react';

const SearchBar: React.FC = () => {
  return (
    <div className="relative group z-20">
      <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
        <span className="material-symbols-outlined text-primary/80 text-[24px]">
          search
        </span>
      </div>
      <input
        className="block w-full pl-12 pr-14 py-4.5 py-4 rounded-2xl border-0 glass-morphism dark:bg-slate-800/60 dark:border-white/10 text-text-main dark:text-white placeholder:text-text-muted transition-all font-medium focus:ring-2 focus:ring-primary/30 shadow-soft focus:shadow-lg hover:bg-white/80 dark:hover:bg-slate-800/80 outline-none"
        placeholder="搜索城市、地标..."
        type="text"
      />
      <div className="absolute inset-y-0 right-2 flex items-center">
        <button className="p-2.5 bg-gradient-to-br from-primary to-blue-600 hover:to-blue-700 rounded-xl text-white shadow-lg shadow-primary/20 transition-all active:scale-95 flex items-center justify-center">
          <span className="material-symbols-outlined text-[20px]">tune</span>
        </button>
      </div>
    </div>
  );
};

export default SearchBar;
