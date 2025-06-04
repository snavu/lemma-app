import React, { useEffect, useRef, useState } from 'react';
import './LinkSuggestionPopup.css';

// Match the FileInfo interface from the LinkExtension
interface FileInfo {
  name: string;
  path: string;
}

interface LinkSuggestionPopupProps {
  items: FileInfo[];
  clientRect: () => DOMRect;
  onItemSelect: (item: FileInfo) => void;
  onClose: () => void;
}

const LinkSuggestionPopup: React.FC<LinkSuggestionPopupProps> = ({
  items,
  clientRect,
  onItemSelect,
  onClose
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  
  // Position the popup
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    
    const rect = clientRect();
    container.style.position = 'absolute';
    container.style.left = `${rect.left}px`;
    container.style.top = `${rect.bottom + 5}px`; // Small offset to avoid overlapping with cursor
  }, [clientRect]);
  
  // Handle keyboard navigation
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex(prev => (prev + 1) % items.length);
      }
      else if (event.key === 'ArrowUp') {
        event.preventDefault();
        event.stopPropagation();
        setSelectedIndex(prev => (prev - 1 + items.length) % items.length);
      }
      else if (event.key === 'Enter' && items.length > 0) {
        // Make sure to stop propagation to prevent the editor from capturing it
        event.preventDefault();
        event.stopPropagation();
        onItemSelect(items[selectedIndex]);
      }
      else if (event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        onClose();
      }
    };
    
    // Use capture phase to get events before they reach the editor
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [items, selectedIndex, onItemSelect, onClose]);
  
  // When items change, reset selection
  useEffect(() => {
    setSelectedIndex(0);
  }, [items]);
  
  if (items.length === 0) return null;
  
  return (
    <div ref={containerRef} className="link-suggestion-popup">
      <div className="link-suggestion-header">
        Link to note
      </div>
      <div>
        {items.map((item, index) => (
          <div
            key={item.path}
            className={`link-suggestion-item ${index === selectedIndex ? 'is-selected' : ''}`}
            onClick={() => onItemSelect(item)}
          >
            <div className="link-suggestion-name">
              {item.name.replace(/\.md$/, '')}
            </div>
            <div className="link-suggestion-path">
              {item.path}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default LinkSuggestionPopup; 