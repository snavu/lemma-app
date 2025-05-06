import React, { useCallback, useEffect, useState } from 'react';
import InlineMarkdownEditor from './editor/InlineMarkdownEditor';
import KnowledgeGraph from './graph/KnowledgeGraph';
import './inline-markdown-tab.css';

interface FileInfo {
  name: string;
  path: string;
  stats?: any;
}

interface MarkdownTabProps {
  files: FileInfo[];
  onFileSelect: (filePath: string) => void;
  graphJsonPath: string | null;
  initialDoc: string;
  viewMode?: 'split' | 'editor' | 'preview';
  // onHashtagChange: (hashtags: string[]) => void;
  onChange?: (content: string, hashtags: string[], klinks: string[]) => void;
  graphRefreshTrigger?: number;
}

export const InlineMarkdownTab = ({ initialDoc, onChange, files, onFileSelect, graphJsonPath, graphRefreshTrigger }: MarkdownTabProps) => {
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
      />
      <KnowledgeGraph
        graphRefreshTrigger={graphRefreshTrigger}
        graphJsonPath={graphJsonPath}
      />
    </div>
  );
};

export default InlineMarkdownTab;
