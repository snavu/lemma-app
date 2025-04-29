import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import './search.css';

interface SearchProps {
  setSearchresult: (check: boolean) => void;
  handleSearch: () => void;
}

const staticOptions = ['Hashtag: ', 'Keyword: '];

export const Search: React.FC<SearchProps> = ({ setSearchresult, handleSearch }) => {
  const [inputValue, setInputValue] = useState('');
  const [showOptions, setShowOptions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLUListElement>(null);

  const handleInputClick = () => {
    setShowOptions(true);
  };

  const handleOptionClick = (option: string) => {
    setInputValue(option);
    setShowOptions(false);
    inputRef.current?.focus();
  };

  // when the user is typing
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    handleSearch();
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

    // Handle click event to close the dropdown if clicked outside
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowOptions(false);
      }
    };
  
    useEffect(() => {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }, []);
  

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
       <div style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.05)', paddingBottom: '12px' }}></div>
    </div>
  );

};