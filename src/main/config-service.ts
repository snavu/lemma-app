import * as path from 'path';
import * as fs from 'fs';
import { app } from 'electron';
import { agiConfig, llmConfig, localInferenceConfig } from 'src/shared/types';


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
    llm: {
      endpoint: 'https://api.deepseek.com',
      apiKey: '',
      model: 'deepseek-chat'
    },
    agi: {
      enableChunking: false,
      enableLiveMode: false
    },
    local: {
      enabled: false,
      port: 11434,
      model: 'llama3.2'
    }
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
          llm: { ...defaultConfig.llm, ...existingConfig.llm },
          agi: { ...defaultConfig.agi, ...existingConfig.agi },
          local: { ...defaultConfig.local, ...existingConfig.local }
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