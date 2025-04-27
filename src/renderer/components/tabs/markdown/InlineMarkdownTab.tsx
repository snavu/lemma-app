import InlineMarkdownEditor from './editor/InlineMarkdownEditor';
import KnowledgeGraph from './graph/KnowledgeGraph'
import { useState, useEffect, useCallback } from 'react';
import './inline-markdown-tab.css';

interface MarkdownTabProps {
  initialDoc: string;
  viewMode?: 'split' | 'editor' | 'preview';
  onHashtagChange: (hashtags: string[]) => void;
  onChange?: (content: string) => void;
  graphJsonPath?: string;
}

export const InlineMarkdownTab = ({ initialDoc, onChange, onHashtagChange, graphJsonPath }: MarkdownTabProps) => {
  const [doc, setDoc] = useState(initialDoc);

  const handleDocChange = useCallback((newDoc: string) => {
    setDoc(newDoc);
    // Call the onChange prop if it exists
    const editor = document.querySelector('.editor-content-area');
    const spanElements: HTMLElement[] = Array.from(editor?.querySelectorAll('.tag-node') || []);
    const updatedHashtags: string[] = Array.from(spanElements).map((el) => {
      const label = el.textContent;
      return label;
    });

    if (onChange) {
      onChange(newDoc);
      onHashtagChange(updatedHashtags);
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
      <KnowledgeGraph graphJsonPath={graphJsonPath} />
    </div>
  );
};

export default InlineMarkdownTab;
