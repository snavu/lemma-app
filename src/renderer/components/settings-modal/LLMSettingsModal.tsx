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
  const [agiEnabled, setAgiEnabled] = useState(false);
  const [localEnabled, setLocalEnabled] = useState(false);
  const [localPort, setLocalPort] = useState(11434);
  const [localModel, setLocalModel] = useState('llama3.2');
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const { syncAgi } = useAgi();

  // Common models for different providers
  const modelOptions = {
    'OpenAI': ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo'],
    'DeepSeek': ['deepseek-chat', 'deepseek-coder'],
    'Anthropic': ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307'],
    'Custom': ['custom']
  };

  // Local model options
  const localModelOptions = [
    // Llama family
    'llama4:scout',
    'llama4:maverick',
    'llama3.3',
    'llama3.2',
    'llama3.2:1b',
    'llama3.2-vision',
    'llama3.2-vision:90b',
    'llama3.1',
    'llama3.1:405b',
    'llama2-uncensored',
    // Gemma family
    'gemma3',
    'gemma3:1b',
    'gemma3:12b',
    'gemma3:27b',
    // Phi family
    'phi4',
    'phi4-mini',
    // Mistral family
    'mistral',
    // Other popular models
    'qwq',
    'deepseek-r1',
    'deepseek-r1:671b',
    'moondream',
    'neural-chat',
    'starling-lm',
    'codellama',
    'llava',
    'granite3.3',
    'custom'
  ];

  // State for custom model input
  const [customLocalModel, setCustomLocalModel] = useState('');

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
      setAgiEnabled(agiConfig.enabled || false);
      setLocalEnabled(localInferenceConfig.enabled || false);
      setLocalPort(localInferenceConfig.port || 11434);

      console.log(localInferenceConfig.enabled);
      // Handle local model: could be a predefined or custom model
      const savedLocalModel = localInferenceConfig.model || 'llama3.2';
      if (localModelOptions.includes(savedLocalModel)) {
        setLocalModel(savedLocalModel);
        setCustomLocalModel('');
      } else {
        setLocalModel('custom');
        setCustomLocalModel(savedLocalModel);
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('Failed to load settings');
    }
  };

  // Handle toggling local inference
  const handleLocalToggle = async (enabled: boolean) => {
    setLocalEnabled(enabled);
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

      const agiResult = await window.electron.config.setAgiConfig({ enabled: agiEnabled });


      const localInferenceConfig = {
        enabled: localEnabled,
        port: localPort,
        model: localModel === 'custom' ? customLocalModel : localModel,
      }
      
      const localInferenceResult = await window.electron.config.setLocalInferenceConfig(localInferenceConfig);

      if (llmResult && agiResult && localInferenceResult) {
        toast.success('Settings saved successfully!');

        if (agiEnabled) {
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

            {/* Local Inference Section */}
            <div className="settings-section">
              <div className="section-header">
                <h3 className="section-title">Local Inference Server</h3>
              </div>

              <div className="form-group toggle-group">
                <div className="toggle-header">
                  <label htmlFor="localEnabled">Enable local inference</label>
                  <label className="toggle-switch">
                    <input
                      id="localEnabled"
                      type="checkbox"
                      checked={localEnabled}
                      onChange={(e) => handleLocalToggle(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <p className="help-text">Enable local inference</p>
              </div>

              {localEnabled && (
                <>
                  <div className="form-group">
                    <label htmlFor="localPort">Local Server Port</label>
                    <div className="number-input-container">
                      <input
                        id="localPort"
                        type="number"
                        value={localPort}
                        onChange={(e) => setLocalPort(parseInt(e.target.value) || 11434)}
                        placeholder="11434"
                        min="1024"
                        max="65535"
                      />
                      <div className="number-controls">
                        <button
                          type="button"
                          className="number-control-btn"
                          onClick={() => setLocalPort(prev => Math.min((prev || 0) + 1, 65535))}
                          aria-label="Increase port number"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="18 15 12 9 6 15"></polyline>
                          </svg>
                        </button>
                        <button
                          type="button"
                          className="number-control-btn"
                          onClick={() => setLocalPort(prev => Math.max((prev || 0) - 1, 1024))}
                          aria-label="Decrease port number"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="6 9 12 15 18 9"></polyline>
                          </svg>
                        </button>
                      </div>
                    </div>
                    <p className="help-text">The port your local inference server is running on (default: 11434)</p>
                  </div>

                  <div className="form-group">
                    <label htmlFor="localModel">Local Model</label>
                    <select
                      id="localModel"
                      value={localModel}
                      onChange={(e) => setLocalModel(e.target.value)}
                      className="model-select"
                    >
                      <optgroup label="Llama Models">
                        <option value="llama4:scout">Llama 4 (109B)</option>
                        <option value="llama4:maverick">Llama 4 (400B)</option>
                        <option value="llama3.3">Llama 3.3 (70B)</option>
                        <option value="llama3.2">Llama 3.2 (3B)</option>
                        <option value="llama3.2:1b">Llama 3.2 (1B)</option>
                        <option value="llama3.2-vision">Llama 3.2 Vision (11B)</option>
                        <option value="llama3.2-vision:90b">Llama 3.2 Vision (90B)</option>
                        <option value="llama3.1">Llama 3.1 (8B)</option>
                        <option value="llama3.1:405b">Llama 3.1 (405B)</option>
                        <option value="llama2-uncensored">Llama 2 Uncensored (7B)</option>
                      </optgroup>
                      <optgroup label="Gemma Models">
                        <option value="gemma3">Gemma 3 (4B)</option>
                        <option value="gemma3:1b">Gemma 3 (1B)</option>
                        <option value="gemma3:12b">Gemma 3 (12B)</option>
                        <option value="gemma3:27b">Gemma 3 (27B)</option>
                      </optgroup>
                      <optgroup label="Phi Models">
                        <option value="phi4">Phi 4 (14B)</option>
                        <option value="phi4-mini">Phi 4 Mini (3.8B)</option>
                      </optgroup>
                      <optgroup label="Other Models">
                        <option value="mistral">Mistral (7B)</option>
                        <option value="qwq">QwQ (32B)</option>
                        <option value="deepseek-r1">DeepSeek-R1 (7B)</option>
                        <option value="deepseek-r1:671b">DeepSeek-R1 (671B)</option>
                        <option value="moondream">Moondream 2 (1.4B)</option>
                        <option value="neural-chat">Neural Chat (7B)</option>
                        <option value="starling-lm">Starling (7B)</option>
                        <option value="codellama">Code Llama (7B)</option>
                        <option value="llava">LLaVA (7B)</option>
                        <option value="granite3.3">Granite-3.3 (8B)</option>
                        <option value="custom">Custom Model</option>
                      </optgroup>
                    </select>
                    <p className="help-text">Select the model to use for local inference</p>
                  </div>

                  {localModel === 'custom' && (
                    <div className="form-group">
                      <label htmlFor="customLocalModel">Custom Model Name</label>
                      <input
                        id="customLocalModel"
                        type="text"
                        value={customLocalModel}
                        onChange={(e) => setCustomLocalModel(e.target.value)}
                        placeholder="Enter custom model name"
                      />
                      <p className="help-text">Specify a custom local model name</p>
                    </div>
                  )}
                </>
              )}
            </div>

            <div className="section-divider"></div>

            {/* Experimental Features Section */}
            <div className="settings-section">
              <h3 className="section-title">Experimental Features</h3>

              <div className="form-group toggle-group">
                <div className="toggle-header">
                  <label htmlFor="agiEnabled">Enable Experimental AGI</label>
                  <label className="toggle-switch">
                    <input
                      id="agiEnabled"
                      type="checkbox"
                      checked={agiEnabled}
                      onChange={(e) => setAgiEnabled(e.target.checked)}
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