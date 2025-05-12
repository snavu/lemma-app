import { useState, useEffect, useRef } from 'react';

export const useGraphState = (graphJsonPath: string | null) => {
  const [graphRefreshTrigger, setGraphRefreshTrigger] = useState<number>(0);
  const [lastGraphJson, setLastGraphJson] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const lastGraphJsonRef = useRef<string | null>(null);

  // Initialize graph state
  useEffect(() => {
    const initializeGraph = async () => {
      if (graphJsonPath && window.electron?.fs) {
        try {
          // Read the current graph.json file on mount
          const initialGraphJson = await window.electron.fs.readFile(graphJsonPath);
          
          // Set both the state and the ref
          setLastGraphJson(initialGraphJson);
          lastGraphJsonRef.current = initialGraphJson;
          
          console.log('Graph data initialized');
          
          // Mark as initialized
          setIsInitialized(true);
        } catch (error) {
          console.error('Error initializing graph data:', error);
        }
      }
    };
    
    initializeGraph();
  }, [graphJsonPath]); // Only run when graphJsonPath changes or on mount

  // Function to check if graph has changed
  const hasGraphChanged = async (): Promise<boolean> => {
    if (!graphJsonPath || !window.electron?.fs) return false;
   
    try {
      // Read the current graph.json file
      const currentGraphJson = await window.electron.fs.readFile(graphJsonPath);
  
      // If we haven't stored the previous state yet, store it and return true
      if (lastGraphJson === null) {
        setLastGraphJson(currentGraphJson);
        lastGraphJsonRef.current = currentGraphJson; // Update ref for immediate access
        return true;
      }
  
      // Compare with previous state - use ref for latest value
      if (currentGraphJson !== lastGraphJsonRef.current) {
        // Update both state and ref
        setLastGraphJson(currentGraphJson);
        lastGraphJsonRef.current = currentGraphJson; // Update ref immediately
        
        return true;
      }
  
      // No change detected
      return false;
    } catch (error) {
      console.error('Error checking if graph changed:', error);
      return false;
    }
  };

  const triggerGraphRefresh = () => {
    setGraphRefreshTrigger(prev => prev + 1);
  };

  return {
    graphRefreshTrigger,
    isInitialized,
    hasGraphChanged,
    triggerGraphRefresh
  };
};