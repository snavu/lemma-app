import React, { useState, useEffect, useCallback } from 'react';
import { SearchHeader } from './searchHeader';
import { marked } from 'marked';
import markdownToTxt from 'markdown-to-txt';
import './searchResult.css';

interface SearchResult {
  id: string,
  filePath: string,
  content: string,
  hashtags: string[]
};

interface NearbyResult {
  filePath: string;
  domIndex: number;
  context: string;
  altered: boolean;
}

interface SearchResultProps {
  setSearchResult: (setResult: boolean) => void;
  results: SearchResult[];
  searchInput: string;
  handleFileSelect: (filePath: string) => void;
  handleSearch: (searchQuery: string) => void;
  setSearchInput: (input: string) => void;
  setResults: (results: SearchResult[]) => void;
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

  // Tracks the currently highlighted search result for arrow key navigation
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  // Results to display
  const [res, setRes] = useState<HTMLElement[] | Element[]>([]);
  const [nearbyResults, setNearbyResults] = useState<NearbyResult[]>([]);
  // Add state to control when to scroll
  const [shouldScroll, setShouldScroll] = useState<boolean>(false);

  const extractNearbyInputs = () => {
    setNearbyResults([]);
    if (!searchInput.trim() || results.length === 0) {
      return [];
    }

    const mappedResults: NearbyResult[] = [];
    const contextWindow = 4;
    const searchTerm = searchInput.toLowerCase().trim();
    
    results.forEach(file => {
      console.log(marked(file.content))
      const plainText = markdownToTxt(file.content);
      const words = plainText.split(/\s+/);
      let matchCount = 0;
      
      // Handle single word searches
      if (!searchTerm.includes(' ')) {
        words.forEach((word, index) => {
          if (word.toLowerCase().includes(searchTerm)) {
            const start = Math.max(0, index - contextWindow);
            const end = Math.min(words.length, index + contextWindow + 1);
            const nearbyWords = words.slice(start, end);
            
            mappedResults.push({
              context: nearbyWords.join(' '),
              filePath: file.filePath,
              domIndex: matchCount,
              altered: false,
            });
            
            matchCount++;
          }
        });
      } else {
        // Handle phrase searches (multiple words)
        const searchTermWords = searchTerm.split(/\s+/);
        const searchTermLength = searchTermWords.length;
        
        // Sliding window to find phrase matches
        for (let i = 0; i <= words.length - searchTermLength; i++) {
          const windowWords = words.slice(i, i + searchTermLength);
          const windowText = windowWords.join(' ').toLowerCase();
          
          if (windowText.includes(searchTerm)) {
            console.log(windowText);
            const start = Math.max(0, i - contextWindow);
            const end = Math.min(words.length, i + searchTermLength + contextWindow);
            const nearbyWords = words.slice(start, end);
            
            mappedResults.push({
              context: nearbyWords.join(' '),
              filePath: file.filePath,
              domIndex: matchCount,
              altered: false,
            });
            
            matchCount++;
          }
        }
      }
    });
    setNearbyResults(mappedResults);
    return mappedResults;
  };

  useEffect(() => {
    if (searchInput && results.length > 0) {
      extractNearbyInputs();
    } else {
      setNearbyResults([]);
    }
  }, [results]);

