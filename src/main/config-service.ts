import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { notesDirectory } from './file-service';

export interface llmConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

export interface agiConfig {
  enabled: boolean;
}

export interface localInferenceConfig {
  enabled: boolean;
}

/**
 * Configuration service for managing app settings
 */
export class Config {
  private config: {
    notesDirectory?: string;
    llm: llmConfig;
    agi: agiConfig;
    local: localInferenceConfig;
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
    return path.join(app.getPath('documents'), 'LEMMA Notes', 'config.json');
  }

  /**
   * Load config from disk
   */
  private loadConfig() {
    try {
      if (this.configPath && fs.existsSync(this.configPath)) {
        const data = fs.readFileSync(this.configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    return {
      llm: {
        endpoint: 'https://api.deepseek.com',
        apiKey: '',
        model: 'deepseek-chat'
      },
      local: {
        enabled: true
      }
    };
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
  getNotesDirectory() {
    return this.config.notesDirectory || null;
  }

  /**
   * Set the notes directory
   */
  setNotesDirectory(directory: string) {
    this.config.notesDirectory = directory;
    this.saveConfig();
    return this.config.notesDirectory;
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
    return this.config.agi || { enabled: false };
  }

  /**
   * Set the AGI configuration
   */
  setAgiConfig(enabled: boolean) {
    this.config.agi = { enabled: enabled };
    this.saveConfig();
    return this.config.agi;
  }

  /**
   * Get the local inference configuration
   */
  getLocalInferenceConfig() {
    return this.config.local || { enabled: false };
  }

  /**
   * Set the local inference configuration
   */
  setLocalInferenceConfig(enabled: boolean) {
    this.config.local = { enabled: enabled};
    this.saveConfig();
    return this.config.local;
  }

  /**
   * Initialize the config file if it doesn't exist
   */
  ensureConfigFile() {
    if (!this.configPath) {
      console.error('Cannot initialize config: Config path not available');
      return;
    }

    if (!fs.existsSync(this.configPath)) {
      // Create default config
      const defaultConfig = {
        llm: {
          endpoint: 'https://api.deepseek.com',
          apiKey: '',
          model: 'deepseek-chat'
        },
        agi: {
          enabled: false
        },
        local: {
          port: 8001,
          enabled: true
        }
      };

      try {
        // Ensure directory exists
        const configDir = path.dirname(this.configPath);
        if (!fs.existsSync(configDir)) {
          fs.mkdirSync(configDir, { recursive: true });
        }

        fs.writeFileSync(this.configPath, JSON.stringify(defaultConfig, null, 2));
        console.log(`Created default config file at ${this.configPath}`);

        // Update in-memory config
        this.config = defaultConfig;
      } catch (error) {
        console.error('Error creating config file:', error);
      }
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