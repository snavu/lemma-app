import React from 'react';
import { SearchBar } from './searchBar';
import './searchHeader.css';

interface SearchResult {
  id: string,
  filePath: string,
  content: string,
  hashtags: string[]
};

interface SearchHeaderProps {
  setSearchResult: (setResult: boolean) => void;
  handleSearch: (searchQuery: string) => void;
  setSearchInput: (input: string) => void;
  setResults: (results: SearchResult[]) => void;
}

export const SearchHeader: React.FC<SearchHeaderProps> = ({ 
  setSearchResult,
  handleSearch,
  setSearchInput, 
  setResults,
}) => {

  const CloseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
      
  return (  
    <div className="search-header">
      <SearchBar 
        setSearchresult={setSearchResult}
        handleSearch={handleSearch}
        setSearchInput={setSearchInput}
      />
      <button 
        onClick={() => {
          setSearchResult(false);
          setResults([]);
          }}                      
        className="closeX-button">
        <CloseIcon/>
      </button>
    </div>
  );
};