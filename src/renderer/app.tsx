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

  const [editorWidth, setEditorWidth] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // Resize handlers
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsResizing(true);
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isResizing || !editorRef.current) return;
  
    const container = editorRef.current.parentElement;  
    if (!container) return;
    
    const containerRect = container.getBoundingClientRect();
    const offsetX = e.clientX - containerRect.left;
    const containerWidth = containerRect.width;
  
    const minWidthPercent = 10;
    const maxWidthPercent = 90;
    const newWidthPercent = (offsetX / containerWidth) * 100;
  
    if (newWidthPercent >= minWidthPercent && newWidthPercent <= maxWidthPercent) {
      setEditorWidth(newWidthPercent);
    }
  }, [isResizing]);
  

  const handleMouseUp = useCallback(() => {
    setIsResizing(false);
  }, []);

  // Add event listeners for resize
  useEffect(() => {
    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = 'ew-resize';
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing, handleMouseMove, handleMouseUp]);

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
                width: activeTab ? `${editorWidth}%` : '100%'
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
              <MemoizedKnowledgeGraph
                graphRefreshTrigger={graphRefreshTrigger}
                graphJsonPath={graphJsonPath}
                files={files}
                onFileSelect={handleFileSelect}
                focusNodeName={activeFileName}
              />
            )}
          </div>
        </div>
        <ToastProvider />
      </div>

    </div>
  );
};