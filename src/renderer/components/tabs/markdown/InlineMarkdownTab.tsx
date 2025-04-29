import InlineMarkdownEditor from './editor/InlineMarkdownEditor';
import KnowledgeGraph from './graph/KnowledgeGraph'
import { useState, useEffect, useCallback } from 'react';
import './inline-markdown-tab.css';

interface MarkdownTabProps {
  initialDoc: string;
  viewMode?: 'split' | 'editor' | 'preview';
<<<<<<< HEAD
<<<<<<< HEAD
  // onHashtagChange: (hashtags: string[]) => void;
  onChange?: (content: string, hashtags: string[]) => void;
}

export const InlineMarkdownTab = ({ initialDoc, onChange }: MarkdownTabProps) => {
=======
  onHashtagChange: (hashtags: string[]) => void;
  onChange?: (content: string) => void;
  graphJsonPath?: string;
}

export const InlineMarkdownTab = ({ initialDoc, onChange, onHashtagChange, graphJsonPath }: MarkdownTabProps) => {
>>>>>>> 1d40921 (load graph from json)
=======
  onHashtagChange: (hashtags: string[]) => void;
  onChange?: (content: string) => void;
  graphJsonPath?: string;
}

export const InlineMarkdownTab = ({ initialDoc, onChange, onHashtagChange, graphJsonPath }: MarkdownTabProps) => {
>>>>>>> 1d4092122def8ca7bdbe4dd296992d4eac7c7e28
  const [doc, setDoc] = useState(initialDoc);

  const handleDocChange = useCallback((newDoc: string) => {
    setDoc(newDoc);
    // Call the onChange prop if it exists
    const editor = document.querySelector('.editor-content-area');
    const spanElements: HTMLElement[] = Array.from(editor?.querySelectorAll('.tag-node') || []);
<<<<<<< HEAD
<<<<<<< HEAD
    const updatedHashtags: string[] = [...new Set(Array.from(spanElements).map((el) => {
      const label = el.textContent; 
      return label;
    }))];
    
=======
    const updatedHashtags: string[] = Array.from(spanElements).map((el) => {
      const label = el.textContent;
      return label;
    });

>>>>>>> 449b91d (Knowledge graph outline)
=======
    const updatedHashtags: string[] = Array.from(spanElements).map((el) => {
      const label = el.textContent;
      return label;
    });

>>>>>>> 1d4092122def8ca7bdbe4dd296992d4eac7c7e28
    if (onChange) {
      onChange(newDoc, updatedHashtags);
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
