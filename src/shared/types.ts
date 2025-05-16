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
    port: number;
    model: string;
  }
  