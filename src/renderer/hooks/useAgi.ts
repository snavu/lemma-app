import { useState } from 'react';
import { toast } from 'sonner';

interface UseAgiReturn {
  /**
   * Initiates AGI sync process for all files
   * @param showToast Whether to show toast notifications during the sync process
   * @returns Promise that resolves to a boolean indicating success
   */
  syncAgi: (showToast?: boolean) => Promise<boolean>;

  /**
   * Initiates AGI sync process for a specific file
   * @param filename The name of the file to update in AGI
   * @param showToast Whether to show toast notifications during the sync process
   * @returns Promise that resolves to a boolean indicating success
   */
  updateFileInAgi: (filename: string, showToast?: boolean) => Promise<boolean>;

  /**
   * Whether a sync or update operation is currently in progress
   */
  isSyncing: boolean;

  /**
   * Any error that occurred during the last sync attempt
   */
  error: Error | null;
}

/**
 * Hook for syncing AGI configuration with the backend service
 * @returns Object containing sync function, loading state, and error state
 */
export const useAgi = (): UseAgiReturn => {
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  const syncAgi = async (showToast = true): Promise<boolean> => {
    setIsSyncing(true);
    setError(null);

    try {
      let syncPromise = window.electron.agi.syncAgi();

      if (showToast) {
        toast.loading('Syncing AGI...');
      }

      const result = await syncPromise;

      if (showToast) {
        toast.dismiss();
        if (result) {
          toast.success('AGI synced successfully!');
        } else {
          toast.error('Failed to sync AGI');
        }
      }

      setIsSyncing(false);
      return result;
    } catch (err) {
      if (showToast) {
        toast.dismiss();
        toast.error('Failed to sync AGI');
      }

      const syncError = err instanceof Error ? err : new Error('Unknown error syncing AGI');
      setError(syncError);
      console.error('Error syncing AGI:', syncError);
      setIsSyncing(false);
      throw syncError;
    }
  };

  const updateFileInAgi = async (filename: string, showToast = true): Promise<boolean> => {
    if (!filename) {
      throw new Error('Filename is required to update a file in AGI');
    }

    setIsSyncing(true);
    setError(null);

    try {
      let updatePromise = window.electron.agi.updateFileInAgi(filename);

      if (showToast) {
        toast.loading('Syncing AGI...');
      }

      const result = await updatePromise;

      if (showToast) {
        toast.dismiss();
        if (result) {
          toast.success('AGI synced successfully!');
        } else {
          toast.error('Failed to sync AGI');
        }
      }

      setIsSyncing(false);
      return result;
    } catch (err) {
      if (showToast) {
        toast.dismiss();
        toast.error('Failed to sync AGI');
      }

      const updateError = err instanceof Error ? err : new Error(`Unknown error updating ${filename} in AGI`);
      setError(updateError);
      console.error(`Error updating file ${filename} in AGI:`, updateError);
      setIsSyncing(false);
      throw updateError;
    }
  };

  return { syncAgi, updateFileInAgi, isSyncing, error };
};