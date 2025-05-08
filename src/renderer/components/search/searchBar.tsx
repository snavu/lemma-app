import React, { useState, useMemo, useEffect } from 'react';
import './searchBar.css';

interface SearchResult {
  id: string,
  filePath: string,
  content: string,
  hashtags: string[]
};

interface SearchProps {
  setSearchresult: (check: boolean) => void;
  handleSearch: (searchQuery: string) => void;
  setSearchInput: (input: string) => void;
}

export const Search: React.FC<SearchProps> = ({ setSearchresult, handleSearch, setSearchInput }) => {
  const [inputValue, setInputValue] = useState('');

  // pulled from app.tsx
  const debounce = (fn: (...args: any[]) => void, ms = 1000) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: any, ...args: any[]) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
  };
  
  // when the user is typing
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSetSearchInput(value);
    debouncedHandleSearch(value);
    setSearchresult(true);
  };

  //debounce for searching
  const debouncedHandleSearch = useMemo(() => debounce(handleSearch, 300), [handleSearch]);
  const debouncedSetSearchInput = useMemo(() => debounce((value: string) => setSearchInput(value), 300),[]);
  
  return (
    <div className="search-container">
      <input 
        className="input-field"
        type="text"
        placeholder="Search..."
        value={inputValue}
        onChange={handleChange}
      />
    </div>
  );
};