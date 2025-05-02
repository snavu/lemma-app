import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './search.css';

interface SearchProps {
  setSearchresult: (check: boolean) => void;
  handleSearch: () => void;
  setSearchInput: (input: string) => void;
}

interface SearchInput {
  type: string;
  input: string;
}

const staticOptions = ['Hashtag: ', 'Keyword: '];

export const Search: React.FC<SearchProps> = ({ setSearchresult, handleSearch, setSearchInput }) => {
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
  const debouncedHandleSearch = useMemo(() => debounce(handleSearch, 1000), [handleSearch]);
  const debouncedSetSearchInput = useMemo(() => debounce((value: string) => setSearchInput(value), 1000),[]);
  
  // when the user is typing
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    debouncedSetSearchInput(value);
    debouncedHandleSearch();
    setSearchresult(true);

    const lowerValue = value.toLowerCase();
  
    const isExactMatch = staticOptions.some(
      option => option.toLowerCase() === lowerValue
    );
    
    // if exact match then don't show
    const isPartialMatch = staticOptions.some(
      option => option.toLowerCase().startsWith(lowerValue) && !isExactMatch
    );

    setShowOptions(isPartialMatch);
  };

    // // Handle click event to close the dropdown if clicked outside
    // const handleClickOutside = (e: MouseEvent) => {
    //   if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
    //     console.log(inputValue);
    //     setInputValue('');
    //     setShowOptions(false);
    //   }
    // };
  
    // useEffect(() => {
    //   document.addEventListener('mousedown', handleClickOutside);
    //   return () => {
    //     document.removeEventListener('mousedown', handleClickOutside);
    //   };
    // }, []);

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
  

  return (
    <div>
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