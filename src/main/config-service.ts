import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { agiConfig, llmConfig, localInferenceConfig, viewMode } from 'src/shared/types';

/**
 * AGI sync state for individual files
 */
export interface AgiSyncState {
  [filename: string]: boolean; // true = synced, false = not synced yet
}

export interface AgiRequestState {
  [filename: string]: {
    requestId: string;
    timestamp: number;
  };
}

/**
 * Configuration service for managing app settings
 */
export class Config {
  private config: {
    notesDirectory: string;
    viewMode: viewMode;
    llm: llmConfig;
    agi: agiConfig;
    local: localInferenceConfig;
    agiSyncState: AgiSyncState;
    agiRequestState: AgiRequestState;

  };

  private configPath: string | null;

  constructor() {
    this.configPath = this.getConfigPath();
    this.config = this.loadConfig();
  }

  /**
   * Get the path to the config file
   */
  private getConfigPath(): string | null {
    return path.join(app.getPath('userData'), 'config.json');
  }

  /**
   * Load config from disk
   */
  private loadConfig() {
    try {
      this.ensureConfigFile();
      const data = fs.readFileSync(this.configPath, 'utf8');
      return JSON.parse(data);

    } catch (error) {
      console.error('Error loading config:', error);
    }
  }

  /**
   * Save config to disk
   */
  private saveConfig() {
    try {
      if (this.configPath) {
        // Ensure directory exists
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2));
      } else {
        console.error('Cannot save config: Config path not available');
      }
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * Get the note path configuration
   */
  getMainNotesDirectory() {
    return this.config.notesDirectory || null;
  }

  /**
   * Set the main notes directory
   */
  setMainNotesDirectory(directory: string) {
    this.config.notesDirectory = directory;
    this.saveConfig();
    return this.config.notesDirectory;
  }

  /**
   * Get the current view mode
   */
  getViewMode() {
    return this.config.viewMode || 'main';
  }

  /**
  * Set the current view mode
  */
  setViewMode(mode: viewMode) {
    this.config.viewMode = mode;
    this.saveConfig();
    return this.config.viewMode;
  }

  /**
   * Get the entire LLM configuration
   */
  getLLMConfig() {
    return this.config.llm || {
      endpoint: 'https://api.deepseek.com',
      apiKey: '',
      model: 'deepseek-chat'
    };
  }

  /**
   * Update the LLM configuration
   */
  setLLMConfig(llmConfig: Partial<llmConfig>) {
    this.config.llm = {
      ...this.getLLMConfig(),
      ...llmConfig
    };
    this.saveConfig();
    return this.config.llm;
  }

  /**
   * Get the AGI configuration
   */
  getAgiConfig() {
    return this.config.agi;
  }

  /**
   * Set the AGI configuration
   */
  setAgiConfig(agiConfig: Partial<agiConfig>) {
    this.config.agi = {
      ...this.getAgiConfig(),
      ...agiConfig
    };
    this.saveConfig();
    return this.config.agi;
  }

  /**
   * Get the local inference configuration
   */
  getLocalInferenceConfig() {
    return this.config.local;
  }

  /**
   * Set the local inference configuration
   */
  setLocalInferenceConfig(localInferenceConfig: Partial<localInferenceConfig>) {
    this.config.local = {
      ...this.getLocalInferenceConfig(),
      ...localInferenceConfig
    };
    this.saveConfig();
    return this.config.local;
  }

  /**
   * Get the AGI sync state for all files
   */
  getAgiSyncState(): AgiSyncState {
    return this.config.agiSyncState || {};
  }

  /**
   * Check if a specific file is synced with AGI
   */
  isFileSynced(filename: string): boolean {
    return this.config.agiSyncState?.[filename] === true;
  }

  /**
   * Set the sync state for a specific file
   */
  setFileSyncState(filename: string, synced: boolean) {
    if (!this.config.agiSyncState) {
      this.config.agiSyncState = {};
    }
    this.config.agiSyncState[filename] = synced;
    this.saveConfig();
  }

  /**
   * Set the sync state for multiple files
   */
  setMultipleFileSyncStates(files: { [filename: string]: boolean }) {
    if (!this.config.agiSyncState) {
      this.config.agiSyncState = {};
    }
    Object.assign(this.config.agiSyncState, files);
    this.saveConfig();
  }

  /**
   * Remove a file from the sync state tracking
   */
  removeFileSyncState(filename: string) {
    if (this.config.agiSyncState && this.config.agiSyncState[filename] !== undefined) {
      delete this.config.agiSyncState[filename];
      this.saveConfig();
    }
  }

