import React from 'react';
import './tab.css';

interface TabProps {
  id: string;
  title: string;
  active: boolean;
  onSelect: () => void;
  onClose: () => void;
}

export const Tab: React.FC<TabProps> = ({
  id,
  title,
  active,
  onSelect,
  onClose
}) => {
  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    onClose();
  };

  return (
    <div 
      className={`tab ${active ? 'tab-active' : ''}`} 
      onClick={onSelect}
      data-tab-id={id}
    >
      <span className="tab-title">
        {title}
      </span>
      <button className="close-button" onClick={handleClose}>
        <svg viewBox="0 0 12 12" width="12" height="12">
          <path d="M1,1 L11,11 M1,11 L11,1" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>
    </div>
  );
};