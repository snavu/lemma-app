import React, { useEffect, useState, useRef } from 'react';
import { toast } from 'sonner';
import './llm-settings-modal.css';
import { useAgi } from '../../hooks/useAgi';
import { useSgLang } from '../../hooks/useSgLang';
import { Play, Pause, Brain, Clock, Eye, Zap, Activity } from 'lucide-react';

interface LLMSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

// Types for the AGI system
interface AgiStatus {
  isRunning: boolean;
  state: string;
  perceptionMode: string;
  thoughtCount: number;
  lastGenerationTime: Date;
}

interface AgiThought {
  timestamp: Date;
  state: string;
  perceptionMode: string;
  selectedNotes: string[];
  synthesisPrompt?: string;
  generatedContent?: string;
  reasoning?: string;
}

const LLMSettingsModal: React.FC<LLMSettingsModalProps> = ({ isOpen, onClose }) => {
  const [endpoint, setEndpoint] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [model, setModel] = useState('');
  const [chunkingEnabled, setChunkingEnabled] = useState(false);
  const [liveModeEnabled, setLiveModeEnabled] = useState(false);
  const [liveModeActuallyEnabled, setLiveModeActuallyEnabled] = useState(false); // Track saved state
  const [localEnabled, setLocalEnabled] = useState(false);
  const [localPort, setLocalPort] = useState(11434);
  const [localModel, setLocalModel] = useState('llama3.2');
  const [isSaving, setIsSaving] = useState(false);
  const [isClosing, setIsClosing] = useState(false);
  const closeTimeoutRef = useRef<number | null>(null);
  const { syncAgi } = useAgi();

  // Live AGI state
  const [agiStatus, setAgiStatus] = useState<AgiStatus | null>(null);
  const [thoughtHistory, setThoughtHistory] = useState<AgiThought[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [agiLoading, setAgiLoading] = useState(false);

  // Persistent tracking state
  const [persistentThoughtCount, setPersistentThoughtCount] = useState(0);
  const [persistentLastActivity, setPersistentLastActivity] = useState<Date | null>(null);

  // Common models for different providers
  const modelOptions = {
    'OpenAI': ['gpt-3.5-turbo', 'gpt-4', 'gpt-4-turbo', 'custom'],
    'DeepSeek': ['deepseek-chat', 'deepseek-coder', 'custom'],
    'Anthropic': ['claude-3-opus-20240229', 'claude-3-sonnet-20240229', 'claude-3-haiku-20240307', 'custom'],
    'Custom': ['custom']
  };

  const [customModel, setCustomModel] = useState('');

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

  useEffect(() => {
    if (detectProvider(endpoint) === 'Custom') {
      setModel('custom');
    } else {
      setModel(getModelOptions()[0]);
    }
  }, [endpoint]);

  // Load settings when modal opens
  useEffect(() => {
    if (isOpen) {
      loadSettings();
      loadAgiStatus();
    }
  }, [isOpen]);

  // Separate effect to load AGI status when live mode settings change
  useEffect(() => {
    if (isOpen) {
      loadAgiStatus();
    }
  }, [isOpen, chunkingEnabled, liveModeEnabled]);

  // Listen for AGI status updates
  useEffect(() => {
    if (!isOpen) return;

    const cleanup = window.electron.on.agiStatusChanged((status: AgiStatus) => {
      setAgiStatus(status);
    });

    return cleanup;
  }, [isOpen]);

  // Handle AGI status updates and maintain persistence
  useEffect(() => {
    if (!agiStatus) return;

    // Update persistent thought count - only increase, never decrease unless explicitly reset
    if (agiStatus.thoughtCount > persistentThoughtCount) {
      setPersistentThoughtCount(agiStatus.thoughtCount);
    }

    // Update persistent last activity - only update if we have a valid new timestamp
    if (agiStatus.lastGenerationTime && 
        new Date(agiStatus.lastGenerationTime).getTime() > 0) {
      const newTimestamp = new Date(agiStatus.lastGenerationTime);
      
      // Only update if this is a newer timestamp
      if (!persistentLastActivity || newTimestamp > persistentLastActivity) {
        setPersistentLastActivity(newTimestamp);
      }
    }
  }, [agiStatus, persistentThoughtCount, persistentLastActivity]);

  // Reset persistent data when AGI is stopped/started
  useEffect(() => {
    if (!agiStatus?.isRunning) {
      // When AGI stops, reset the persistent counters
      setPersistentThoughtCount(0);
      setPersistentLastActivity(null);
    }
  }, [agiStatus?.isRunning]);

  const loadSettings = async () => {
    try {
      const llmConfig = await window.electron.config.getLLMConfig();
      const agiConfig = await window.electron.config.getAgiConfig();
      const localInferenceConfig = await window.electron.config.getLocalInferenceConfig();

      setEndpoint(llmConfig.endpoint);
      setApiKey(llmConfig.apiKey);
      setModel(llmConfig.model);
      setChunkingEnabled(agiConfig.enableChunking);
      setLiveModeEnabled(agiConfig.enableLiveMode);
      setLiveModeActuallyEnabled(agiConfig.enableLiveMode); // Track saved state
      setLocalEnabled(localInferenceConfig.enabled);
      setLocalPort(localInferenceConfig.port);

      //Handle cloud model: could be a predefined or custom model
      const savedCloudModel = llmConfig.model;
      if (getModelOptions().includes(savedCloudModel)) {
        setModel(savedCloudModel);
        setCustomModel('');
      } else {
        setModel('custom');
        setCustomModel(savedCloudModel);
      }

      // Handle local model: could be a predefined or custom model
      const savedLocalModel = localInferenceConfig.model;
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

  const loadAgiStatus = async () => {
    try {
      const status = await window.electron.agi.getLiveAgiStatus();
      setAgiStatus(status);
    } catch (error) {
      console.error('Error loading AGI status:', error);
    }
  };

  // Handle toggling local inference
  const handleLocalToggle = async (enabled: boolean) => {
    setLocalEnabled(enabled);
  };

  // Live AGI control functions
  const toggleAgi = async () => {
    if (!agiStatus) return;
    
    setAgiLoading(true);
    try {
      let newStatus: AgiStatus;
      if (agiStatus.isRunning) {
        newStatus = await window.electron.agi.stopLiveAgi();
        // Reset persistent data when stopping
        setPersistentThoughtCount(0);
        setPersistentLastActivity(null);
      } else {
        newStatus = await window.electron.agi.startLiveAgi();
        // Reset persistent data when starting fresh
        setPersistentThoughtCount(0);
        setPersistentLastActivity(null);
      }
      setAgiStatus(newStatus);
    } catch (error) {
      console.error('Error toggling AGI:', error);
      toast.error('Failed to toggle Live AGI');
    } finally {
      setAgiLoading(false);
    }
  };

  const loadThoughtHistory = async () => {
    try {
      const history = await window.electron.agi.getAgiThoughtHistory();
      setThoughtHistory(history);
      setShowHistory(true);
    } catch (error) {
      console.error('Error loading thought history:', error);
      toast.error('Failed to load thought history');
    }
  };

  // AGI helper functions
  const getStateIcon = (state: string) => {
    switch (state) {
      case 'idle': return <Clock />;
      case 'exploring': return <Eye />;
      case 'contemplating': return <Brain />;
      case 'synthesizing': return <Zap />;
      case 'generating': return <Activity />;
      case 'cooldown': return <Pause />;
      default: return <Brain />;
    }
  };

  const getStateColor = (state: string) => {
    switch (state) {
      case 'idle': return '#6b7280';
      case 'exploring': return '#3b82f6';
      case 'contemplating': return '#8b5cf6';
      case 'synthesizing': return '#f59e0b';
      case 'generating': return '#10b981';
      case 'cooldown': return '#f97316';
      default: return '#6b7280';
    }
  };

  const getStateDescription = (state: string) => {
    switch (state) {
      case 'idle': return 'Waiting for the next cycle';
      case 'exploring': return 'Scanning available notes';
      case 'contemplating': return 'Analyzing gathered information';
      case 'synthesizing': return 'Combining insights';
      case 'generating': return 'Creating new content';
      case 'cooldown': return 'Processing complete, resting';
      default: return 'Monitoring system state';
    }
  };

  const formatPerceptionMode = (mode: string) => {
    return mode.split('_').map(word => 
      word.charAt(0).toUpperCase() + word.slice(1)
    ).join(' ');
  };

  const formatTimestamp = (timestamp: Date) => {
    return new Date(timestamp).toLocaleString();
  };

  // Save settings
  const saveSettings = async () => {
    try {
      setIsSaving(true);

      const llmResult = await window.electron.config.setLLMConfig({
        endpoint,
        apiKey,
        model: model === 'custom' ? customModel : model,
      });

      const agiResult = await window.electron.config.setAgiConfig({
        enableChunking: chunkingEnabled,
        enableLiveMode: chunkingEnabled ? liveModeEnabled : false
      });

      setChunkingEnabled(agiResult.enableChunking);
      
      // If live mode is being disabled, stop the AGI immediately
      if (liveModeActuallyEnabled && !agiResult.enableLiveMode) {
        console.log('Live Mode disabled - stopping AGI');
        try {
          await window.electron.agi.stopLiveAgi();
          await loadAgiStatus(); // Refresh status to show stopped state
          toast.success('Live AGI stopped successfully');
        } catch (error) {
          console.error('Error stopping AGI:', error);
          toast.error('AGI stopped but there was an error during shutdown');
        }
      }

      // If chunking is being disabled (which also disables live mode), stop AGI
      if (liveModeActuallyEnabled && !agiResult.enableChunking) {
        console.log('Chunking disabled - stopping AGI');
        try {
          await window.electron.agi.stopLiveAgi();
          await loadAgiStatus(); // Refresh status to show stopped state
          toast.success('Live AGI stopped (chunking disabled)');
        } catch (error) {
          console.error('Error stopping AGI when chunking disabled:', error);
          toast.error('AGI stopped but there was an error during shutdown');
        }
      }
      setLiveModeActuallyEnabled(agiResult.enableLiveMode); // Update saved state

      const localInferenceResult = await window.electron.config.setLocalInferenceConfig({
        enabled: localEnabled,
        port: localPort,
        model: localModel === 'custom' ? customLocalModel : localModel,
      });

      if (llmResult && agiResult && localInferenceResult) {
        toast.success('Settings saved successfully!');

        // Update the actually enabled state immediately after successful save
        setLiveModeActuallyEnabled(agiResult.enableLiveMode);

        // If live mode was just enabled, load AGI status immediately
        if (agiResult.enableLiveMode && !liveModeActuallyEnabled) {
          await loadAgiStatus();
        }

        // Close modal after slight delay only if live mode is not newly enabled
        if (!agiResult.enableLiveMode || liveModeActuallyEnabled) {
          setTimeout(async () => {
            setIsSaving(false);
            handleClose();

            if (chunkingEnabled) {
              await syncAgi();
            }
          }, 500);
        } else {
          // Live mode was just enabled - keep modal open and show controls
          setIsSaving(false);
          if (chunkingEnabled) {
            await syncAgi();
          }
        }
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
          style={{ width: liveModeActuallyEnabled && chunkingEnabled ? '700px' : '500px' }}
        >
          <div className="modal-header">
            <h2>AI Model Settings</h2>
            <button className="close-button" onClick={handleClose}>×</button>
          </div>

          <div className="modal-body">
            {/* API Settings Section */}
            {!localEnabled && (<div className="settings-section">
              <h3 className="section-title">API Configuration</h3>

              <div className="form-group">
                <label htmlFor="endpoint">API Endpoint</label>
                <input
                  id="endpoint"
                  type="text"
                  value={endpoint}
                  onChange={(e) => setEndpoint(e.target.value)}
                  placeholder="https://api.deepseek.com"
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

              {model === 'custom' && (
                <div className="form-group">
                  <label htmlFor="customModel">Custom Model Name</label>
                  <input
                    id="customModel"
                    type="text"
                    value={customModel}
                    onChange={(e) => setCustomModel(e.target.value)}
                    placeholder="Enter custom model name"
                  />
                  <p className="help-text">Specify a custom model name</p>
                </div>
              )}
            </div>

            )}

            {!localEnabled && (<div className="section-divider"></div>)}


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
                  <label htmlFor="chunkingEnabled">Enable Experimental AGI</label>
                  <label className="toggle-switch">
                    <input
                      id="chunkingEnabled"
                      type="checkbox"
                      checked={chunkingEnabled}
                      onChange={(e) => setChunkingEnabled(e.target.checked)}
                    />
                    <span className="toggle-slider"></span>
                  </label>
                </div>
                <p className="help-text">Enable experimental AGI features (may be unstable)</p>
              </div>

              {chunkingEnabled && (
                <div className="form-group toggle-group">
                  <div className="toggle-header">
                    <label htmlFor="liveModeEnabled" style={{ fontWeight: "bold" }}>Enable Live Mode</label>
                    <label className="toggle-switch">
                      <input
                        id="liveModeEnabled"
                        type="checkbox"
                        checked={liveModeEnabled}
                        onChange={(e) => setLiveModeEnabled(e.target.checked)}
                      />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                  <p className="help-text">Enables the AI to generate notes in realtime without prompting</p>
                </div>
              )}

              {/* Live AGI Control Panel - Show only when live mode is actually saved/enabled */}
              {chunkingEnabled && liveModeActuallyEnabled && (
                <>
                  <div className="section-divider"></div>
                  <div className="settings-section">
                    <h3 className="section-title">Live AGI Consciousness</h3>
                    
                    {agiStatus ? (
                      <div className="agi-control-panel">
                        {/* Main Status Display */}
                        <div className="agi-main-status">
                          <div className="agi-status-indicator">
                            <div className={`agi-pulse ${agiStatus.isRunning ? 'active' : 'inactive'}`}>
                              <div className="agi-pulse-ring"></div>
                              <div className="agi-pulse-core" style={{ backgroundColor: getStateColor(agiStatus.state) }}>
                                {getStateIcon(agiStatus.state)}
                              </div>
                            </div>
                            <div className="agi-status-text">
                              <h4 className="agi-current-state" style={{ color: getStateColor(agiStatus.state) }}>
                                {agiStatus.state.charAt(0).toUpperCase() + agiStatus.state.slice(1)}
                              </h4>
                              <p className="agi-status-description">
                                {agiStatus.isRunning ? getStateDescription(agiStatus.state) : 'AGI is offline'}
                              </p>
                            </div>
                          </div>
                          
                          {/* Control Button */}
                          <button
                            onClick={toggleAgi}
                            disabled={agiLoading}
                            className={`agi-toggle-button ${agiStatus.isRunning ? 'stop' : 'start'} ${agiLoading ? 'loading' : ''}`}
                          >
                            {agiLoading ? (
                              <div className="button-spinner" />
                            ) : agiStatus.isRunning ? (
                              <Pause />
                            ) : (
                              <Play />
                            )}
                            <span>{agiStatus.isRunning ? 'Stop' : 'Start'}</span>
                          </button>
                        </div>

                        {/* Status Details Grid */}
                        <div className="agi-details-grid">
                          <div className="agi-detail-item">
                            <div className="agi-detail-icon">
                              <Eye />
                            </div>
                            <div className="agi-detail-content">
                              <span className="agi-detail-label">Perception Mode</span>
                              <span className="agi-detail-value">{formatPerceptionMode(agiStatus.perceptionMode)}</span>
                            </div>
                          </div>

                          <div className="agi-detail-item">
                            <div className="agi-detail-icon">
                              <Activity />
                            </div>
                            <div className="agi-detail-content">
                              <span className="agi-detail-label">Total Thoughts</span>
                              <span className="agi-detail-value">
                                {Math.max(persistentThoughtCount, agiStatus.thoughtCount || 0)}
                              </span>
                            </div>
                          </div>

                          <div className="agi-detail-item full-width">
                            <div className="agi-detail-icon">
                              <Clock />
                            </div>
                            <div className="agi-detail-content">
                              <span className="agi-detail-label">Last Activity</span>
                              <span className="agi-detail-value">
                                {persistentLastActivity 
                                  ? formatTimestamp(persistentLastActivity)
                                  : (agiStatus.lastGenerationTime && new Date(agiStatus.lastGenerationTime).getTime() > 0
                                      ? formatTimestamp(agiStatus.lastGenerationTime)
                                      : 'No activity yet'
                                    )
                                }
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* State Progress Bar */}
                        {agiStatus.isRunning && (
                          <div className="agi-progress-container">
                            <div className="agi-progress-bar">
                              <div 
                                className="agi-progress-fill" 
                                style={{ 
                                  backgroundColor: getStateColor(agiStatus.state),
                                  animation: `progressPulse 2s ease-in-out infinite`
                                }}
                              ></div>
                            </div>
                            <span className="agi-progress-text">
                              {getStateDescription(agiStatus.state)}
                            </span>
                          </div>
                        )}

                        {/* Actions */}
                        <div className="agi-actions">
                          <button
                            onClick={loadThoughtHistory}
                            className="agi-secondary-button"
                          >
                            <Brain />
                            <span>View Thought History</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="agi-loading-state">
                        <div className="agi-loading-spinner"></div>
                        <span>Connecting to AGI consciousness...</span>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <div className="modal-buttons">
              <button
                className="cancel-button"
                onClick={handleClose}
                disabled={isSaving}
              >
                {liveModeActuallyEnabled && chunkingEnabled ? 'Close' : 'Cancel'}
              </button>
              {(!liveModeActuallyEnabled || !chunkingEnabled || liveModeEnabled !== liveModeActuallyEnabled) && (
                <button
                  className={`save-button ${isSaving ? 'is-saving' : ''}`}
                  onClick={saveSettings}
                  disabled={isSaving}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Thought History Modal */}
      {showHistory && (
        <div className="thought-history-overlay" onClick={() => setShowHistory(false)}>
          <div className="thought-history-modal" onClick={e => e.stopPropagation()}>
            <div className="thought-history-header">
              <h3 className="thought-history-title">AGI Thought History</h3>
              <button
                onClick={() => setShowHistory(false)}
                className="thought-history-close"
              >
                ✕
              </button>
            </div>
            
            <div className="thought-history-content">
              {thoughtHistory.length === 0 ? (
                <p className="thought-history-empty">No thoughts recorded yet</p>
              ) : (
                thoughtHistory.slice().reverse().map((thought, index) => (
                  <div key={index} className="thought-card">
                    <div className="thought-card-header">
                      <div className="thought-card-info">
                        <div className="thought-state-icon" style={{ color: getStateColor(thought.state) }}>
                          {getStateIcon(thought.state)}
                        </div>
                        <span className="thought-state-text">{thought.state}</span>
                        <span className="thought-perception-badge">
                          {formatPerceptionMode(thought.perceptionMode)}
                        </span>
                      </div>
                      <span className="thought-timestamp">{formatTimestamp(thought.timestamp)}</span>
                    </div>
                    
                    {thought.selectedNotes.length > 0 && (
                      <div className="thought-section">
                        <p className="thought-section-label">Selected Notes:</p>
                        <p className="thought-section-content notes-content">
                          {thought.selectedNotes.map(note => note.split('/').pop()).join(', ')}
                        </p>
                      </div>
                    )}
                    
                    {thought.reasoning && (
                      <div className="thought-section">
                        <p className="thought-section-label">Reasoning:</p>
                        <p className="thought-section-content">{thought.reasoning}</p>
                      </div>
                    )}
                    
                    {thought.generatedContent && (
                      <div className="thought-section">
                        <p className="thought-section-label">Generated Content:</p>
                        <div className="thought-generated-content">
                          {thought.generatedContent.substring(0, 300)}
                          {thought.generatedContent.length > 300 && '...'}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default LLMSettingsModal;