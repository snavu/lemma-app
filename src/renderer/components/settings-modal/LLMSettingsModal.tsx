import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import './llm-settings-modal.css';
import { useAgi } from '../../hooks/useAgi';
import { useSgLang } from '../../hooks/useSgLang';

interface LLMSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const LLMSettingsModal: React.FC<LLMSettingsModalProps> = ({ isOpen, onClose }) => {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [experimentalAgi, setExperimentalAgi] = useState(false);
  const [localInference, setLocalInference] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  console.log("localInference", localInference);
  const { syncAgi } = useAgi();

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
      const agiConfig = await window.electron.config.getAgiConfig();
      const localInferenceConfig = await window.electron.config.getLocalInferenceConfig();
      setEndpoint(llmConfig.endpoint);
      setApiKey(llmConfig.apiKey);
      setModel(llmConfig.model);
      setExperimentalAgi(agiConfig.enabled || false);
      setLocalInference(localInferenceConfig.enabled || false);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    }
  };

  // Handle toggling local inference
  const handleSgLangToggle = async (enabled: boolean) => {
    setLocalInference(enabled);
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setIsSaving(true);

      const llmResult = await window.electron.config.setLLMConfig({
        endpoint,
        apiKey,
        model,
      });

      const agiResult = await window.electron.config.setAgiConfig(experimentalAgi);

      const localInferenceResult = await window.electron.config.setLocalInferenceConfig(localInference)

      if (llmResult && agiResult && localInferenceResult) {
        toast.success('Settings saved successfully!');

        if (experimentalAgi) {
          await syncAgi();
        }

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
      console.error('Error saving settings:', error);
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
            {/* API Settings Section */}
            <div className="settings-section">
              <h3 className="section-title">API Configuration</h3>

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

            <div className="section-divider"></div>

            {/* SGLang Section */}
            <div className="settings-section">
              <div className="section-header">
                <h3 className="section-title">Local Inference Server</h3>
              </div>

              <div className="form-group toggle-group">
                <div className="toggle-header">
                  <label htmlFor="localInference">Enable local inference</label>
                  <label className="toggle-switch">
                    <input
                      id="localInference"
                      type="checkbox"
                      checked={localInference}
                      onChange={(e) => handleSgLangToggle(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <p className="help-text">Enable local SGLang inference server with OpenAI-compatible API</p>
              </div>

            </div>

            <div className="section-divider"></div>

            {/* Experimental Features Section */}
            <div className="settings-section">
              <h3 className="section-title">Experimental Features</h3>

              <div className="form-group toggle-group">
                <div className="toggle-header">
                  <label htmlFor="experimentalAgi">Enable Experimental AGI</label>
                  <label className="toggle-switch">
                    <input
                      id="experimentalAgi"
                      type="checkbox"
                      checked={experimentalAgi}
                      onChange={(e) => setExperimentalAgi(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <p className="help-text">Enable experimental AGI features (may be unstable)</p>
              </div>
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