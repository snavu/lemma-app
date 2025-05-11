import React, { useCallback, useEffect, useState } from 'react';
import InlineMarkdownEditor from './editor/InlineMarkdownEditor';
import './inline-markdown-tab.css';

interface FileInfo {
  name: string;
  path: string;
  stats?: any;
}

interface MarkdownTabProps {
  files: FileInfo[];
  onFileSelect: (filePath: string) => void;
  initialDoc: string;
  viewMode?: 'split' | 'editor' | 'preview';
  onChange?: (content: string, hashtags: string[], klinks: string[]) => void;
  currentFilePath?: string;
}

export const InlineMarkdownTab = ({ 
  initialDoc, 
  onChange, 
  files, 
  onFileSelect, 
  currentFilePath
}: MarkdownTabProps) => {
  const [doc, setDoc] = useState(initialDoc);

  const handleDocChange = useCallback((newDoc: string) => {
    setDoc(newDoc);
    // Call the onChange prop if it exists
    const editor = document.querySelector('.editor-content-area');
    const spanElements: HTMLElement[] = Array.from(editor?.querySelectorAll('.tag-node') || []);
    const updatedHashtags: string[] = [...new Set(Array.from(spanElements).map((el) => {
      const label = el.textContent;
      return label;
    }))];
    const updateklinks: string[] = [...new Set(Array.from(spanElements).map((el) => {
      const label = el.getAttribute('data-klink');
      return label;
    }))];
    if (onChange) {
      onChange(newDoc, updatedHashtags, updateklinks);
    }
  }, [onChange]);

  // Update document when initialDoc changes (file changes)
  useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  return (
    <div className="inline-markdown-tab">
      <InlineMarkdownEditor
        files={files}
        onFileSelect={onFileSelect}
        initialData={doc}
        onChange={handleDocChange}
        currentFilePath={currentFilePath}
      />
    </div>
  );
};

export default InlineMarkdownTab;