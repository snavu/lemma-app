import InlineMarkdownEditor from './editor/InlineMarkdownEditor';
import { useState, useEffect, useCallback } from 'react';
import './inline-markdown-tab.css';
import React from 'react';

interface MarkdownTabProps {
  initialDoc: string;
  viewMode?: 'split' | 'editor' | 'preview';
  onChange?: (content: string) => void;
}

export const InlineMarkdownTab = ({ initialDoc, onChange }: MarkdownTabProps) => {
  const [doc, setDoc] = useState(initialDoc);

  const handleDocChange = useCallback((newDoc: string) => {
    setDoc(newDoc);
    // Call the onChange prop if it exists
    if (onChange) {
      onChange(newDoc);
    }
  }, [onChange]);

  // Update document when initialDoc changes (file changes)
  useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  return (
    <div className="inline-markdown-tab">
      <InlineMarkdownEditor 
        initialData={doc} 
        onChange={handleDocChange} 
      />
    </div>
  );
};

export default InlineMarkdownTab;