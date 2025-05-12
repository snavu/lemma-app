import { useCallback } from 'react';
import { TabInfo } from './useTabs';

// Utility function for debouncing
const debounce = (fn: Function, ms = 1000) => {
  let timeoutId: ReturnType<typeof setTimeout>;
  return function (...args: any[]) {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn.apply(this, args), ms);
  };
};

export const useNotesSync = (
  tabs: TabInfo[],
  updateTabContent: (tabId: string, content: string, hashtags: string[]) => void,
  isInitialized: boolean,
  hasGraphChanged: () => Promise<boolean>,
  triggerGraphRefresh: () => void
) => {
  // Handle markdown content change and auto-save
  const handleNoteChange = useCallback((tabId: string, newContent: string, hashtags: string[]) => {
    // Find the tab that changed
    const tabToUpdate = tabs.find(tab => tab.id === tabId);

    if (!tabToUpdate) return;

    // Auto-save the content to the file
    if (window.electron && tabToUpdate.filePath) {
      // Add debouncing here to avoid too many saves
      console.log("saved: { Hashtags", hashtags, "}");
      autoSaveDebounced(tabId, tabToUpdate.filePath, newContent, hashtags);
    }
  }, [tabs, isInitialized, hasGraphChanged]);


  // Create a debounced version of the save function
  const autoSaveDebounced = useCallback(
    debounce(async (tabId: string, filePath: string, content: string, updateHashtags: string[]) => {
      if (!window.electron?.fs) return;

      try {
        // First save the file
        await window.electron.fs.saveFile(filePath, content, updateHashtags);
        console.log('Auto-saved file:', filePath);

        // Update the tab's content in state
        updateTabContent(tabId, content, updateHashtags);

        // Only check graph changes if initialized
        if (isInitialized) {
          // Check if the graph.json changed
          const didGraphChange = await hasGraphChanged();

          if (didGraphChange) {
            console.log('Graph data changed, refreshing visualization');
            triggerGraphRefresh();
          } else {
            console.log('Graph data unchanged, skipping refresh');
          }
        } else {
          console.log('Graph not initialized yet, skipping graph check');
        }
      } catch (error) {
        console.error('Error during save or sync:', error);
      }
    }, 200), // 200ms debounce time
    [isInitialized, hasGraphChanged]
  );

  return {
    handleNoteChange
  };
};