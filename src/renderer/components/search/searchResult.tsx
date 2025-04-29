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
  };

interface SearchResultProps {
    setSearchresult: (check: boolean) => void;
    results: SearchResult[];
  }

export const SearchResults: React.FC<SearchResultProps> = ({ setSearchresult, results }) => {

    // // mockdata
    // const results: SearchResult[] = [
    //     { id: "note1.md", hashtags: ["#react", "#javascript"], content: "test" },
    //     { id: "todo.txt", hashtags: ["#tasks"], content: "HI" },
    //     { id: "project-plan.md", hashtags: [], content: "COOL" },
    // ];

    const CloseIcon = () => (
        <svg xmlns="http://www.w3.org/2000/svg" width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
        </svg>
        );

    console.log(results);
      
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
                    <div key={result.id}>{result.id}</div>
                    <div>{result.hashtags}</div>
                </div>
                ))}
            </div>
        </Resizable>
    </div>
  );
};