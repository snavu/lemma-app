import React, { useState, useCallback } from 'react';
import './searchBar.css';

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
  
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSetSearchInput(value);
    debouncedHandleSearch(value);
    setSearchresult(true);
  };

  const debouncedHandleSearch = useCallback(
    debounce((searchTerm: string) => {
      handleSearch(searchTerm);
    }, 300),
    [handleSearch]
  );

  const debouncedSetSearchInput = useCallback(
    debounce((value: string) => {
      setSearchInput(value);
    }, 300),
    []
  );

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