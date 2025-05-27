jest.mock('electron', () => {
  const mockApp = {
    on: jest.fn(),
    whenReady: jest.fn(() => Promise.resolve()),
    quit: jest.fn(),
  };

  const mockBrowserWindow = jest.fn().mockImplementation(() => ({
    loadFile: jest.fn(),
    on: jest.fn(),
  }));

  return {
    app: mockApp,
    BrowserWindow: mockBrowserWindow,
  };
});

jest.setTimeout(60000);