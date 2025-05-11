// src/App.tsx
import { useState, useEffect } from 'react';
import { Header } from './components/header/page';
import { Sidebar } from './components/sidebar/Sidebar';
import './layout.css';
import EmptyState from './components/emptystate/EmptyState';
import { TabBar } from './components/tabs/tab-bar/TabBar';
import { InlineMarkdownTab } from './components/tabs/markdown/InlineMarkdownTab';
import { useFiles } from './hooks/useFiles';
import { useTabs } from './hooks/useTabs';
import { useGraphState } from './hooks/useGraphState';
import { useNotesSync } from './hooks/useNotesSync';

export const App = () => {
  // View mode
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');

  // Use custom hooks 
  const { 
    files, 
    notesDirectory,
    graphJsonPath, 
    handleSelectDirectory,
    handleDeleteFile,
    handleNewNote
  } = useFiles();

  const {
    tabs,
    activeTab,
    setActiveTab,
    handleFileSelect,
    handleCloseTab,
    getCurrentTabContent
  } = useTabs(files);

  const {
    graphRefreshTrigger,
    isInitialized,
    hasGraphChanged,
    triggerGraphRefresh
  } = useGraphState(graphJsonPath);

  const { handleNoteChange } = useNotesSync(
    tabs, 
    isInitialized, 
    hasGraphChanged, 
    triggerGraphRefresh
  );

  // Get current file path for the active tab
  const getCurrentFilePath = () => {
    if (!activeTab) return undefined;
    const currentTab = tabs.find(tab => tab.id === activeTab);
    return currentTab?.filePath;
  };

  // Set up new note listener from menu
  useEffect(() => {
    if (window.electron?.on) {
      const removeListener = window.electron.on.newNote(() => {
        handleNewNote();
      });

      return () => {
        removeListener();
      };
    }
  }, [handleNewNote]);

  return (
    <div className="app">
      <div className="header">
        <Header />
      </div>
      <div className="content">
        <Sidebar
          files={files}
          onFileSelect={handleFileSelect}
          onNewNote={handleNewNote}
          onSelectDirectory={handleSelectDirectory}
          notesDirectory={notesDirectory}
          onDeleteFile={handleDeleteFile}
          getCurrentTabContent={getCurrentTabContent}
          activeTab={activeTab}
          tabArray={tabs}
          changeTab={setActiveTab}
        />
        <div className="main-content">
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabSelect={setActiveTab}
            onTabClose={handleCloseTab}
          />
          {activeTab && (
            <InlineMarkdownTab
              files={files}
              key={activeTab}
              initialDoc={getCurrentTabContent()}
              viewMode={viewMode}
              onFileSelect={handleFileSelect}
              graphJsonPath={graphJsonPath}
              currentFilePath={getCurrentFilePath()}
              onChange={(content, hashtags) => handleNoteChange(activeTab, content, hashtags)}
              graphRefreshTrigger={graphRefreshTrigger}
            />
          )}
          {!activeTab && <EmptyState onCreateNote={handleNewNote} />}
        </div>
      </div>
    </div>
  );
};