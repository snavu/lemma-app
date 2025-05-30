jest.mock('electron', () => {
  const mockApp = {
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
    quit: jest.fn(),
  };

  // Mock instance methods
  const mockBrowserWindowInstance = {
    loadFile: jest.fn(),
    on: jest.fn(),
  };

  // Mock static methods on BrowserWindow
  const mockBrowserWindow = jest.fn().mockImplementation(() => mockBrowserWindowInstance);

  // Add static method getAllWindows returning an empty array
  (mockBrowserWindow as any).getAllWindows = jest.fn((): [] => []);

  return {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
  };
});

// Mock a test config.json separate from the one used in the app
jest.mock('./src/main/main', () => {
    const { Config } = require('./src/main/config-service');
    const path = require('path');
    const fs = require('fs');

    const fixturePath = path.join(process.cwd(), 'tests', 'fixtures', 'qa-system');
    const configPath = path.join(process.cwd(), 'tests', 'fixtures', 'config');
    const configData = {
      'notesDirectory': fixturePath,
      'viewMode': 'main',
      'llm': {
        'endpoint': 'https://api.deepseek.com',
        'apiKey': '',
        'model': 'deepseek-chat'
      },
      'agi': {
        'enableChunking': true,
        'enableLiveMode': true
      },
      'local': {
        'enabled': true,
        'port': 11434,
        'model': 'llama3.2'
      }
    };

    fs.mkdirSync(configPath, { recursive: true });
    // Write test config file
    fs.writeFileSync(path.join(configPath, 'config.json'), JSON.stringify(configData, null, 2));

    // getConfigPath() gets config.json within fixture directory
    jest.spyOn(Config.prototype as any, 'getConfigPath').mockImplementation(() => { 
        return path.join(configPath, 'config.json'); 
    });

    const testConfig = new Config();

    // console.log(testConfig);
    return { config: testConfig };
});

jest.setTimeout(60 * 60000);