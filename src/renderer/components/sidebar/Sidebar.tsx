import React, { useState, useCallback, ReactNode } from 'react';
import { ContextMenu } from '../context-menu/ContextMenu';
import { Search } from './search';
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

interface SidebarProps {
  files: FileInfo[];
  notesDirectory: string | null;
  onFileSelect: (filePath: string) => void;
  onNewNote: () => void;
  onSelectDirectory: () => void;
  onDeleteFile: (filePath: string) => Promise<boolean>;
  getCurrentTabContent: () => string;
  activeTab: string | null;
  tabArray: TabInfo[];
  changeTab: (tabId: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  files,
  notesDirectory,
  onFileSelect,
  onNewNote,
  onSelectDirectory,
  onDeleteFile,
  getCurrentTabContent,
  activeTab,
  tabArray,
  changeTab,
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

  // Icons for the sidebar
  const NewNoteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
      <path d="M12 5v14M5 12h14"></path>
    </svg>
  );

  const FolderIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '6px' }}>
      <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
    </svg>
  );

  const NoteIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
      <polyline points="14 2 14 8 20 8"></polyline>
      <line x1="16" y1="13" x2="8" y2="13"></line>
      <line x1="16" y1="17" x2="8" y2="17"></line>
      <polyline points="10 9 9 9 8 9"></polyline>
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

  // console.log(tabArray);

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h3>Notes</h3>
        <div className="sidebar-actions">
          <button onClick={onNewNote} title="New Note">
            <NewNoteIcon /> New
          </button>
          <button onClick={onSelectDirectory} title="Select Notes Directory">
            <FolderIcon /> Folder
          </button>
        </div>
      </div>

      <div className="notes-location">
        {notesDirectory ? (
          <span title={notesDirectory}>
            <FolderIcon /> {notesDirectory.split(/[\\/]/).pop()}
          </span>
        ) : (
          <span>No folder selected</span>
        )}
      </div>

      {activeTab && <Search 
        getCurrentTabContent={getCurrentTabContent}
        tabArray={tabArray}
        activeTab={activeTab}
        searchTab={changeTab}
        />}

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
                // This is a placeholder - you would implement the rename functionality
                alert('Rename functionality will be implemented soon');
              },
              icon: <RenameIcon />
            },
            {
              label: 'Duplicate',
              onClick: () => {
                // This is a placeholder - you would implement the duplicate functionality
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
    </div>
  );
};