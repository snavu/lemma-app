import { useCallback, useRef, useEffect } from 'react';
import { TabInfo } from './useTabs';

export const useNotesSync = (
  tabs: TabInfo[],
  updateTabContent: (tabId: string, content: string, hashtags: string[]) => void,
  hasGraphChanged: () => Promise<boolean>,
  triggerGraphRefresh: () => void
) => {
  // Create a ref to store the debounced function
  const saveTimeoutRef = useRef<any>(null);
  
  // Create refs for the latest callback functions
  const hasGraphChangedRef = useRef(hasGraphChanged);
  const triggerGraphRefreshRef = useRef(triggerGraphRefresh);
  
  // Update refs when dependencies change
  useEffect(() => {
    hasGraphChangedRef.current = hasGraphChanged;
    triggerGraphRefreshRef.current = triggerGraphRefresh;
  }, [hasGraphChanged, triggerGraphRefresh]);

  // Function to save file and check graph
  const saveAndCheckGraph = useCallback(async (
    filePath: string, 
    content: string, 
    updateHashtags: string[]
  ) => {
    if (!window.electron?.fs) return;

    try {
      // First save the file
      await window.electron.fs.saveFile(filePath, content, updateHashtags);
      console.log('Auto-saved file:', filePath);

      // Check if the graph.json changed
      const didGraphChange = await hasGraphChangedRef.current();

      if (didGraphChange) {
        triggerGraphRefreshRef.current();
      }
    } catch (error) {
      console.error('Error during save or sync:', error);
    }
  }, []);

  // Handle markdown content change with debouncing
  const handleNoteChange = useCallback((tabId: string, newContent: string, hashtags: string[]) => {
    // Find the tab that changed
    const tabToUpdate = tabs.find(tab => tab.id === tabId);
    if (!tabToUpdate) return;

    // Update the tab's content in state immediately
    updateTabContent(tabId, newContent, hashtags);

    // Auto-save the content to the file with debouncing
    if (window.electron && tabToUpdate.filePath) {
      
      // Clear any existing timeout
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      
      // Set a new timeout
      saveTimeoutRef.current = setTimeout(() => {
        saveAndCheckGraph(tabToUpdate.filePath, newContent, hashtags);
      }, 200);
    }
  }, [tabs, updateTabContent, saveAndCheckGraph]);

  return {
    handleNoteChange
  };
};