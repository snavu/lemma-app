export interface llmConfig {
    endpoint: string;
    apiKey: string;
    model: string;
  }
  
  export interface agiConfig {
    enableChunking: boolean;
    enableLiveMode: boolean;  
  }
  
  export interface localInferenceConfig {
    enabled: boolean;
    port: number;
    model: string;
  }
  