  /**
   * Get all unsynced files
   */
  getUnsyncedFiles(): string[] {
    const syncState = this.getAgiSyncState();
    return Object.keys(syncState).filter(filename => syncState[filename] === false);
  }

  /**
   * Get all synced files
   */
  getSyncedFiles(): string[] {
    const syncState = this.getAgiSyncState();
    return Object.keys(syncState).filter(filename => syncState[filename] === true);
  }

  /**
   * Clear all sync state (useful for resetting AGI sync)
   */
  clearAgiSyncState() {
    this.config.agiSyncState = {};
    this.saveConfig();
  }

  /**
   * Generate a new request ID for a file operation
   */
  startFileRequest(filename: string): string {
    const requestId = `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    if (!this.config.agiRequestState) {
      this.config.agiRequestState = {};
    }
    
    this.config.agiRequestState[filename] = {
      requestId,
      timestamp: Date.now()
    };
    
    // Don't save to disk for request tracking - keep it in memory only for performance
    return requestId;
  }

  /**
   * Check if a request is still the most recent for a file
   */
  isRequestCurrent(filename: string, requestId: string): boolean {
    const currentRequest = this.config.agiRequestState?.[filename];
    return currentRequest?.requestId === requestId;
  }

  /**
   * Clear request tracking for a file (when operation completes or fails)
   */
  clearFileRequest(filename: string) {
    if (this.config.agiRequestState) {
      delete this.config.agiRequestState[filename];
    }
  }

  /**
   * Get all active requests (for debugging)
   */
  getActiveRequests(): AgiRequestState {
    return this.config.agiRequestState || {};
  }

  /**
   * Clear all request tracking
   */
  clearAllRequests() {
    this.config.agiRequestState = {};
  }

/**
 * Initialize the config file if it doesn't exist or ensure it has the correct structure
 */
ensureConfigFile() {
  if (!this.configPath) {
    console.error('Cannot initialize config: Config path not available');
    return;
  }

  // Define default config structure
  const defaultConfig = {
    notesDirectory: '',
    viewMode: 'main' as viewMode,
    llm: {
      endpoint: 'https://api.deepseek.com',
      apiKey: '',
      model: 'deepseek-chat'
    },
    agi: {
      enableChunking: false,
      enableLiveMode: false, // Add this new property
      liveAgiSettings: {
        minGenerationInterval: 1 * 1000, // 1 second
        maxGenerationInterval: 30 * 60 * 1000, // 30 minutes
        stateTransitionInterval: 1 * 1000, // 1 second
        notesPerSynthesis: 3,
        thoughtHistoryLimit: 100
      }
    },
    local: {
      enabled: false,
      port: 11434,
      model: 'llama3.2'
    },
    agiSyncState: {},
    agiRequestState: {}
  };

  try {
    // Ensure directory exists
    const configDir = path.dirname(this.configPath);
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }

    let currentConfig = defaultConfig;

    // If file exists, read it and merge with default config
    if (fs.existsSync(this.configPath)) {
      try {
        const data = fs.readFileSync(this.configPath, 'utf8');
        const existingConfig = JSON.parse(data);

        // Merge with default config to ensure all required fields are present
        currentConfig = {
          notesDirectory: existingConfig.notesDirectory,
          viewMode: existingConfig.viewMode || defaultConfig.viewMode,
          llm: { ...defaultConfig.llm, ...existingConfig.llm },
          agi: { 
            ...defaultConfig.agi, 
            ...existingConfig.agi,
            liveAgiSettings: {
              ...defaultConfig.agi.liveAgiSettings,
              ...(existingConfig.agi?.liveAgiSettings || {})
            }
          },
          local: { ...defaultConfig.local, ...existingConfig.local },
          agiSyncState: existingConfig.agiSyncState || {},
          agiRequestState: existingConfig.agiRequestState || {}
        };

        console.log('Updated existing config structure');
      } catch (parseError) {
        console.error('Error parsing existing config, using default:', parseError);
      }
    } else {
      console.log(`Created default config file at ${this.configPath}`);
    }

    // Write the config back to file
    fs.writeFileSync(this.configPath, JSON.stringify(currentConfig, null, 2));

    // Update in-memory config
    this.config = currentConfig;
  } catch (error) {
    console.error('Error creating or updating config file:', error);
  }
}
  /**
   * Reload configuration from disk
   */
  reloadConfig() {
    this.config = this.loadConfig();
    return this.config;
  }
}