import React, { useState, useRef, useEffect, useCallback } from 'react';
import { unified } from "unified";
import remarkParse from "remark-parse";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeHighlight from "rehype-highlight";
import 'highlight.js/styles/github-dark.css';
import 'github-markdown-css';
import './inline-live-preview.css';

interface InlineLivePreviewProps {
  initialDoc: string;
  onChange?: (content: string) => void;
}

export const InlineLivePreview: React.FC<InlineLivePreviewProps> = ({ initialDoc, onChange }) => {
  const [content, setContent] = useState(initialDoc);
  const [isEditing, setIsEditing] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [cursorPosition, setCursorPosition] = useState<number | null>(null);
  const [debouncedContent, setDebouncedContent] = useState(initialDoc);
  const [renderedHtml, setRenderedHtml] = useState('');
  const contentRef = useRef<HTMLDivElement>(null);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const blockRefs = useRef<Map<string, HTMLDivElement>>(new Map());

  // Handle content changes with debouncing
  const handleContentChange = useCallback((newContent: string) => {
    setContent(newContent);
    
    // Clear any existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set a new timeout to update the rendered content after typing stops
    timeoutRef.current = setTimeout(() => {
      setDebouncedContent(newContent);
      if (onChange) {
        onChange(newContent);
      }
    }, 300); // 300ms debounce
  }, [onChange]);

  // Save cursor position when selection changes
  const saveSelection = useCallback(() => {
    const selection = window.getSelection();
    if (selection && selection.rangeCount > 0) {
      const range = selection.getRangeAt(0);
      const preCaretRange = range.cloneRange();
      
      if (contentRef.current) {
        preCaretRange.selectNodeContents(contentRef.current);
        preCaretRange.setEnd(range.endContainer, range.endOffset);
        setCursorPosition(preCaretRange.toString().length);
      }
    }
  }, []);

  // Restore cursor position after rendering
  const restoreSelection = useCallback(() => {
    if (cursorPosition === null || !contentRef.current) return;
    
    const selection = window.getSelection();
    if (!selection) return;
    
    const range = document.createRange();
    let charCount = 0;
    let node = contentRef.current.firstChild;
    
    // Find the node containing the cursor position
    while (node) {
      if (node.nodeType === Node.TEXT_NODE) {
        const length = node.textContent?.length || 0;
        if (charCount + length >= cursorPosition) {
          range.setStart(node, cursorPosition - charCount);
          range.setEnd(node, cursorPosition - charCount);
          selection.removeAllRanges();
          selection.addRange(range);
          break;
        }
        charCount += length;
      }
      node = node.nextSibling;
    }
  }, [cursorPosition]);

  // Find the closest block element from a click event
  const findClosestBlock = useCallback((element: HTMLElement): HTMLElement | null => {
    // Define block elements
    const blockElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'div'];
    
    // Start from the clicked element
    let currentElement: HTMLElement | null = element;
    
    // Traverse up the DOM tree to find the closest block element
    while (currentElement && currentElement !== contentRef.current) {
      if (blockElements.includes(currentElement.tagName.toLowerCase())) {
        return currentElement;
      }
      currentElement = currentElement.parentElement;
    }
    
    return null;
  }, []);

  // Generate a unique ID for a block based on its content and position
  const generateBlockId = useCallback((block: HTMLElement): string => {
    const blockIndex = Array.from(contentRef.current?.children || []).indexOf(block);
    return `block-${blockIndex}-${block.textContent?.slice(0, 20).replace(/\s+/g, '-') || ''}`;
  }, []);

  // Handle click events to toggle editing mode for a specific block
  const handleClick = useCallback((e: React.MouseEvent) => {
    // If we're already editing, don't do anything on click
    if (isEditing) return;
    
    const target = e.target as HTMLElement;
    const block = findClosestBlock(target);
    
    if (block) {
      const blockId = generateBlockId(block);
      setEditingBlockId(blockId);
      setIsEditing(true);
      saveSelection();
    }
  }, [isEditing, findClosestBlock, generateBlockId, saveSelection]);

  // Handle blur events to exit editing mode
  const handleBlur = useCallback(() => {
    setIsEditing(false);
    setEditingBlockId(null);
  }, []);

  // Handle input events to update content
  const handleInput = useCallback((e: React.FormEvent<HTMLDivElement>) => {
    const newContent = e.currentTarget.innerText;
    handleContentChange(newContent);
    saveSelection();
  }, [handleContentChange, saveSelection]);

  // Handle keydown events for special keys
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Handle Tab key to prevent focus loss
    if (e.key === 'Tab') {
      e.preventDefault();
      document.execCommand('insertText', false, '  ');
    }
    
    saveSelection();
  }, [saveSelection]);

  // Process markdown to HTML
  const processMarkdown = useCallback((markdown: string) => {
    try {
      const result = unified()
        .use(remarkParse)
        .use(remarkGfm)
        .use(remarkRehype)
        .use(rehypeHighlight, { detect: true })
        .use(rehypeStringify)
        .processSync(markdown)
        .toString();
      
      return result;
    } catch (error) {
      console.error('Error processing markdown:', error);
      return markdown;
    }
  }, []);

  // Update content when initialDoc changes
  useEffect(() => {
    setContent(initialDoc);
    setDebouncedContent(initialDoc);
  }, [initialDoc]);

  // Update rendered HTML when debounced content changes
  useEffect(() => {
    if (!isEditing) {
      const html = processMarkdown(debouncedContent);
      setRenderedHtml(html);
    }
  }, [debouncedContent, isEditing, processMarkdown]);

  // Initialize rendered HTML on component mount
  useEffect(() => {
    const html = processMarkdown(initialDoc);
    setRenderedHtml(html);
  }, [initialDoc, processMarkdown]);

  // Restore cursor position after rendering
  useEffect(() => {
    if (isEditing && editingBlockId) {
      restoreSelection();
    }
  }, [isEditing, editingBlockId, restoreSelection]);

  // Clean up timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  // Process the rendered HTML to add data attributes to block elements
  const processRenderedHtml = useCallback((html: string): string => {
    // Create a temporary DOM element to parse the HTML
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = html;
    
    // Define block elements
    const blockElements = ['p', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'div'];
    
    // Add data attributes to block elements
    Array.from(tempDiv.children).forEach((child, index) => {
      if (blockElements.includes(child.tagName.toLowerCase())) {
        const blockId = `block-${index}-${child.textContent?.slice(0, 20).replace(/\s+/g, '-') || ''}`;
        child.setAttribute('data-block-id', blockId);
        child.setAttribute('contenteditable', editingBlockId === blockId ? 'true' : 'false');
        child.classList.add('markdown-block');
        
        if (editingBlockId === blockId) {
          child.classList.add('editing');
        }
      }
    });
    
    return tempDiv.innerHTML;
  }, [editingBlockId]);

  // Set up event listeners for editable blocks
  useEffect(() => {
    if (!contentRef.current) return;

    const handleBlockInput = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.hasAttribute('contenteditable') && target.getAttribute('contenteditable') === 'true') {
        const blockId = target.getAttribute('data-block-id');
        if (blockId === editingBlockId) {
          // Update the content of the specific block
          const updatedContent = updateBlockContent(blockId, target.innerText);
          handleContentChange(updatedContent);
        }
      }
    };

    const handleBlockBlur = (e: Event) => {
      const target = e.target as HTMLElement;
      if (target.hasAttribute('contenteditable') && target.getAttribute('contenteditable') === 'true') {
        const blockId = target.getAttribute('data-block-id');
        if (blockId === editingBlockId) {
          handleBlur();
        }
      }
    };

    const handleBlockKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target.hasAttribute('contenteditable') && target.getAttribute('contenteditable') === 'true') {
        const blockId = target.getAttribute('data-block-id');
        if (blockId === editingBlockId) {
          if (e.key === 'Tab') {
            e.preventDefault();
            document.execCommand('insertText', false, '  ');
          }
          saveSelection();
        }
      }
    };

    // Add event listeners
    contentRef.current.addEventListener('input', handleBlockInput);
    contentRef.current.addEventListener('blur', handleBlockBlur, true);
    contentRef.current.addEventListener('keydown', handleBlockKeyDown);

    // Clean up event listeners
    return () => {
      if (contentRef.current) {
        contentRef.current.removeEventListener('input', handleBlockInput);
        contentRef.current.removeEventListener('blur', handleBlockBlur, true);
        contentRef.current.removeEventListener('keydown', handleBlockKeyDown);
      }
    };
  }, [editingBlockId, handleBlur, handleContentChange, saveSelection]);

  // Update the content of a specific block
  const updateBlockContent = useCallback((blockId: string, newBlockContent: string): string => {
    // Create a temporary DOM element to parse the current content
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = renderedHtml;
    
    // Find the block with the matching ID
    const block = tempDiv.querySelector(`[data-block-id="${blockId}"]`);
    if (block) {
      // Update the block content
      block.textContent = newBlockContent;
      
      // Convert the updated HTML back to Markdown
      // This is a simplified approach - in a real implementation, you would need
      // to convert the HTML back to Markdown, which is complex
      // For now, we'll just update the entire content
      return tempDiv.innerHTML;
    }
    
    return content;
  }, [content, renderedHtml]);

  return (
    <div className="inline-live-preview-container">
      <div
        ref={contentRef}
        className="inline-live-preview"
        onClick={handleClick}
        dangerouslySetInnerHTML={{ __html: processRenderedHtml(renderedHtml) }}
      />
    </div>
  );
}; 