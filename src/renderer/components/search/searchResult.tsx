import React, { useState, useEffect } from 'react';
import './searchResult.css';
import { SearchHeader } from './searchHeader';

interface SearchResult {
    id: string,
    filePath: string,
    content: string,
    hashtags: string[]
};

interface SearchResultProps {
    setSearchResult: (check: boolean) => void;
    results: SearchResult[];
    searchInput: string;
    handleFileSelect: (filePath: string) => void;
    handleSearch: (searchQuery: string) => void;
    setSearchInput: (input: string) => void;
    setResults: (info: SearchResult[]) => void;
}

export const SearchResults: React.FC<SearchResultProps> = ({ 
    results, 
    searchInput, 
    handleFileSelect,
    setSearchResult,
    handleSearch,
    setSearchInput, 
    setResults,
}) => {
    const [currentIndex, setCurrentIndex] = useState<number>(0);
    const [res, setRes] = useState<HTMLElement[] | Element[]>([]);

    // opens the file and jumps to the tag or keyword
    const handleClick = (filePath: string, word: string) => {
        setCurrentIndex(0);
        const keywordResults: HTMLElement[] = [];
        const hashtagResults: Element[] = [];
        handleFileSelect(filePath);

        // need a timeout for the dom to load
        setTimeout(() => {
            if (searchInput.startsWith('#', 0)) {
                document.querySelectorAll(`span.tag-widget.ProseMirror-widget[contenteditable="false"][data-tag-name="${word.slice(1)}"]`).forEach(elem => {
                    if (elem.textContent.includes(searchInput)) {
                        hashtagResults.push(elem.closest('p') || elem);
                    }
                });
                setRes(hashtagResults);
            } else {
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

    // logic for going through multiple of the same word or hashtag
    const handleKeyDown = (event: KeyboardEvent) => {
        // check if user is typing
        const editorContainer = document.querySelector('.tiptap');
        if (
            editorContainer &&
            editorContainer.contains(document.activeElement)
        ) {
            return; 
        }

        if (res.length > 0) {
            let newIndex = currentIndex;
            if (event.key === 'ArrowDown' && currentIndex < res.length - 1) {
                newIndex = currentIndex + 1;
                setCurrentIndex(newIndex);
            } else if (event.key === 'ArrowUp' && currentIndex > 0) {
                newIndex = currentIndex - 1;
                setCurrentIndex(newIndex);
            }
        }
    };

    // listens for arrow keys
    useEffect(() => {
        document.addEventListener('keydown', handleKeyDown);
        return () => {
            document.removeEventListener('keydown', handleKeyDown);
        };
      }, [res, currentIndex]);
    
    // jumps to word or hashtag
    useEffect(() => {
    if (res.length > 0) {
        scrollToCurrentResult();
    }
    }, [currentIndex, res]);
      
  return (  
    <div className="search-container">
        <SearchHeader 
            setSearchResult={setSearchResult} 
            handleSearch={handleSearch} 
            setResults={setResults}
            setSearchInput={setSearchInput}
        />
        <div>
            {results.map((result: SearchResult, index) => (
                <div key={index}>
                <div>{result.filePath.split(/[/\\]/).pop()}</div>
                <button onClick={() => handleClick(result.filePath, searchInput)} className="select-button">
                    {searchInput}
                </button>
                </div>
            ))}
        </div>
    </div>
  );
};