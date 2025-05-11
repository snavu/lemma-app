import { useState, useEffect, memo } from 'react';
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
import KnowledgeGraph from './components/tabs/markdown/graph/KnowledgeGraph';

// Memoize the KnowledgeGraph component to prevent unnecessary re-renders
const MemoizedKnowledgeGraph = memo(KnowledgeGraph);

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
    activeFileName,
    setActiveTab,
    updateTabContent,
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
    updateTabContent,
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
        <div className="main-content-wrapper">
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabSelect={setActiveTab}
            onTabClose={handleCloseTab}
          />
          {/* Split content area to separate editor and graph */}
          <div className="split-content-area">
            {/* Editor section */}
            <div className={activeTab ? "editor-section" : "full-width-section"}>
              {activeTab ? (
                <InlineMarkdownTab
                  files={files}
                  key={activeTab}
                  initialDoc={getCurrentTabContent()}
                  viewMode={viewMode}
                  onFileSelect={handleFileSelect}
                  currentFilePath={getCurrentFilePath()}
                  onChange={(content, hashtags) => handleNoteChange(activeTab, content, hashtags)}
                />
              ) : (
                <EmptyState onCreateNote={handleNewNote} />
              )}
            </div>
            
            {/* Knowledge graph section*/}
            {activeTab && (
              <MemoizedKnowledgeGraph
                graphRefreshTrigger={graphRefreshTrigger}
                graphJsonPath={graphJsonPath}
                files={files}
                onFileSelect={handleFileSelect}
                focusNodeId={activeFileName} 
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};