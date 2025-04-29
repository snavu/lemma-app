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

export const SearchResults = () => {

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
            <div>Replace with Search results</div>
        </Resizable>
    </div>

  );
};