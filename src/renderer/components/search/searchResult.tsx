import React, { useState, useEffect } from 'react';
import { Resizable } from "re-resizable";
import './searchResult.css';
import { Search } from './searchBar';

type SearchResult = {
    id: string;
    filename: string;
    hashtags: string[];
    filePath: string;
};

interface SearchResultProps {
    setSearchresult: (check: boolean) => void;
    results: SearchResult[];
    searchInput: string;
    handleFileSelect: (filePath: string) => void;
    handleSearch: (searchQuery: string) => void;
    setSearchInput: (input: string) => void;
}

export const SearchResults: React.FC<SearchResultProps> = ({ 
    results, 
    searchInput, 
    handleFileSelect,
    setSearchresult,
    handleSearch,
    setSearchInput, 
}) => {

    const handleClick = (filePath: string, hashtag: string) => {
        handleFileSelect(filePath); // opens the file
        // need a timeout for the dom to load
        setTimeout(() => {
            const target = document.querySelector(`span.tag-node[contenteditable="false"][data-tag="${hashtag.slice(1)}"][tagname="${hashtag.slice(1)}"]`);
            target.classList.add('highlight');

            const container = document.querySelector('.editor-content-area') as HTMLElement;
            const targetRect = target.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            const offset = targetRect.top - containerRect.top + container.scrollTop;

            container.scrollTo({
            top: offset,
            behavior: 'smooth',
            });
        }, 100);
    };

    const CloseIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
    );
      
  return (
    <div className="search-container">
        <Resizable
            defaultSize={{
            width: 250,
            height: "100%",
            }}
            minWidth={250}
            maxWidth={400}
            enable={{ right: true }}>
            <div className="search-result">
                <Search 
                        setSearchresult={setSearchresult}
                        handleSearch={handleSearch}
                        setSearchInput={setSearchInput}
                />
                <button 
                    onClick={() => setSearchresult(false)}
                    className="close-button">
                    <CloseIcon/>
                </button>
            </div>
            <div>
            {results.map((result: SearchResult) => (
                <div>
                    <div>{result.filePath.split(/[/\\]/).pop()}</div>
                    {result.hashtags.map((hashtag) => (
                        <button
                            onClick={() => handleClick(result.filePath, hashtag)}
                            className="hashtag-button">
                            {hashtag}
                        </button>
                    ))}
                </div>
                ))}
            </div>
        </Resizable>
    </div>
  );
};