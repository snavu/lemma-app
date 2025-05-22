import { useState, useEffect } from 'react';
import { toast } from 'sonner';

interface UseSgLangReturn {
  /**
   * Stops the SGLang server
   * @param showToast Whether to show toast notifications
   * @returns Promise that resolves to a boolean indicating success
   */
  stopSgLang: (showToast?: boolean) => Promise<boolean>;
  
  /**
   * Restarts the SGLang server
   * @param port Optional port number to use (defaults to config value)
   * @param showToast Whether to show toast notifications
   * @returns Promise that resolves to a boolean indicating success
   */
  restartSgLang: (port?: number, showToast?: boolean) => Promise<boolean>;
  
  /**
   * Whether the SGLang server is currently starting or stopping
   */
  isProcessing: boolean;
  
  /**
   * Whether the SGLang server is currently running
   */
  isRunning: boolean;

  /**
   * Any error that occurred during the last operation
   */
  error: Error | null;
}

/**
 * Hook for managing the SGLang server
 * @returns Object containing server management functions, status states, and error state
 */
export const useSgLang = (): UseSgLangReturn => {
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isRunning, setIsRunning] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const stopSgLang = async (showToast = true): Promise<boolean> => {
    setIsProcessing(true);
    setError(null);

    try {
      if (showToast) {
        toast.loading('Stopping SGLang server...');
      }

      const result = await window.electron.sgLang.stopSgLang();

      if (showToast) {
        toast.dismiss();
        if (result) {
          toast.success('SGLang server stopped successfully!');
        } else {
          toast.error('Failed to stop SGLang server');
        }
      }

      // Update running status
      setIsRunning(!result);
      setIsProcessing(false);
      return result;
    } catch (err) {
      if (showToast) {
        toast.dismiss();
        toast.error('Failed to stop SGLang server');
      }

      const stopError = err instanceof Error ? err : new Error('Unknown error stopping SGLang server');
      setError(stopError);
      console.error('Error stopping SGLang server:', stopError);
      setIsProcessing(false);
      throw stopError;
    }
  };

  const restartSgLang = async (port?: number, showToast = true): Promise<boolean> => {
    setIsProcessing(true);
    setError(null);

    try {
      if (showToast) {
        toast.loading('Restarting SGLang server...');
      }

      const config = port ? { port } : undefined;
      const result = await window.electron.sgLang.restartSgLang(config);

      if (showToast) {
        toast.dismiss();
        if (result) {
          toast.success('SGLang server restarted successfully!');
        } else {
          toast.error('Failed to restart SGLang server');
        }
      }

      // Update running status
      setIsRunning(result);
      setIsProcessing(false);
      return result;
    } catch (err) {
      if (showToast) {
        toast.dismiss();
        toast.error('Failed to restart SGLang server');
      }

      const restartError = err instanceof Error ? err : new Error('Unknown error restarting SGLang server');
      setError(restartError);
      console.error('Error restarting SGLang server:', restartError);
      setIsProcessing(false);
      throw restartError;
    }
  };

  return { 
    stopSgLang, 
    restartSgLang, 
    isProcessing, 
    isRunning, 
    error 
  };
};