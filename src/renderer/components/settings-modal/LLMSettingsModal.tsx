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

  // Listen for AGI status updates
  useEffect(() => {
    if (!isOpen) return;

    const cleanup = window.electron.on.agiStatusChanged((status: AgiStatus) => {
      setAgiStatus(status);
    });

    return cleanup;
  }, [isOpen]);

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
      } else {
        newStatus = await window.electron.agi.startLiveAgi();
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
      case 'idle': return <Clock className="w-4 h-4" />;
      case 'exploring': return <Eye className="w-4 h-4" />;
      case 'contemplating': return <Brain className="w-4 h-4" />;
      case 'synthesizing': return <Zap className="w-4 h-4" />;
      case 'generating': return <Activity className="w-4 h-4" />;
      case 'cooldown': return <Pause className="w-4 h-4" />;
      default: return <Brain className="w-4 h-4" />;
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

      const localInferenceResult = await window.electron.config.setLocalInferenceConfig({
        enabled: localEnabled,
        port: localPort,
        model: localModel === 'custom' ? customLocalModel : localModel,
      });

      if (llmResult && agiResult && localInferenceResult) {
        toast.success('Settings saved successfully!');

        // Close modal after slight delay
        setTimeout(async () => {
          setIsSaving(false);
          handleClose();

          if (chunkingEnabled) {
            await syncAgi();
          }
          else {
            setLiveModeEnabled(false);
          }

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
          style={{ width: liveModeEnabled && chunkingEnabled ? '700px' : '500px' }}
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

              {/* Live AGI Control Panel - Show when live mode is enabled */}
              {chunkingEnabled && liveModeEnabled && (
                <>
                  <div className="section-divider"></div>
                  <div className="settings-section">
                    <h3 className="section-title">  Live AGI Consciousness</h3>
                    
                    {agiStatus ? (
                      <div style={{ marginTop: '16px' }}>
                        {/* Control Button */}
                        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center' }}>
                          <button
                            onClick={toggleAgi}
                            disabled={agiLoading}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '10px 16px',
                              borderRadius: '8px',
                              border: 'none',
                              fontWeight: '500',
                              cursor: agiLoading ? 'not-allowed' : 'pointer',
                              transition: 'all 0.2s ease',
                              backgroundColor: agiStatus.isRunning ? '#ef4444' : '#10b981',
                              color: 'white',
                              opacity: agiLoading ? 0.7 : 1
                            }}
                          >
                            {agiLoading ? (
                              <div style={{ 
                                width: '16px', 
                                height: '16px', 
                                border: '2px solid rgba(255, 255, 255, 0.3)', 
                                borderTop: '2px solid white', 
                                borderRadius: '50%', 
                                animation: 'spin 0.8s linear infinite' 
                              }} />
                            ) : agiStatus.isRunning ? (
                              <Pause size={16} />
                            ) : (
                              <Play size={16} />
                            )}
                            <span>{agiStatus.isRunning ? 'Stop' : 'Start'} AGI</span>
                          </button>
                        </div>

                        {/* Status Grid */}
                        <div style={{ 
                          display: 'grid', 
                          gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                          gap: '12px',
                          marginBottom: '16px'
                        }}>
                          <div style={{
                            backgroundColor: 'var(--background-secondary)',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <div style={{ color: getStateColor(agiStatus.state) }}>
                                {getStateIcon(agiStatus.state)}
                              </div>
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>State</span>
                            </div>
                            <p style={{ 
                              margin: 0, 
                              fontWeight: '600', 
                              textTransform: 'capitalize',
                              color: getStateColor(agiStatus.state),
                              fontSize: '14px'
                            }}>
                              {agiStatus.state}
                            </p>
                          </div>

                          <div style={{
                            backgroundColor: 'var(--background-secondary)',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <Eye size={14} style={{ color: '#3b82f6' }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Perception</span>
                            </div>
                            <p style={{ 
                              margin: 0, 
                              fontWeight: '600', 
                              color: '#3b82f6',
                              fontSize: '14px'
                            }}>
                              {formatPerceptionMode(agiStatus.perceptionMode)}
                            </p>
                          </div>

                          <div style={{
                            backgroundColor: 'var(--background-secondary)',
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid rgba(255, 255, 255, 0.1)'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                              <Activity size={14} style={{ color: '#10b981' }} />
                              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Thoughts</span>
                            </div>
                            <p style={{ 
                              margin: 0, 
                              fontWeight: '600', 
                              color: '#10b981',
                              fontSize: '14px'
                            }}>
                              {agiStatus.thoughtCount} total
                            </p>
                          </div>
                        </div>

                        {/* Running Status */}
                        {agiStatus.isRunning && (
                          <div style={{
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            borderRadius: '8px',
                            padding: '12px',
                            marginBottom: '16px'
                          }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{
                                width: '8px',
                                height: '8px',
                                backgroundColor: '#10b981',
                                borderRadius: '50%',
                                animation: 'pulse 2s infinite'
                              }} />
                              <div>
                                <p style={{ margin: 0, color: '#10b981', fontWeight: '500', fontSize: '14px' }}>
                                  AGI is actively thinking...
                                </p>
                                <p style={{ margin: '2px 0 0 0', color: '#059669', fontSize: '12px' }}>
                                  Exploring notes and generating insights
                                </p>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Last Generation Time */}
                        {agiStatus.lastGenerationTime && new Date(agiStatus.lastGenerationTime).getTime() > 0 && (
                          <div style={{
                            backgroundColor: 'rgba(59, 130, 246, 0.1)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px',
                            padding: '10px',
                            marginBottom: '16px'
                          }}>
                            <p style={{ margin: 0, color: '#3b82f6', fontSize: '12px' }}>
                              <strong>Last generation:</strong> {formatTimestamp(agiStatus.lastGenerationTime)}
                            </p>
                          </div>
                        )}

                        {/* Thought History Button */}
                        <div style={{ display: 'flex', justifyContent: 'center' }}>
                          <button
                            onClick={loadThoughtHistory}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '8px 12px',
                              backgroundColor: 'rgba(139, 92, 246, 0.1)',
                              border: '1px solid rgba(139, 92, 246, 0.3)',
                              borderRadius: '6px',
                              color: '#8b5cf6',
                              cursor: 'pointer',
                              fontSize: '12px',
                              fontWeight: '500',
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.2)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.backgroundColor = 'rgba(139, 92, 246, 0.1)';
                            }}
                          >
                            <Brain size={14} />
                            <span>View Thought History</span>
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div style={{ 
                        padding: '16px', 
                        backgroundColor: 'var(--background-secondary)', 
                        borderRadius: '8px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        textAlign: 'center'
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <Brain size={16} style={{ color: 'var(--text-muted)' }} />
                          <span style={{ color: 'var(--text-muted)', fontSize: '14px' }}>Loading AGI status...</span>
                        </div>
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

      {/* Thought History Modal */}
      {showHistory && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.75)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1001
          }}
          onClick={() => setShowHistory(false)}
        >
          <div 
            style={{
              backgroundColor: 'var(--background-primary)',
              borderRadius: '12px',
              padding: '24px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              boxShadow: '0 10px 25px rgba(0, 0, 0, 0.4)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: 'var(--text-normal)' }}>
                AGI Thought History
              </h3>
              <button
                onClick={() => setShowHistory(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '18px',
                  cursor: 'pointer',
                  color: 'var(--text-muted)',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = 'var(--interactive-hover)';
                  e.currentTarget.style.color = 'var(--text-normal)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = 'var(--text-muted)';
                }}
              >
                ✕
              </button>
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {thoughtHistory.length === 0 ? (
                <p style={{ 
                  color: 'var(--text-muted)', 
                  textAlign: 'center', 
                  padding: '32px 0', 
                  margin: 0,
                  fontSize: '14px'
                }}>
                  No thoughts recorded yet
                </p>
              ) : (
                thoughtHistory.slice().reverse().map((thought, index) => (
                  <div 
                    key={index} 
                    style={{
                      border: '1px solid rgba(255, 255, 255, 0.1)',
                      borderRadius: '8px',
                      padding: '16px',
                      backgroundColor: 'var(--background-secondary)'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      marginBottom: '12px' 
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ color: getStateColor(thought.state) }}>
                          {getStateIcon(thought.state)}
                        </div>
                        <span style={{ 
                          fontWeight: '500', 
                          textTransform: 'capitalize',
                          fontSize: '14px',
                          color: 'var(--text-normal)'
                        }}>
                          {thought.state}
                        </span>
                        <span style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-muted)',
                          backgroundColor: 'var(--background-tertiary)',
                          padding: '2px 6px',
                          borderRadius: '4px'
                        }}>
                          {formatPerceptionMode(thought.perceptionMode)}
                        </span>
                      </div>
                      <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                        {formatTimestamp(thought.timestamp)}
                      </span>
                    </div>
                    
                    {thought.selectedNotes.length > 0 && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ 
                          fontSize: '12px', 
                          fontWeight: '500', 
                          color: 'var(--text-muted)', 
                          margin: '0 0 4px 0' 
                        }}>
                          Selected Notes:
                        </p>
                        <p style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-normal)', 
                          margin: 0,
                          backgroundColor: 'var(--background-tertiary)',
                          padding: '6px 8px',
                          borderRadius: '4px'
                        }}>
                          {thought.selectedNotes.map(note => note.split('/').pop()).join(', ')}
                        </p>
                      </div>
                    )}
                    
                    {thought.reasoning && (
                      <div style={{ marginBottom: '12px' }}>
                        <p style={{ 
                          fontSize: '12px', 
                          fontWeight: '500', 
                          color: 'var(--text-muted)', 
                          margin: '0 0 4px 0' 
                        }}>
                          Reasoning:
                        </p>
                        <p style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-normal)', 
                          margin: 0,
                          lineHeight: '1.4'
                        }}>
                          {thought.reasoning}
                        </p>
                      </div>
                    )}
                    
                    {thought.generatedContent && (
                      <div>
                        <p style={{ 
                          fontSize: '12px', 
                          fontWeight: '500', 
                          color: 'var(--text-muted)', 
                          margin: '0 0 4px 0' 
                        }}>
                          Generated Content:
                        </p>
                        <div style={{ 
                          fontSize: '12px', 
                          color: 'var(--text-normal)', 
                          backgroundColor: 'var(--background-tertiary)', 
                          padding: '8px', 
                          borderRadius: '4px', 
                          maxHeight: '120px', 
                          overflow: 'auto',
                          margin: 0,
                          lineHeight: '1.4'
                        }}>
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

      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

export default LLMSettingsModal;