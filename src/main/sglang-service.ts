import * as path from 'path';
import { ChildProcess, spawn } from 'child_process';

let sgLangProcess: null | ChildProcess = null;
const DEFAULT_PORT = 8001;

// Starts up the SGLang server
export const startSgLangServer = (port: number = DEFAULT_PORT): void => {
  if (sgLangProcess) {
    console.log("SGLang server is already running");
    return;
  }
  
  const venvPath = path.join(process.cwd(), 'venv');
  const pythonCommand = process.platform === 'win32'
    ? path.join(venvPath, 'Scripts', 'python.exe')
    : path.join(venvPath, 'bin', 'python');

  console.log('Starting SGLang server...');
  // Run the SGLang server with OpenAI compatible API
  sgLangProcess = spawn(pythonCommand, [
    '-m', 'sglang.launch_server', 
    '--api-type', 'openai', 
    '--port', port.toString()
  ], {
    cwd: process.cwd(),
    stdio: 'inherit',
    detached: true,
    windowsHide: true
  });

  sgLangProcess.on('error', (err) => {
    console.error('Failed to start SGLang server:', err.message);
  });

  console.log("Started SGLang server with PID:", sgLangProcess.pid);
};

export const endSgLangServer = (): void => {
  if (sgLangProcess && !isNaN(sgLangProcess.pid) && !sgLangProcess.killed) {
    if (process.platform === 'win32') {
      sgLangProcess.kill('SIGTERM'); // Kill only the main process
    }
    else {
      process.kill(-sgLangProcess.pid); // Kill the whole process group
    }
    console.log('Closed SGLang server with PID:', sgLangProcess.pid);
    sgLangProcess = null;
  }
};

export const isSgLangRunning = (): boolean => {
  return sgLangProcess !== null && !sgLangProcess.killed;
};

export const restartSgLangServer = (port: number = DEFAULT_PORT): void => {
  endSgLangServer();
  startSgLangServer(port);
}
