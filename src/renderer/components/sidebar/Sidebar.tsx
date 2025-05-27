import React, { useState, useCallback, ReactNode , useEffect, useRef, SetStateAction, Dispatch} from 'react';
import { ContextMenu } from '../context-menu/ContextMenu';
import { SearchResults } from '../search/searchResult';
import LLMSettingsModal from '../settings-modal/LLMSettingsModal';
import { viewMode } from 'src/shared/types';
import './sidebar.css';

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

interface SidebarProps {
  files: FileInfo[];
  notesDirectory: string | null;
  onFileSelect: (filePath: string) => void;
  onNewNote: () => void;
  onSelectDirectory: () => void;
  onDeleteFile: (filePath: string) => Promise<boolean>;
  activeTab: string | null;
  setSearchresult: (check: boolean) => void;
  results: SearchResult[];
  searchInput: string;
  handleFileSelect: (filePath: string) => void;
  handleSearch: (searchQuery: string) => void;
  setSearchInput: (input: string) => void;
  searchResult: boolean;
  setResults: (info: SearchResult[]) => void;
  viewMode: viewMode;
  toggleViewMode: () => void;
  isChatOpen: boolean;
  setIsChatOpen: (bool: boolean) => void;
  messages: { role: 'user' | 'assistant'; content: string }[];
  setMessages: Dispatch<SetStateAction<{ role: 'user' | 'assistant'; content: string }[]>>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  notesDirectory,
  onFileSelect,
  onNewNote,
  onSelectDirectory,
  onDeleteFile,
  activeTab,
  setSearchresult,
  results,
  searchInput,
  handleFileSelect,
  handleSearch,
  setSearchInput,
  searchResult,
  setResults,
  viewMode,
  toggleViewMode,
  isChatOpen,
  setIsChatOpen,
  messages,
  setMessages,
}) => {
  // State for context menu
  const [contextMenu, setContextMenu] = useState<{
    show: boolean;
    x: number;
    y: number;
    filePath: string;
  }>({
    show: false,
    x: 0,
    y: 0,
    filePath: '',
  });

  // State for LLM settings modal
  const [isLLMSettingsOpen, setIsLLMSettingsOpen] = useState(false);

  // Handler for right-click on a file
  const handleContextMenu = useCallback(
    (e: React.MouseEvent, filePath: string) => {
      e.preventDefault();
      setContextMenu({
        show: true,
        x: e.clientX,
        y: e.clientY,
        filePath,
      });
    },
    []
  );

  // Close context menu
  const closeContextMenu = useCallback(() => {
    setContextMenu((prev) => ({ ...prev, show: false }));
  }, []);

  // Delete file handler
  const handleDeleteFile = useCallback(async () => {
    const { filePath } = contextMenu;
    if (!filePath) return;

    try {
      // Call the parent component's delete handler
      const success = await onDeleteFile(filePath);

      if (!success) {
        alert('Failed to delete file. Please try again.');
      }
    } catch (error) {
      console.error('Failed to delete file:', error);
      alert('Failed to delete file. Please try again.');
    }
  }, [contextMenu, onDeleteFile]);

  // Open LLM settings modal
  const openLLMSettings = () => {
    setIsLLMSettingsOpen(true);
  };

  // Close LLM settings modal
  const closeLLMSettings = () => {
    setIsLLMSettingsOpen(false);
  };

  // Icons for the sidebar
  const NewNoteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14"></path>
    </svg>
  );

  const FolderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  );

  const NoteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
    </svg>
  );

  const SearchIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8"></circle>
      <line x1="16" y1="16" x2="20" y2="20" />
    </svg>
  );

  const AISettingsIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"></circle>
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"></path>
    </svg>
  );

  const ViewModeIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="3" y1="9" x2="21" y2="9"></line>
      <line x1="9" y1="21" x2="9" y2="9"></line>
    </svg>
  );

  const ChatBubbleIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 11.5a8.38 8.38 0 0 1-1.9 5.4c.1 1.1.5 2.1 1.4 3.1-1.5-.2-2.8-.6-3.9-1.4a8.5 8.5 0 1 1 4.4-7.1z" />
    </svg>
  );

  const CollapseIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
      <line x1="9" y1="21" x2="9" y2="3"></line>
    </svg>
  );

  // Icons for the context menu
  const OpenIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
      <circle cx="12" cy="12" r="3"></circle>
    </svg>
  );

  const DeleteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6"></polyline>
      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      <line x1="10" y1="11" x2="10" y2="17"></line>
      <line x1="14" y1="11" x2="14" y2="17"></line>
    </svg>
  );

  const RenameIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"></path>
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
    </svg>
  );

  const DuplicateIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
    </svg>
  );

  return (
    <div className="sidebar">
      {/* Vertical buttons column */}
      <div className="sidebar-actions-container">
        <div className="sidebar-actions">
          <button className="collapse" title="collapse">
                <CollapseIcon/>
          </button>
          <button onClick={onNewNote} title="New Note">
            <NewNoteIcon />
          </button>
          <button onClick={onSelectDirectory} title="Select Notes Directory">
            <FolderIcon />
          </button>
          <button onClick={() => setSearchresult(true)} title="Search">
            <SearchIcon />
          </button>
          <button onClick={openLLMSettings} title="AI Settings">
            <AISettingsIcon />
          </button>
          <button
            onClick={toggleViewMode}
            className={viewMode === 'generated' ? 'active' : ''}
            title="Toggle View Mode"
          >
            <ViewModeIcon />
          </button>
          <button onClick={() => setIsChatOpen(true)} title="ChatBot">
            <ChatBubbleIcon/>
          </button>
        </div>
      </div>
  
      {/* Main content area */}
      <div className="sidebar-content">
        {!searchResult && (
          <>
            <div className="notes-location">
              {notesDirectory ? (
                <span title={notesDirectory}>
                  <FolderIcon /> {notesDirectory.split(/[\\/]/).pop()}
                </span>
              ) : (
                <span>No folder selected</span>
              )}
            </div>
  
            <div className="files-list">
              {files.length === 0 ? (
                <div className="no-files">
                  {notesDirectory
                    ? 'No notes yet. Create your first note!'
                    : 'Select a notes folder to get started.'}
                </div>
              ) : (
                <ul>
                  {files.map((file) => (
                    <li
                      key={file.path}
                      onClick={() => onFileSelect(file.path)}
                      onContextMenu={(e) => handleContextMenu(e, file.path)}
                    >
                      <span className="file-icon"><NoteIcon /></span>
                      <span className="file-name">{file.name}</span>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </>
        )}
  
        {searchResult && (
          <SearchResults
            handleFileSelect={handleFileSelect}
            setSearchresult={setSearchresult}
            results={results}
            searchInput={searchInput}
            handleSearch={handleSearch}
            setSearchInput={setSearchInput}
            setResults={setResults}
          />
        )}
      </div>
  
      {/* Context Menu */}
      {contextMenu.show && (
        <ContextMenu
          x={contextMenu.x}
          y={contextMenu.y}
          onClose={closeContextMenu}
          options={[
            {
              label: 'Open',
              onClick: () => onFileSelect(contextMenu.filePath),
              icon: <OpenIcon />
            },
            {
              label: 'Rename',
              onClick: () => {
                alert('Rename functionality will be implemented soon');
              },
              icon: <RenameIcon />
            },
            {
              label: 'Duplicate',
              onClick: () => {
                alert('Duplicate functionality will be implemented soon');
              },
              icon: <DuplicateIcon />
            },
            {
              isSeparator: true
            },
            {
              label: 'Delete',
              onClick: handleDeleteFile,
              className: 'danger',
              icon: <DeleteIcon />
            },
          ]}
        />
      )}
  
      {/* LLM Settings Modal */}
      <LLMSettingsModal
        isOpen={isLLMSettingsOpen}
        onClose={closeLLMSettings}
      />
    </div>
  );  
};