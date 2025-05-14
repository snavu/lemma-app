import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import './llm-settings-modal.css';

interface LLMSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

interface LLMConfig {
  endpoint: string;
  apiKey: string;
  model: string;
}

const LLMSettingsModal: React.FC<LLMSettingsModalProps> = ({ isOpen, onClose }) => {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  // Common models for different providers
  const modelOptions = {
    'OpenAI': ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    'DeepSeek': ['deepseek-chat', 'deepseek-coder'],
    'Anthropic': ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    'Custom': ['custom']
  };

  // Handle close with animation
  const handleClose = () => {
    setIsClosing(true);
    closeTimeoutRef.current = window.setTimeout(() => {
      setIsClosing(false);
      onClose();
    }, 200); // Match this to the CSS animation duration
  };

  // Cleanup timeout when component unmounts
  useEffect(() => {
    return () => {
      if (closeTimeoutRef.current) {
        clearTimeout(closeTimeoutRef.current);
      }
    };
  }, []);

  // Detect provider from endpoint
  const detectProvider = (endpoint: string) => {
    if (endpoint.includes('openai.com')) return 'OpenAI';
    if (endpoint.includes('deepseek.com')) return 'DeepSeek';
    if (endpoint.includes('anthropic.com')) return 'Anthropic';
    return 'Custom';
  };

  // Get available models based on detected provider
  const getModelOptions = () => {
    const provider = detectProvider(endpoint);
    return modelOptions[provider] || modelOptions.Custom;
  };

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
    }
  }, [isOpen]);

  const loadSettings = async () => {
    try {
      const llmConfig = await window.electron.config.getLLMConfig();
      setEndpoint(llmConfig.endpoint);
      setApiKey(llmConfig.apiKey);
      setModel(llmConfig.model);
    } catch (error) {
      console.error('Error loading LLM settings:', error);
      toast.error('Failed to load settings');
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setIsSaving(true);

      const result = await window.electron.config.setLLMConfig({
        endpoint,
        apiKey,
        model,
      });
      
      if (result) {
        toast.success('Settings saved successfully!');
        
        // Close modal after slight delay
        setTimeout(() => {
          setIsSaving(false);
          handleClose();
        }, 500);
      } else {
        toast.error('Failed to save settings');
        setIsSaving(false);
      }
    } catch (error) {
      console.error('Error saving LLM settings:', error);
      toast.error(error instanceof Error ? error.message : 'Unknown error saving settings');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <>
      <div 
        className={`modal-overlay ${isClosing ? 'closing' : ''}`} 
        onClick={handleClose}
      >
        <div 
          className={`llm-settings-modal ${isClosing ? 'closing' : ''}`} 
          onClick={e => e.stopPropagation()}
        >
          <div className="modal-header">
            <h2>AI Model Settings</h2>
            <button className="close-button" onClick={handleClose}>×</button>
          </div>

          <div className="modal-body">
            <div className="form-group">
              <label htmlFor="endpoint">API Endpoint</label>
              <input
                id="endpoint"
                type="text"
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                placeholder="https://api.openai.com"
              />
              <p className="help-text">The base URL for the API service</p>
            </div>

            <div className="form-group">
              <label htmlFor="apiKey">API Key</label>
              <input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your API key"
              />
              <p className="help-text">Your API key for authentication</p>
            </div>

            <div className="form-group">
              <label htmlFor="model">Model</label>
              <select
                id="model"
                value={model}
                onChange={(e) => setModel(e.target.value)}
              >
                {getModelOptions().map((modelOption) => (
                  <option key={modelOption} value={modelOption}>
                    {modelOption}
                  </option>
                ))}
              </select>
              <p className="help-text">The AI model to use for inference</p>
            </div>
          </div>

          <div className="modal-footer">
            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={handleClose}
                disabled={isSaving}
              >
                Cancel
              </button>
              <button
                className={`save-button ${isSaving ? 'is-saving' : ''}`}
                onClick={saveSettings}
                disabled={isSaving}
              >
                {isSaving ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LLMSettingsModal;