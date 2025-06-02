import { useState, useEffect, memo, useCallback, useRef } from 'react';
import { Header } from './components/header/page';
import { Sidebar } from './components/sidebar/Sidebar';
import './layout.css';
import EmptyState from './components/emptystate/EmptyState';
import { TabBar } from './components/tabs/tab-bar/TabBar';
import { InlineMarkdownTab } from './components/tabs/markdown/InlineMarkdownTab';
import { ChatUI } from './components/chatbot/chatbot';

interface FileInfo {
  name: string;
  path: string;
  stats?: any;
}

interface TabInfo {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  hashtags: string[];
}

interface SearchResult {
  id: string,
  filePath: string,
  content: string,
  hashtags: string[]
};
import { useFiles } from './hooks/useFiles';
import { useTabs } from './hooks/useTabs';
import { useGraphState } from './hooks/useGraphState';
import { useNotesSync } from './hooks/useNotesSync';
import { useResizePanel } from './hooks/useResizePanel';
import KnowledgeGraph from './components/tabs/markdown/graph/KnowledgeGraph';
import ToastProvider from './components/toast/ToastProvider';

// Memoize the KnowledgeGraph component to prevent unnecessary re-renders
const MemoizedKnowledgeGraph = memo(KnowledgeGraph);

export const App = () => {
  // State for searchResult UI
  const [searchResult, setSearchResult] = useState<boolean>(false); // closing and opening UI
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searchInput, setSearchInput] = useState<string>(''); // For knowing what the input to display

  // State for chatBot
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'assistant'; content: string }[]>([]);

  // Use custom hooks 
  const {
    files,
    notesDirectory,
    graphJsonPath,
    viewMode,
    toggleViewMode,
    handleSelectDirectory,
    handleDeleteFile,
    handleNewNote,
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
    hasGraphChanged,
    triggerGraphRefresh
  } = useGraphState(graphJsonPath);

  const { handleNoteChange } = useNotesSync(
    tabs,
    updateTabContent,
    hasGraphChanged,
    triggerGraphRefresh
  );

  const editorRef = useRef<HTMLDivElement>(null);
  const { width: editorWidth, handleMouseDown: handleMouseDown } = useResizePanel({
    panelRef: editorRef,
    defaultWidthPercent: 50,
    minPercent: 10,
    maxPercent: 90,
  });

  // Get current file path for the active tab
  const getCurrentFilePath = () => {
    if (!activeTab) return undefined;
    const currentTab = tabs.find(tab => tab.id === activeTab);
    return currentTab?.filePath;
  };


  useEffect(() => {
    if (window.electron?.on) {
      const removeListener = window.electron.on.graphRefresh(() => {
        triggerGraphRefresh();
      });

      return () => {
        removeListener();
      };
    }
  }, [triggerGraphRefresh]);

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

  // Handle querying hashtags
  const handleSearch = async (searchQuery: string) => {
    try {
      const queryResults = searchQuery.startsWith('#', 0) ?
        await window.electron.db.queryDBTags(searchQuery.slice(1), notesDirectory)
        : await window.electron.db.queryDBKeyWords(searchQuery, notesDirectory);
      searchQuery === "" ? setResults([]) : setResults(queryResults);
    } catch (err) {
      console.error("Search error:", err);
    }
  };

  const handleDeleteFileSync = async (filePath: string) => {
    const success = await handleDeleteFile(filePath);
    if (success) {
      triggerGraphRefresh();
    }
    return success;
  };

  // Wrap the new note handler to trigger graph refresh after creation
  const handleNewNoteSync = async () => {
    const newFilePath = await handleNewNote()
    if (newFilePath) {
      triggerGraphRefresh();
    }
    return newFilePath;
  };

  return (
    <div className="app">
      <div className="header">
        <Header />
      </div>
      <div className="content">
        <Sidebar
          files={files}
          onFileSelect={handleFileSelect}
          onNewNote={async () => handleFileSelect(await handleNewNoteSync())}
          onSelectDirectory={handleSelectDirectory}
          notesDirectory={notesDirectory}
          onDeleteFile={handleDeleteFileSync}
          activeTab={activeTab}
          setSearchResult={setSearchResult}
          handleFileSelect={handleFileSelect}
          results={results}
          searchInput={searchInput}
          handleSearch={handleSearch}
          setSearchInput={setSearchInput}
          searchResult={searchResult}
          setResults={setResults}
          viewMode={viewMode}
          toggleViewMode={toggleViewMode}
          isChatOpen={isChatOpen}
          setIsChatOpen={setIsChatOpen}
          messages={messages}
          setMessages={setMessages}
        />
        {isChatOpen && 
          <ChatUI
            isChatOpen={isChatOpen}
            setIsChatOpen={setIsChatOpen}
            messages={messages}
            setMessages={setMessages}
          />
        }
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
            <div
              className={activeTab ? "editor-section" : "full-width-section"}
              ref={editorRef}
              style={{
                width: activeTab ? `${editorWidth ?? 50}%` : '100%'
              }}
            >
              {activeTab ? (
                <InlineMarkdownTab
                  files={files}
                  key={activeTab}
                  initialDoc={getCurrentTabContent()}
                  onFileSelect={handleFileSelect}
                  currentFilePath={getCurrentFilePath()}
                  onChange={(content, hashtags) => handleNoteChange(activeTab, content, hashtags)}
                  handleMouseDown={handleMouseDown}
                />
              ) : (
                <EmptyState onCreateNote={handleNewNote} />
              )}
            </div>

            {/* Knowledge graph section*/}
            {activeTab && (
              <div 
                className="knowledge-graph"
                style={{
                  width: `${100 - (editorWidth ?? 50)}%`
                }}
              >
                <MemoizedKnowledgeGraph
                  graphRefreshTrigger={graphRefreshTrigger}
                  graphJsonPath={graphJsonPath}
                  files={files}
                  onFileSelect={handleFileSelect}
                  focusNodeName={activeFileName}
                />
              </div>
            )}
          </div>
        </div>
        <ToastProvider />
      </div>

    </div>
  );
};