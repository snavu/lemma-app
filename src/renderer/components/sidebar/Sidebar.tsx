import React, { useState } from 'react';
import './sidebar.css';

interface FileInfo {
  name: string;
  path: string;
  stats?: any;
}

interface SidebarProps {
  files: FileInfo[];
  onFileSelect: (filePath: string) => void;
  onNewNote: () => void;
  onSelectDirectory: () => void;
  onViewModeChange?: (mode: 'split' | 'editor' | 'preview') => void;
  viewMode: 'split' | 'editor' | 'preview';
  notesDirectory: string | null;
}

export const Sidebar: React.FC<SidebarProps> = ({ 
  files, 
  onFileSelect, 
  onNewNote,
  onSelectDirectory,
  onViewModeChange,
  viewMode,
  notesDirectory
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
  };
  
  return (
    <div className="sidebar">
      <div className="sidebar-nav">
        <div className="sidebar-nav-item">
          <svg className="sidebar-nav-item-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M3,3H21V8H3V3M3,10H21V15H3V10M3,17H21V22H3V17Z" />
          </svg>
          Files
        </div>
        
        <div className="sidebar-nav-item active">
          <svg className="sidebar-nav-item-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M13,9H18.5L13,3.5V9M6,2H14L20,8V20A2,2 0 0,1 18,22H6C4.89,22 4,21.1 4,20V4C4,2.89 4.89,2 6,2M15,18V16H6V18H15M18,14V12H6V14H18Z" />
          </svg>
          Notes
          <button 
            className="folder-button"
            onClick={onSelectDirectory}
            title="Select folder"
            style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M10,4H4C2.89,4 2,4.89 2,6V18A2,2 0 0,0 4,20H20A2,2 0 0,0 22,18V8C22,6.89 21.1,6 20,6H12L10,4Z" />
            </svg>
          </button>
        </div>
        
        <div className="sidebar-nav-item">
          <svg className="sidebar-nav-item-icon" viewBox="0 0 24 24">
            <path fill="currentColor" d="M12,3C17.5,3 22,6.58 22,11C22,15.42 17.5,19 12,19C10.76,19 9.57,18.82 8.47,18.5C5.55,21 2,21 2,21C4.33,18.67 4.7,17.1 4.75,16.5C3.05,15.07 2,13.13 2,11C2,6.58 6.5,3 12,3Z" />
          </svg>
          Chat
        </div>
        
        {notesDirectory && (
          <div className="directory-info" style={{ padding: '8px', fontSize: '12px', color: '#777' }}>
            {notesDirectory}
          </div>
        )}
        
        {/* Files section header with new note button */}
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          padding: '8px 12px',
          marginTop: '10px'
        }}>
          <span style={{ fontSize: '13px', fontWeight: 'bold' }}>Files</span>
          <button 
            onClick={onNewNote}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="New note"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19,13H13V19H11V13H5V11H11V5H13V11H19V13Z" />
            </svg>
          </button>
        </div>
        
        {/* Files list */}
        <div style={{ marginTop: '10px' }}>
          {files.length === 0 && notesDirectory && (
            <div style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#888' }}>
              No markdown files found
            </div>
          )}
          
          {!notesDirectory && (
            <div style={{ padding: '10px', textAlign: 'center', fontSize: '13px', color: '#888' }}>
              Select a folder to view files
            </div>
          )}
          
          {files.map((file) => (
            <div 
              key={file.path}
              className="sidebar-nav-item"
              onClick={() => onFileSelect(file.path)}
            >
              <svg className="sidebar-nav-item-icon" viewBox="0 0 24 24">
                <path fill="currentColor" d="M13,9V3.5L18.5,9M6,2C4.89,2 4,2.89 4,4V20A2,2 0 0,0 6,22H18A2,2 0 0,0 20,20V8L14,2H6Z" />
              </svg>
              {file.name}
            </div>
          ))}
        </div>
      </div>
      
      <div className="view-controls-container">
        <div className="view-controls">
          <button 
            className={viewMode === 'editor' ? 'active' : ''} 
            onClick={() => handleViewModeChange('editor')}
            title="Editor only"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M3,3H21V21H3V3M5,5V19H19V5H5Z" />
            </svg>
          </button>
          <button 
            className={viewMode === 'split' ? 'active' : ''} 
            onClick={() => handleViewModeChange('split')}
            title="Split view"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M13,3V21H21V3H13M3,21H11V3H3V21Z" />
            </svg>
          </button>
          <button 
            className={viewMode === 'preview' ? 'active' : ''} 
            onClick={() => handleViewModeChange('preview')}
            title="Preview only"
          >
            <svg viewBox="0 0 24 24" width="16" height="16">
              <path fill="currentColor" d="M19,3H5C3.89,3 3,3.89 3,5V19A2,2 0 0,0 5,21H19A2,2 0 0,0 21,19V5C21,3.89 20.1,3 19,3M19,5V19H5V5H19Z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};