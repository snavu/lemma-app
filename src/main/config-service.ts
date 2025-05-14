import * as path from 'path';
import * as fs from 'fs';
import * as fileService from './file-service';

export interface llmConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

/**
 * Configuration service for managing app settings
 */
export class ConfigService {
  private config: {
    notesDirectory?: string;
    llm: llmConfig;
  };

  constructor() {
    this.config = this.loadConfig();
  }

  /**
   * Get the path to the config file
   */
  private getConfigPath(): string | null {
    const notesDir = fileService.notesDirectory;
    if (!notesDir) {
      return null;
    }
    return path.join(notesDir, 'config.json');
  }

  /**
   * Load config from disk
   */
  private loadConfig() {
    try {
      const configPath = this.getConfigPath();
      if (configPath && fs.existsSync(configPath)) {
        const data = fs.readFileSync(configPath, 'utf8');
        return JSON.parse(data);
      }
    } catch (error) {
      console.error('Error loading config:', error);
    }
    return {};
  }

  /**
   * Save config to disk
   */
  private saveConfig() {
    try {
      const configPath = this.getConfigPath();
      if (configPath) {
        fs.writeFileSync(configPath, JSON.stringify(this.config, null, 2));
      } else {
        console.error('Cannot save config: Notes directory not set');
      }
    } catch (error) {
      console.error('Error saving config:', error);
    }
  }

  /**
   * Get the note path configuration
   */
  getNotesDirectory() {
    // Refresh config from disk
    this.config = this.loadConfig();

    return this.config.notesDirectory || null;
  }
  /**
   * Set the notes directory
   */
  setNotesDirectory(directory: string) {
    // Refresh config from disk
    this.config = this.loadConfig();

    this.config.notesDirectory = directory;
    this.saveConfig();
  }

  /**
   * Get the entire LLM configuration
   */
  getLLMConfig() {
    // Refresh config from disk
    this.config = this.loadConfig();

    return this.config.llm || {
      endpoint: 'https://api.deepseek.com',
      apiKey: '',
      model: 'deepseek-chat'
    };
  }

  /**
   * Update the LLM configuration
   */
  setLLMConfig(llmConfig: any) {
    // Refresh config from disk
    this.config = this.loadConfig();

    this.config.llm = {
      ...this.getLLMConfig(),
      ...llmConfig
    };
    this.saveConfig();
  }

  /**
   * Initialize the config file if it doesn't exist
   */
  ensureConfigFile() {
    const configPath = this.getConfigPath();
    if (!configPath) {
      console.error('Cannot initialize config: Notes directory not set');
      return;
    }

    if (!fs.existsSync(configPath)) {
      // Create default config
      const defaultConfig = {
        llm: {
          endpoint: 'https://api.deepseek.com',
          apiKey: '',
          model: 'deepseek-chat'
        }
      };

      try {
        fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
        console.log(`Created default config file at ${configPath}`);
      } catch (error) {
        console.error('Error creating config file:', error);
      }
    }
  }
}

// Create singleton instance
export const config = new ConfigService();

// Export default instance
export default config;