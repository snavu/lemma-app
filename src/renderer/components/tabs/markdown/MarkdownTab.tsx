import { Editor } from './editor/page';
import Preview from './preview/page';
import { useState, useEffect, useCallback, useRef } from 'react';
import './markdown-tab.css';

interface MarkdownTabProps {
  initialDoc: string;
  viewMode?: 'split' | 'editor' | 'preview';
}

export const MarkdownTab = ({ initialDoc, viewMode = 'split' }: MarkdownTabProps) => {
  const [doc, setDoc] = useState(initialDoc);
  const [editorWidth, setEditorWidth] = useState(50); // percentage
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeHandleRef = useRef<HTMLDivElement>(null);
  const isResizing = useRef(false);

  const handleDocChange = useCallback((newDoc: string) => {
    setDoc(newDoc);
  }, []);
  
  // Update document when initialDoc changes (file changes)
  useEffect(() => {
    setDoc(initialDoc);
  }, [initialDoc]);

  // Set up resize handling
  useEffect(() => {
    const handleResize = (e: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;
      
      e.preventDefault();
      
      const containerRect = containerRef.current.getBoundingClientRect();
      const newWidthPx = e.clientX - containerRect.left;
      const newWidthPercent = (newWidthPx / containerRect.width) * 100;
      
      // Limit to 20-80% range for better usability
      const clampedWidth = Math.max(20, Math.min(80, newWidthPercent));
      setEditorWidth(clampedWidth);
    };
    
    const handleMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = 'default';
      document.body.style.userSelect = 'auto';
      
      // Remove class from document
      document.documentElement.classList.remove('resizing');
    };
    
    document.addEventListener('mousemove', handleResize);
    document.addEventListener('mouseup', handleMouseUp);
    
    return () => {
      document.removeEventListener('mousemove', handleResize);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);
  
  const startResize = (e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'ew-resize';
    document.body.style.userSelect = 'none';
    
    // Add class to document for styling during resize
    document.documentElement.classList.add('resizing');
  };

  // Calculate actual editor width based on view mode
  const calcEditorStyle = () => {
    if (viewMode === 'editor') return { width: '100%' };
    if (viewMode === 'preview') return { width: '0%', display: 'none' };
    return { width: `${editorWidth}%` };
  };
  
  // Calculate preview width based on view mode
  const calcPreviewStyle = () => {
    if (viewMode === 'preview') return { width: '100%' };
    if (viewMode === 'editor') return { width: '0%', display: 'none' };
    return { width: `${100 - editorWidth}%` };
  };

  return (
    <div className='container' ref={containerRef}>
      <div className='editor-container' style={calcEditorStyle()}>
        <Editor onChange={handleDocChange} initialData={doc} />
      </div>
      
      {viewMode === 'split' && (
        <div 
          className="resize-handle" 
          ref={resizeHandleRef}
          onMouseDown={startResize}
        />
      )}
      
      <div className='preview' style={calcPreviewStyle()}>
        <Preview doc={doc} />
      </div>
    </div>
  );
};
