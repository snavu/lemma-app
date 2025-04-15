import React from 'react';
import './markdown-toolbar.css';

export type ViewMode = 'split' | 'preview' | 'inline';

interface MarkdownToolbarProps {
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
}

export const MarkdownToolbar: React.FC<MarkdownToolbarProps> = ({ viewMode, onViewModeChange }) => {
  return (
    <div className="tab-toolbar">
      <div className="view-controls">
        <button
          className={viewMode === 'split' ? 'active' : ''}
          onClick={() => onViewModeChange('split')}
          title="Split View"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <rect x="9" y="2" width="5" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>
        <button
          className={viewMode === 'preview' ? 'active' : ''}
          onClick={() => onViewModeChange('preview')}
          title="Preview Only"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <path d="M8 5C9.10457 5 10 5.89543 10 7C10 8.10457 9.10457 9 8 9C6.89543 9 6 8.10457 6 7C6 5.89543 6.89543 5 8 5Z" stroke="currentColor" strokeWidth="1.5" />
            <path d="M2.5 7C3.5 5 5.5 4 8 4C10.5 4 12.5 5 13.5 7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
        <button
          className={viewMode === 'inline' ? 'active' : ''}
          onClick={() => onViewModeChange('inline')}
          title="Inline Preview"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.5" />
            <path d="M5 6H11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 8H9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M5 10H7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>
    </div>
  );
}; 