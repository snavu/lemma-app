// src/hooks/useTabs.ts
import { useState, useCallback, useEffect } from 'react';
import { FileInfo } from './useFiles';

export interface TabInfo {
  id: string;
  filePath: string;
  fileName: string;
  content: string;
  hashtags: string[];
}

export const useTabs = (files: FileInfo[]) => {
  const [tabs, setTabs] = useState<TabInfo[]>([]);
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const [activeFileName, setActiveFileName] = useState<string | null>(null); 

  // Handle file selection from sidebar
  const handleFileSelect = useCallback(async (filePath: string) => {
    if (!window.electron?.fs) return;

    // Check if file is already open in a tab
    const existingTab = tabs.find(tab => tab.filePath === filePath);
    if (existingTab) {
      setActiveTab(existingTab.id);
      setActiveFileName(existingTab.fileName); 
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

  // Effect to update activeFileName when activeTab changes
  useEffect(() => {
    if (activeTab) {
      const currentTab = tabs.find(tab => tab.id === activeTab);
      if (currentTab) {
        setActiveFileName(currentTab.fileName);
      }
    } else {
      setActiveFileName(null);
    }
  }, [activeTab, tabs]);

  // Handle closing a tab
  const handleCloseTab = useCallback((tabId: string) => {
    setTabs(prevTabs => prevTabs.filter(tab => tab.id !== tabId));

    // If closing the active tab, activate another tab if available
    if (activeTab === tabId) {
      const remainingTabs = tabs.filter(tab => tab.id !== tabId);
      if (remainingTabs.length > 0) {
        setActiveTab(remainingTabs[0].id);
        setActiveFileName(remainingTabs[0].fileName); // Update active file name
      } else {
        setActiveTab(null);
        setActiveFileName(null);
      }
    }
  }, [tabs, activeTab]);

  // Effect to clean up tabs if files are deleted
  useEffect(() => {
    const filePaths = new Set(files.map(file => file.path));
    
    // Check if any open tabs have files that no longer exist
    const deletedFileTabs = tabs.filter(tab => !filePaths.has(tab.filePath));
    
    // Close tabs of deleted files
    if (deletedFileTabs.length > 0) {
      setTabs(prevTabs => prevTabs.filter(tab => filePaths.has(tab.filePath)));
      
      // If active tab was deleted, switch to another tab
      if (activeTab && deletedFileTabs.some(tab => tab.id === activeTab)) {
        const remainingTabs = tabs.filter(tab => filePaths.has(tab.filePath));
        if (remainingTabs.length > 0) {
          setActiveTab(remainingTabs[0].id);
          setActiveFileName(remainingTabs[0].fileName); // Update active file name
        } else {
          setActiveTab(null);
          setActiveFileName(null);
        }
      }
    }
  }, [files, tabs, activeTab]);

  // Get current tab content (kept for backward compatibility)
  const getCurrentTabContent = useCallback(() => {
    if (!activeTab) return '';
    const currentTab = tabs.find(tab => tab.id === activeTab);
    return currentTab?.content || '';
  }, [activeTab, tabs]);
  
  // Update tab content
  const updateTabContent = useCallback((tabId: string, content: string, hashtags: string[]) => {
    setTabs(prevTabs => prevTabs.map(tab =>
      tab.id === tabId ? { ...tab, content, hashtags } : tab
    ));
  }, []);

  return {
    tabs,
    activeTab,
    activeFileName,
    setActiveTab,
    handleFileSelect,
    handleCloseTab,
    getCurrentTabContent,
    updateTabContent
  };
};