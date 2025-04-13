import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/header/page';
import { Sidebar } from './components/sidebar/Sidebar';
import { TabBar } from './components/tabs/tabbar/TabBar';
import { MarkdownTab } from './components/tabs/markdown/MarkdownTab';
import './layout.css';

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
  unsaved: boolean;
}

export const App = () => {
  // State for files and directories
  const [notesDirectory, setNotesDirectory] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);
  
  // State for tabs system
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  
  // View mode
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');

  // Load files when directory is selected
  useEffect(() => {
    const loadFiles = async () => {
      if (notesDirectory && window.electron?.fs) {
        try {
          const files = await window.electron.fs.getFiles();
          setFiles(files);
        } catch (error) {
          console.error('Failed to load files:', error);
        }
      }
    };

    loadFiles();
  }, [notesDirectory]);

  // Set up directory selection listener
  useEffect(() => {
    if (window.electron?.on) {
      const removeListener = window.electron.on.notesDirectorySelected((directory) => {
        setNotesDirectory(directory);
      });

      return () => {
        removeListener();
      };
    }
  }, []);

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
  }, []);

  // Set up save note listener from menu
  useEffect(() => {
    if (window.electron?.on) {
      const removeListener = window.electron.on.saveNote(() => {
        handleSaveCurrentNote();
      });

      return () => {
        removeListener();
      };
    }
  }, [tabs, activeTab]);

  // Handle selecting notes directory
  const handleSelectDirectory = useCallback(async () => {
    if (window.electron?.fs) {
      await window.electron.fs.selectDirectory();
    }
  }, []);

  // Handle file selection from sidebar
  const handleFileSelect = useCallback(async (filePath: string) => {
    if (!window.electron?.fs) return;
    
    // Check if file is already open in a tab
    const existingTab = tabs.find(tab => tab.filePath === filePath);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return;
    }

    try {
      const content = await window.electron.fs.readFile(filePath);
      const fileName = filePath.split(/[\\/]/).pop() || 'Untitled';
      
      const newTab: TabInfo = {
        id: `tab-${Date.now()}`,
        filePath,
        fileName,
        content,
        unsaved: false
      };
      
      setTabs(prevTabs => [...prevTabs, newTab]);
      setActiveTab(newTab.id);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, [tabs]);

  // Handle creating a new note
  const handleNewNote = useCallback(async () => {
    if (!window.electron?.fs) return;
    
    if (!notesDirectory) {
      const directory = await window.electron.fs.selectDirectory();
      if (!directory) return;
    }

    // Create a unique filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const fileName = `Note ${timestamp}.md`;
    
    try {
      const result = await window.electron.fs.createFile(fileName);
      
      // Add new file to files list
      const newFiles = await window.electron.fs.getFiles();
      setFiles(newFiles);
      
      // Open the new file
      await handleFileSelect(result.filePath);
    } catch (error) {
      console.error('Failed to create new note:', error);
    }
  }, [notesDirectory, handleFileSelect]);

  // Handle markdown content change
  const handleNoteChange = useCallback((tabId: string, newContent: string) => {
    setTabs(prevTabs => prevTabs.map(tab => 
      tab.id === tabId 
        ? { ...tab, content: newContent, unsaved: true } 
        : tab
    ));
  }, []);

  // Handle saving the current note
  const handleSaveCurrentNote = useCallback(async () => {
    if (!window.electron?.fs || !activeTab) return;
    
    const currentTab = tabs.find(tab => tab.id === activeTab);
    if (!currentTab) return;
    
    try {
      await window.electron.fs.saveFile(currentTab.filePath, currentTab.content);
      
      // Mark tab as saved
      setTabs(prevTabs => prevTabs.map(tab => 
        tab.id === activeTab 
          ? { ...tab, unsaved: false } 
          : tab
      ));
      
      // Refresh file list to update last modified times
      const newFiles = await window.electron.fs.getFiles();
      setFiles(newFiles);
    } catch (error) {
      console.error('Failed to save note:', error);
    }
  }, [activeTab, tabs]);

  // Handle closing a tab
  const handleCloseTab = useCallback((tabId: string) => {
    const tabToClose = tabs.find(tab => tab.id === tabId);
    
    if (tabToClose?.unsaved) {
      // Prompt the user to save changes
      const shouldSave = window.confirm('Save changes before closing?');
      if (shouldSave && window.electron?.fs) {
        // Save the file before closing
        window.electron.fs.saveFile(tabToClose.filePath, tabToClose.content)
          .then(() => {
            // Remove the tab after saving
            setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId));
            
            // If closing the active tab, activate another tab if available
            if (activeTab === tabId) {
              const remainingTabs = tabs.filter(tab => tab.id !== tabId);
              setActiveTab(remainingTabs.length > 0 ? remainingTabs[0].id : null);
            }
          })
          .catch(error => {
            console.error('Failed to save before closing:', error);
          });
        return;
      }
    }
    
    // Remove the tab without saving
    setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId));
    
    // If closing the active tab, activate another tab if available
    if (activeTab === tabId) {
      const remainingTabs = tabs.filter(tab => tab.id !== tabId);
      setActiveTab(remainingTabs.length > 0 ? remainingTabs[0].id : null);
    }
  }, [tabs, activeTab]);

  // Get current tab content
  const getCurrentTabContent = useCallback(() => {
    if (!activeTab) return '';
    const currentTab = tabs.find(tab => tab.id === activeTab);
    return currentTab?.content || '';
  }, [activeTab, tabs]);

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
          onViewModeChange={setViewMode}
          viewMode={viewMode}
          notesDirectory={notesDirectory}
        />
        <div className="main-content">
          <TabBar 
            tabs={tabs} 
            activeTab={activeTab} 
            onTabSelect={setActiveTab} 
            onTabClose={handleCloseTab}
          />
          {activeTab && (
            <MarkdownTab 
              initialDoc={getCurrentTabContent()} 
              viewMode={viewMode}
              onChange={(content) => handleNoteChange(activeTab, content)}
            />
          )}
          {!activeTab && (
            <div className="empty-state">
              <h2>No Notes Open</h2>
              <p>Open a note from the sidebar or create a new one to get started.</p>
              <button onClick={handleNewNote}>Create New Note</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};