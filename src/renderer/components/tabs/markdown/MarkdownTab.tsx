import React, { useState } from 'react';
import { LivePreview } from './LivePreview';
import { InlineLivePreview } from './InlineLivePreview';
//import { Editor } from './editor/page';
import Renderer from './renderer/Renderer';
//import Preview from './preview/page';
import { MarkdownToolbar, ViewMode } from './MarkdownToolbar';
import './markdown-tab.css';

interface MarkdownTabProps {
  initialDoc: string;
  viewMode?: ViewMode;
  onChange?: (content: string) => void;
}

const tempText = `
# Hello World

This is a test of the markdown renderer.

## This is a heading

This is a paragraph.

*This is bold text*

_This is italic text_

[This is a link](https://www.google.com)

- First level
    - Second level (4 spaces)
        - Third level (8 spaces)
- Back to first level
	- Second level (1 tab)

`;

export const MarkdownTab = ({ initialDoc, viewMode: initialViewMode = 'split', onChange }: MarkdownTabProps) => {
  const [content, setContent] = useState(initialDoc);
  const [viewMode, setViewMode] = useState<ViewMode>(initialViewMode);

  const handleContentChange = (newContent: string) => {
    setContent(newContent);
    if (onChange) {
      onChange(newContent);
    }
  };

  const handleViewModeChange = (mode: ViewMode) => {
    setViewMode(mode);
  };

  // Render the appropriate view based on the viewMode
  const renderView = () => {
    switch (viewMode) {
      case 'split':
        return <LivePreview initialDoc={content} onChange={handleContentChange} />;
      case 'preview':
        return (
          <div className="preview-only">
            <Renderer text={tempText} onChange={handleContentChange} />
          </div>
        );
      case 'inline':
        return <InlineLivePreview initialDoc={content} onChange={handleContentChange} />;
      default:
        return <LivePreview initialDoc={content} onChange={handleContentChange} />;
    }
  };

  return (
    <div className="markdown-tab">
      <MarkdownToolbar viewMode={viewMode} onViewModeChange={handleViewModeChange} />
      <div className="markdown-content">
        {renderView()}
      </div>
    </div>
  );
};
