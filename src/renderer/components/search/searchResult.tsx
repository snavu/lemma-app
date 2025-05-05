import React, { useState, useEffect, useRef } from 'react';
import { Resizable } from "re-resizable";
import './searchResult.css';
import { Search } from './searchBar';
import { hash } from 'crypto';

interface SearchResult {
    id: string,
    filePath: string,
    content: string,
    hashtags: string[]
};

interface SearchResultProps {
    setSearchresult: (check: boolean) => void;
    results: SearchResult[];
    searchInput: string;
    handleFileSelect: (filePath: string) => void;
    handleSearch: (searchType: string, searchQuery: string) => void;
    setSearchInput: (input: string) => void;
    searchType: string;
    setResults: (info: SearchResult[]) => void;
}

export const SearchResults: React.FC<SearchResultProps> = ({ 
    results, 
    searchInput, 
    handleFileSelect,
    setSearchresult,
    handleSearch,
    setSearchInput, 
    searchType,
    setResults,
}) => {
    //
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [res, setRes] = useState<HTMLElement[] | Element[]>([]);

    // opens the file and jumps to the tag or keyword
    const handleClick = (filePath: string, word: string) => {
        const keywordResults: HTMLElement[] = [];
        const hashtagResults: Element[] = [];
        
        handleFileSelect(filePath);

        // need a timeout for the dom to load
        setTimeout(() => {
            if (searchType.toLowerCase() === "hashtag") {
                document.querySelectorAll(`span.tag-node[contenteditable="false"][data-tag="${word.slice(1)}"][tagname="${word.slice(1)}"]`).forEach(elem => {
                    if (elem.textContent.includes(searchInput)) {
                        hashtagResults.push(elem);
                    }
                });
                setRes(hashtagResults);
            } else if (searchType.toLowerCase() === "keyword") {
                document.querySelectorAll("p").forEach(elem => {
                    if (elem.textContent.includes(searchInput)) {
                        keywordResults.push(elem);
                    }
                });
                setRes(keywordResults);
            }
        }, 100);
    };

    // helper function for jumping to the appropriate keyword or hashtag
    const scrollToCurrentResult = () => {
        const container = document.querySelector('.editor-content-area') as HTMLElement;
        const targetRect = res[currentIndex].getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();
        const offset = targetRect.top - containerRect.top + container.scrollTop;
    
        container.scrollTo({
            top: offset,
            behavior: 'smooth',
        });
    };

    // helper function for navigating to different hashtags or keywords that are the same
    const handleKeyDown = (event: KeyboardEvent) => {
        if (res.length > 0) {

            res[currentIndex].classList.remove('highlight');

            if (event.key === 'ArrowDown' && currentIndex < res.length - 1) {
                setCurrentIndex(currentIndex + 1);
            } else if (event.key === 'ArrowUp' && currentIndex > 0) {
                setCurrentIndex(currentIndex - 1);
            }

            res[currentIndex].classList.add('highlight');
            scrollToCurrentResult();
        }
    };

    // listens for arrow keys
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
    
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
      }, [res, currentIndex]);
    
    // listens for update to current index to add highlights
    useEffect(() => {
    if (res.length > 0) {
        res[currentIndex].classList.add('highlight');
        scrollToCurrentResult();
    }
    }, [currentIndex, res]);


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
                        setResults={setResults}
                />
                <button 
                    onClick={() => {
                        setSearchresult(false);
                        setResults([]);
                      }}                      
                    className="close-button">
                    <CloseIcon/>
                </button>
            </div>
            <div>
                {results.map((result: SearchResult, index) => (
                    <div key={index}>
                    <div>{result.filePath.split(/[/\\]/).pop()}</div>
                    {searchType === "Hashtag" ? (
                        result.hashtags.map((hashtag, idx) => (
                        <button
                            key={idx}
                            onClick={() => handleClick(result.filePath, hashtag)}
                            className="hashtag-button"
                        >
                            {hashtag}
                        </button>
                        ))
                    ) : (
                        <button className="hashtag-button" onClick={() => handleClick(result.filePath, searchInput)}>
                            {searchInput}
                        </button>
                    )}
                    </div>
                ))}
            </div>
        </Resizable>
    </div>
  );
};