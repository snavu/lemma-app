import { useState, useEffect, useCallback } from 'react';
import { Header } from './components/header/page';
import { Sidebar } from './components/sidebar/Sidebar';
import './layout.css';
import EmptyState from './components/emptystate/EmptyState';
import { TabBar } from './components/tabs/tab-bar/TabBar';
import { InlineMarkdownTab } from './components/tabs/markdown/InlineMarkdownTab';
import { SearchResults } from './components/search/searchResult';
//import React from 'react';

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

export const App = () => {
  // State for files and directories
  const [notesDirectory, setNotesDirectory] = useState<string | null>(null);
  const [files, setFiles] = useState<FileInfo[]>([]);

  // State for tabs system
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);

  // State for searchResult UI
  const [searchResult, setSearchResult] = useState<boolean>(false);

  // View mode
  const [viewMode, setViewMode] = useState<'split' | 'editor' | 'preview'>('split');

  // Check for default directory on initial load
  useEffect(() => {
    const checkForDefaultDirectory = async () => {
      if (window.electron?.fs) {
        try {
          const directory = await window.electron.fs.getNotesDirectory();
          if (directory) {
            setNotesDirectory(directory);
          }
        } catch (error) {
          console.error('Failed to get default notes directory:', error);
        }
      }
    };

    checkForDefaultDirectory();
  }, []);

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

    if (notesDirectory) {
      loadFiles();
    }
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
        hashtags: [],
      };

      setTabs(prevTabs => [...prevTabs, newTab]);
      setActiveTab(newTab.id);
    } catch (error) {
      console.error('Failed to open file:', error);
    }
  }, [tabs]);

  // Handle file deletion
  const handleDeleteFile = useCallback(async (filePath: string) => {
    if (!window.electron?.fs) return;

    try {
      // Delete the file
      await window.electron.fs.deleteFile(filePath);

      // Refresh the files list
      const updatedFiles = await window.electron.fs.getFiles();
      setFiles(updatedFiles);

      // If the file is open in a tab, close it
      const tabToClose = tabs.find(tab => tab.filePath === filePath);
      if (tabToClose) {
        handleCloseTab(tabToClose.id);
      }

      return true;
    } catch (error) {
      console.error('Failed to delete file:', error);
      return false;
    }
  }, [tabs]);

  // Handle creating a new note
  const handleNewNote = useCallback(async () => {
    if (!window.electron?.fs) return;

    // The app will now use the default directory if one isn't already set
    try {
      // Create a unique filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `Note ${timestamp}.md`;

      const result = await window.electron.fs.createFile(fileName);

      // Refresh files list
      const newFiles = await window.electron.fs.getFiles();
      setFiles(newFiles);

      // Get the notes directory if it's not already set
      if (!notesDirectory) {
        const directory = await window.electron.fs.getNotesDirectory();
        setNotesDirectory(directory);
      }

      // Open the new file
      await handleFileSelect(result.filePath);
    } catch (error) {
      console.error('Failed to create new note:', error);
    }
  }, [notesDirectory, handleFileSelect]);

  // Handle markdown content change
  const handleNoteChange = useCallback((tabId: string, newContent: string, hashtags: string[]) => {
    // Find the tab that changed
    const tabToUpdate = tabs.find(tab => tab.id === tabId);

    if (!tabToUpdate) return;

    // Update the tab's content in state
    setTabs(prevTabs => prevTabs.map(tab =>
      tab.id === tabId ? { ...tab, content: newContent } : tab
    ));

    // Auto-save the content to the file
    if (window.electron && tabToUpdate.filePath) {
      // Add debouncing here to avoid too many saves
      console.log("saved: ", hashtags);
      autoSaveDebounced(tabToUpdate.filePath, newContent, hashtags);
    }
  }, [tabs]);

  // Debounce function to limit the rate of auto-saving
  const debounce = (fn: Function, ms = 1000) => {
    let timeoutId: ReturnType<typeof setTimeout>;
    return function (...args: any[]) {
      clearTimeout(timeoutId);
      timeoutId = setTimeout(() => fn.apply(this, args), ms);
    };
  };

  // Create a debounced version of the save function
  const autoSaveDebounced = useCallback(
    debounce((filePath: string, content: string, updateHashtags: string[]) => {
      window.electron?.fs.saveFile(filePath, content, updateHashtags)
        .then(() => {
          console.log('Auto-saved file:', filePath);

        })
        .catch(error => {
          console.error('Failed to auto-save file:', error);
        });
    }, 200), // 200ms debounce time
    []
  );

  // Handle closing a tab
  const handleCloseTab = useCallback((tabId: string) => {
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
          notesDirectory={notesDirectory}
          onDeleteFile={handleDeleteFile}
          getCurrentTabContent={getCurrentTabContent}
          activeTab={activeTab}
          tabArray={tabs}
          changeTab={setActiveTab}
          setSearchresult={setSearchResult}
        />
        {searchResult && <SearchResults setSearchresult={setSearchResult}/>}
        <div className="main-content">
          <TabBar
            tabs={tabs}
            activeTab={activeTab}
            onTabSelect={setActiveTab}
            onTabClose={handleCloseTab}
          />
          {activeTab && (
            <InlineMarkdownTab
              key={activeTab}
              initialDoc={getCurrentTabContent()}
              viewMode={viewMode}
              onChange={(content, hashtags) => handleNoteChange(activeTab, content, hashtags)}
            />
          )}
          {!activeTab && <EmptyState onCreateNote={handleNewNote} />}
        </div>
      </div>
    </div>
  );
};
