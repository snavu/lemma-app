import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './searchBar.css';

interface SearchResult {
  id: string,
  filePath: string,
  content: string,
  hashtags: string[]
};

interface SearchProps {
  setSearchresult: (check: boolean) => void;
  handleSearch: (searchType: string, searchQuery: string) => void;
  setSearchInput: (input: string) => void;
  setResults: (info: SearchResult[]) => void;
}

const staticOptions = ['Hashtag:', 'Keyword:'];

export const Search: React.FC<SearchProps> = ({ setSearchresult, handleSearch, setSearchInput, setResults }) => {
  const [inputValue, setInputValue] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const handleInputClick = () => {
    if (inputValue === '') {
      setShowOptions(true);
    }
  };

  const handleOptionClick = (option: string) => {
    setInputValue(option);
    setShowOptions(false);
    inputRef.current?.focus();
  };

  // pulled from app.tsx
  const debounce = (fn: (...args: any[]) => void, ms = 1000) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (this: any, ...args: any[]) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
  };

  //debounce for searching
  const debouncedHandleSearch = useMemo(() => debounce(handleSearch, 500), [handleSearch]);
  const debouncedSetSearchInput = useMemo(() => debounce((value: string) => setSearchInput(value), 500),[]);
  
  // when the user is typing
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);

    // checking if theres a prefix "hashtag:" or "keyword:"
    const trimmedValue = value.trim();
    let [prefix, val] = trimmedValue.split(":");

    if (!trimmedValue || !val || !["hashtag", "keyword"].includes(prefix.toLowerCase())) {
      if (value === "") {
        setResults([]);
      }
      console.log("Invalid search format or empty input. Skipping query.");
      return;
    }
    
    if (val.startsWith('#')) {
      val = val.slice(1);
    }

    debouncedSetSearchInput(val);
    debouncedHandleSearch(prefix, val);
    setSearchresult(true);
  };

    useEffect(() => {
      const handleClickOutside = (e: MouseEvent) => {
        if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
          console.log('Clicked outside. Current value:', inputValue);
          setInputValue('');
          setShowOptions(false);
        }
      };
    
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, [inputValue]);
    
    // keep showing the option bar until the prefix is fully typed out
    useEffect(() => {
      const lowerValue = inputValue.toLowerCase();
    
      const isExactMatch = staticOptions.some(
        option => option.toLowerCase() === lowerValue
      );
    
      const isPartialMatch = staticOptions.some(
        option => option.toLowerCase().startsWith(lowerValue) && !isExactMatch
      );
    
      setShowOptions(isPartialMatch);
    }, [inputValue]);
  

  return (
    <div className="search-container">
      <input 
        className="input-field"
        type="text"
        placeholder="Search..."
        value={inputValue}
        onClick={handleInputClick}
        onChange={handleChange}
        ref={inputRef}
      />

      {showOptions && (
        <ul ref={dropdownRef} className="option-dropdown">
          {staticOptions
            .filter(option =>
              option.toLowerCase().startsWith(inputValue.toLowerCase())
            )
            .map((option, idx) => (
              <li key={idx} onClick={() => handleOptionClick(option)} className="option-item">
                {option}
              </li>
            ))}
        </ul>
      )}
    </div>
  );

};