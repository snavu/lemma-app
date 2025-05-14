import React, { useEffect, useState } from 'react';
import './llm-settings-modal.css';

interface LLMSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LLMSettingsModal: React.FC<LLMSettingsModalProps> = ({ isOpen, onClose }) => {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [orgId, setOrgId] = useState('');
  const [status, setStatus] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Common models for different providers
  const modelOptions = {
    'OpenAI': ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    'DeepSeek': ['deepseek-chat', 'deepseek-coder'],
    'Anthropic': ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    'Custom': ['custom']
  };

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
      setStatus('Error loading settings');
    }
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setIsSaving(true);
      setStatus('Saving...');

      await window.electron.config.setLLMConfig({
        endpoint,
        apiKey,
        model,
      });

      setStatus('Settings saved successfully!');

      // Clear status after 3 seconds
      setTimeout(() => {
        setStatus('');
        setIsSaving(false);
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error saving LLM settings:', error);
      setStatus('Error saving settings');
      setIsSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="llm-settings-modal" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h2>AI Model Settings</h2>
          <button className="close-button" onClick={onClose}>×</button>
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

          <div className="form-group">
            <label htmlFor="orgId">Organization ID (optional)</label>
            <input
              id="orgId"
              type="text"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              placeholder="Optional organization ID"
            />
            <p className="help-text">Only required for some providers</p>
          </div>
        </div>

        <div className="modal-footer">
          {status && <p className="status-message">{status}</p>}
          <div className="modal-buttons">
            <button
              className="cancel-button"
              onClick={onClose}
              disabled={isSaving}
            >
              Cancel
            </button>
            <button
              className="save-button"
              onClick={saveSettings}
              disabled={isSaving}
            >
              {isSaving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LLMSettingsModal;