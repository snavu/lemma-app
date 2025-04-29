import React, { useState, useEffect } from 'react';
import { Resizable } from "re-resizable";
import './searchResult.css';


interface TabInfo {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  hashtags: string[];
}

type SearchResult = {
    id: string;
    filename: string;
    hashtags: string[];
    filePath: string;
  };

interface SearchResultProps {
    setSearchresult: (check: boolean) => void;
    results: SearchResult[];
  }

export const SearchResults: React.FC<SearchResultProps> = ({ setSearchresult, results }) => {


// FOR LATER USE DO NOT DELETE

    //   // for handling the scrolling when an option is selected
//   const handleChange = (option: Option | null) => {
//     setSelectedOption(option);
//     if (!option) return;

//     setSearchresult(true);

//     handleSearch();
//     // waiting for dom to load
//     setTimeout(() => {
//     const target = document.querySelector(`span.tag-node[contenteditable="false"][data-tag="${label.slice(1)}"][tagname="${label.slice(1)}"]`);
//     // const target = Array.from(document.querySelectorAll(`span.tag-node[contenteditable="false"][data-tag="${label}"][tagname="${label}"]`)).find(
//     //   (heading) => heading.textContent?.trim() === label
//     // ) as HTMLElement;

//     console.log(target);

//     const container = document.querySelector('.editor-content-area') as HTMLElement;
//     const targetRect = target.getBoundingClientRect();
//     const containerRect = container.getBoundingClientRect();
//     const offset = targetRect.top - containerRect.top + container.scrollTop;

//     container.scrollTo({
//       top: offset,
//       behavior: 'smooth',
//     });
//     setInputValue('');
//     setSelectedOption(null);
//   }, 100);
// };

    const CloseIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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
            enable={{ right: true }}
            className="bg-gray-100 p-4">
            <button 
            onClick={() => setSearchresult(false)}
            className="close-button">
                <CloseIcon/>
            </button>
            <div>
            {results.map((result: SearchResult) => (
                <div>
                    <div>{result.filePath.split(/[/\\]/).pop()}</div> 
                    <button>{result.hashtags}</button>
                    <div>---------</div>
                </div>
                ))}
            </div>
        </Resizable>
    </div>
  );
};