  /**
   * Opens the given file and searches its content for a keyword or hashtag.
   */
  const handleClick = (filePath: string, word: string, targetIndex: number) => {
    setCurrentIndex(0);
    setShouldScroll(false); // Reset scroll flag
    const keywordResults: any[] = [];
    const hashtagResults: Element[] = [];
    const lowerCaseSearchInput = searchInput.toLowerCase();
    let occurrenceCount = 0;
    let resultIndex = 0;
    handleFileSelect(filePath);

    // Increased timeout to allow for file loading and DOM stabilization
    setTimeout(() => {
      if (searchInput.startsWith('#', 0)) {
        document.querySelectorAll(`span.tag-widget.ProseMirror-widget[contenteditable="false"][data-tag-name="${word.slice(1)}"]`)
        .forEach(elem => {
          if (elem.textContent.toLowerCase().includes(lowerCaseSearchInput)) {
              hashtagResults.push(elem.closest('p') || elem);
          }
        });
        setCurrentIndex(targetIndex);
        setRes(hashtagResults);
      } else {
        document.querySelectorAll("p, h1, h2, h3, code").forEach(elem => {
          if (elem.textContent.toLowerCase().includes(lowerCaseSearchInput)) {
              keywordResults.push(elem);
          }
        });
        outer:
        for (let index = 0; index < keywordResults.length; index++) {
          const text = keywordResults[index];
          const tempCount = (text.innerText.toLowerCase().match(
            new RegExp(lowerCaseSearchInput.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')
          ) || []).length;
        
          // console.log("index,", index);
          for (let i = 0; i < tempCount; i++) {
            if (occurrenceCount === targetIndex) {
              resultIndex = index;
              break outer; // exits both loops  
            }
            occurrenceCount++;
          }
        }        
        // console.log(targetIndex);
        // console.log(keywordResults);
        // console.log(nearbyResults);
        // console.log(resultIndex);
        setCurrentIndex(resultIndex);
        setRes(keywordResults);
      }
      
     
      setTimeout(() => {
        setShouldScroll(true);
      }, 50);

    }, 100);
  };

  
  const scrollToCurrentResult = useCallback(() => {
    if (!shouldScroll || res.length === 0) return;

    const container = document.querySelector('.editor-content-area') as HTMLElement;
    const targetRect = res[currentIndex].getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    const offset = targetRect.top - containerRect.top + container.scrollTop;

    container.scrollTo({
        top: offset,
        behavior: 'smooth',
    });
    
    setShouldScroll(false);
  }, [currentIndex, res, shouldScroll]);
  

  /**
   * Handles arrow key navigation through search results,
   * unless the user is typing in the editor.
   */
  const handleKeyDown = (event: KeyboardEvent) => {
    // Ignore if typing in the editor
    const editorContainer = document.querySelector('.tiptap');
    if (editorContainer && editorContainer.contains(document.activeElement)) return;

    if (res.length > 0) {
      let newIndex = currentIndex;
      if (event.key === 'ArrowDown' && currentIndex < res.length - 1) {
        newIndex = currentIndex + 1;
        setCurrentIndex(newIndex);
        setShouldScroll(true);
      } else if (event.key === 'ArrowUp' && currentIndex > 0) {
        newIndex = currentIndex - 1;
        setCurrentIndex(newIndex);
        setShouldScroll(true);
      }
    }
  };

  /* listens for arrow keys */
  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [res, currentIndex]);
  
  /* jumps to word or hashtag */
  useEffect(() => {
    if (shouldScroll && res.length > 0) {
      scrollToCurrentResult();
    }
  }, [scrollToCurrentResult]);

  const highlightText = (text: string, searchTerm: string) => {
    if (!searchTerm.trim()) return text;
    
    const regex = new RegExp(`(${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    
    return parts.map((part, index) => 
      regex.test(part) ? (
        <mark key={index} style={{ backgroundColor: '#61afef', fontWeight: 'bold', borderRadius: '3px' }}>
          {part}
        </mark>
      ) : part
    );
  };
      
  return (  
    <div className="search-container">
      <SearchHeader 
        setSearchResult={setSearchResult} 
        handleSearch={handleSearch} 
        setResults={setResults}
        setSearchInput={setSearchInput}
      />
      <div className="search-body">
        {results
          .map((result: SearchResult, index) => ({
            result,
            index,
            fileResults: nearbyResults.filter(nr => nr.filePath === result.filePath)
          }))
          .filter(({ fileResults }) => fileResults.length > 0)
          .map(({ result, index, fileResults }) => (
            <div key={`${result.id}-${index}`}>
              <div>{result.filePath.split(/[/\\]/).pop()}</div>
              {fileResults.map((nr, i) => (
                <button 
                  key={`${nr.filePath}-${nr.domIndex}-${i}`} 
                  onClick={() => handleClick(nr.filePath, searchInput, nr.domIndex)} 
                  className="select-button"
                >
                  {highlightText(nr.context, searchInput.replace(/^#/, ''))}
                </button>
              ))}
            </div>
          ))
        }
      </div>
    </div>
  );
};