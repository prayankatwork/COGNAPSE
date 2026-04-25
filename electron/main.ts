import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn, ChildProcess } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let ollamaProcess: ChildProcess | null = null;

// The magical "System-Level" function
function bootOllamaSilently() {
  console.log('[System] Booting local Ollama accelerator silently...');
  
  // Start Ollama with the CORS environment variable applied
  ollamaProcess = spawn('ollama', ['serve'], {
    env: { ...process.env, OLLAMA_ORIGINS: "*" },
    detached: false, // We want it attached to our main process so it dies when we die
    shell: true,
  });

  ollamaProcess.stdout?.on('data', (data) => {
    console.log(`[Ollama Node] ${data.toString()}`);
  });

  ollamaProcess.stderr?.on('data', (data) => {
    // Ollama writes normal logs to stderr sometimes
    console.log(`[Ollama Status] ${data.toString()}`);
  });

  ollamaProcess.on('close', (code) => {
    console.log(`[Ollama Node] Terminated with code ${code}`);
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    title: "COGNAPSE",
    backgroundColor: '#0A0F1A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.mjs'),
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  // If in dev mode, load the Vite server, otherwise load the static build
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  // Remove the standard Windows menu bar to make it look like a sleek game/tool
  mainWindow.setMenuBarVisibility(false);
}

app.whenReady().then(() => {
  // Boot the backend AI silently
  bootOllamaSilently();
  
  // Render the frontend
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// CRITICAL: Clean up the background AI process when the app closes
app.on('quit', () => {
  if (ollamaProcess) {
    console.log('[System] Shutting down Ollama node...');
    // In Windows, shell:true spawns a cmd.exe wrapper, so we need to kill the tree
    spawn('taskkill', ['/pid', ollamaProcess.pid?.toString() || '', '/f', '/t']);
  }
});
