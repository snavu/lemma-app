import  { useState } from 'react';
import Renderer from './renderer/Renderer';

import './markdown-tab.css';

interface MarkdownTabProps {
  initialDoc: string;
  onChange?: (content: string) => void;
}


export const MarkdownTab = ({ initialDoc, onChange }: MarkdownTabProps) => {
  const [content, setContent] = useState(initialDoc);
  //const [tempContent, setTempContent] = useState(tempText);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (onChange) {
      onChange(newContent);
    }
  };

  /*const handleTempContentChange = (newContent: string) => {
    setTempContent(newContent);
  };*/


  return (
    <div className="markdown-tab">
      <div className="markdown-content">
        <Renderer text={content} onChange={handleContentChange} />
      </div>
    </div>
  );
};
