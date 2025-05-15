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
  const [sglangEnabled, setSgLangEnabled] = useState(true);
  const [sglangPort, setSgLangPort] = useState(8000);
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);

  const { syncAgi } = useAgi();
  const {
    stopSgLang,
    restartSgLang,
    isProcessing: isSgLangProcessing,
    isRunning: isSgLangRunning
  } = useSgLang();

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
      const sglangConfig = await window.electron.config.getSgLangConfig();

      setEndpoint(llmConfig.endpoint);
      setApiKey(llmConfig.apiKey);
      setModel(llmConfig.model);
      setExperimentalAgi(agiConfig.enabled || false);
      setSgLangEnabled(sglangConfig.enabled || true);
      setSgLangPort(sglangConfig.port || 8000);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    }
  };

  // Handle toggling SGLang server
  const handleSgLangToggle = async (enabled: boolean) => {
    setSgLangEnabled(enabled);

    if (enabled && !isSgLangRunning) {
      await restartSgLang(sglangPort);
    } else if (!enabled && isSgLangRunning) {
      await stopSgLang();
    }
  };

  // Handle port input change with validation
  const handlePortChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (!isNaN(value) && value > 0 && value < 65536) {
      setSgLangPort(value);
    }
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

      const sglangResult = await window.electron.config.setSgLangConfig({
        enabled: sglangEnabled,
        port: sglangPort
      });

      // Handle SGLang server status
      const sglangConfig = await window.electron.config.getSgLangConfig();
      if (sglangEnabled && isSgLangRunning && sglangPort !== sglangConfig.port) {
        // Restart if port changed
        await restartSgLang(sglangPort);
      } else if (!sglangEnabled && isSgLangRunning) {
        await stopSgLang();
      }

      if (llmResult && agiResult && sglangResult) {
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

  // Function to get status badge class and text
  const getStatusBadge = () => {
    if (isSgLangProcessing) {
      return { class: 'processing', text: 'Starting...' };
    } else if (isSgLangRunning) {
      return { class: 'running', text: 'Running' };
    } else {
      return { class: 'stopped', text: 'Stopped' };
    }
  };

  const statusBadge = getStatusBadge();

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
                <div className={`status-badge ${statusBadge.class}`}>
                  {statusBadge.text}
                </div>
              </div>

              <div className="form-group toggle-group">
                <div className="toggle-header">
                  <label htmlFor="sglangEnabled">Enable SGLang Server</label>
                  <label className="toggle-switch">
                    <input
                      id="sglangEnabled"
                      type="checkbox"
                      checked={sglangEnabled}
                      onChange={(e) => handleSgLangToggle(e.target.checked)}
                      disabled={isSgLangProcessing}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <p className="help-text">Enable local SGLang inference server with OpenAI-compatible API</p>
              </div>

              <div className="form-group" style={{ opacity: sglangEnabled ? 1 : 0.5 }}>
                <label htmlFor="sglangPort">Server Port</label>
                <div className={`number-input-wrapper ${(!sglangEnabled || isSgLangProcessing) ? 'disabled' : ''}`}>
                  <input
                    id="sglangPort"
                    type="number"
                    min="1024"
                    max="65535"
                    value={sglangPort}
                    onChange={handlePortChange}
                    disabled={!sglangEnabled || isSgLangProcessing}
                    className="port-input"
                  />
                  <div className="number-controls">
                    <button
                      type="button"
                      className="number-control-btn increment"
                      onClick={() => sglangEnabled && !isSgLangProcessing && setSgLangPort(prev => Math.min(prev + 1, 65535))}
                      disabled={!sglangEnabled || isSgLangProcessing}
                      aria-label="Increment port number"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="18 15 12 9 6 15"></polyline>
                      </svg>
                    </button>
                    <button
                      type="button"
                      className="number-control-btn decrement"
                      onClick={() => sglangEnabled && !isSgLangProcessing && setSgLangPort(prev => Math.max(prev - 1, 1024))}
                      disabled={!sglangEnabled || isSgLangProcessing}
                      aria-label="Decrement port number"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="6 9 12 15 18 9"></polyline>
                      </svg>
                    </button>
                  </div>
                </div>
                <p className="help-text">Port for the local SGLang inference server (default: 8001)</p>
              </div>

              {sglangEnabled && (
                <div className="server-info">
                  <p>Server URL: <code>http://localhost:{sglangPort}</code></p>
                  <p>OpenAI-compatible API for local inference</p>
                </div>
              )}
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
                disabled={isSaving || isSgLangProcessing}
              >
                Cancel
              </button>
              <button
                className={`save-button ${isSaving || isSgLangProcessing ? 'is-saving' : ''}`}
                onClick={saveSettings}
                disabled={isSaving || isSgLangProcessing}
              >
                {isSaving ? 'Saving...' : isSgLangProcessing ? 'Processing...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LLMSettingsModal;