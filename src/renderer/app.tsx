import { MarkdownTab } from './components/tabs/markdown/MarkdownTab';
import { Header } from './components/header/page';
import { Sidebar } from './components/sidebar/Sidebar';
import { useState } from 'react';
import './layout.css';

export const App = () => {
  const [activeFile, setActiveFile] = useState('file1');
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');
  
  // Sample content for demonstration files
  const fileContents = {
    file1: `# Welcome to Lemma Markdown
This is a simple yet powerful markdown editor built with Electron.

## Features
- Side-by-side editing and preview
- Syntax highlighting
- Context menu formatting
`,
    file2: `# Getting Started
1. Create a new file
2. Write in markdown
3. See real-time preview

\`\`\`js
// Example code block
console.log('Hello Lemma!');
\`\`\`
`,
    file3: `# Features
- **Bold text** with Ctrl+B or context menu
- *Italic text* with Ctrl+I or context menu
- [Links](https://example.com) with Ctrl+K or context menu
- And much more!
`,
    file4: `# Todo List
- [x] Create Obsidian-like interface
- [x] Add context menu
- [ ] Implement file system
- [ ] Add plugin system
- [ ] Create settings panel
`
  };

  const handleFileSelect = (fileId: string) => {
    setActiveFile(fileId);
  };

  const handleViewModeChange = (mode: 'split' | 'editor' | 'preview') => {
    setViewMode(mode);
  };

  return (
    <div className='app'>
      <div className='header'>
        <Header />
      </div>
      <div className='content'>
        <Sidebar 
          activeFile={activeFile} 
          onFileSelect={handleFileSelect} 
          onViewModeChange={handleViewModeChange} 
        />
        <div className='markdown-content'>
          <MarkdownTab 
            initialDoc={fileContents[activeFile as keyof typeof fileContents]} 
            viewMode={viewMode}
          />
        </div>
      </div>
    </div>
  );
};
