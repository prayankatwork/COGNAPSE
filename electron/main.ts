import { app, BrowserWindow } from 'electron';
import path from 'path';
import { spawn, ChildProcess, exec } from 'child_process';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow: BrowserWindow | null = null;
let ollamaProcess: ChildProcess | null = null;

// --- SMART AUTO-INSTALLER & BOOT ENGINE ---
function bootOllamaSilently() {
  console.log('[System] Verifying intelligence core (Ollama)...');
  
  // Check if ollama is installed by attempting to get its version
  exec('ollama --version', (error) => {
    if (error) {
      console.warn('[System] Ollama core not found. Redirecting to official setup...');
      
      // On Windows, we trigger the official installer download/launch
      const setupCommand = `powershell -Command "Start-Process https://ollama.com/download/OllamaSetup.exe"`;
      exec(setupCommand, (setupErr) => {
        if (setupErr) {
          console.error('[System] Automated setup initiation failed:', setupErr);
        } else {
          console.log('[System] Setup initiated. Please follow the on-screen instructions.');
        }
      });
      return;
    }

    console.log('[System] Ollama detected. Booting local accelerator...');
    
    // Start Ollama with the CORS environment variable applied
    ollamaProcess = spawn('ollama', ['serve'], {
      // Restrict Ollama CORS to localhost only — prevents external sites from accessing the local AI service
      env: { ...process.env, OLLAMA_ORIGINS: "http://localhost:5173,http://localhost:3000,http://127.0.0.1:3000,https://cognapse.vercel.app" },
      detached: false, // Attached to main process
      shell: true,
    });

    ollamaProcess.stdout?.on('data', (data) => {
      console.log(`[Ollama Node] ${data.toString()}`);
    });

    ollamaProcess.stderr?.on('data', (data) => {
      console.log(`[Ollama Status] ${data.toString()}`);
    });

    ollamaProcess.on('close', (code) => {
      console.log(`[Ollama Node] Terminated with code ${code}`);
    });
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
      nodeIntegration: false, // Critical: Disable node integration in renderer
      contextIsolation: true, // Critical: Isolate preload context
      sandbox: true, // Security: Enable Chromium sandbox
      webSecurity: true, // Security: Enforce Same-Origin Policy
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

  // --- HARDENED ELECTRON SECURITY CONTROLS ---
  
  // 1. Prevent creation of new windows (blocks target="_blank" exploits)
  mainWindow.webContents.setWindowOpenHandler(() => {
    console.warn('[Security] Blocked attempt to open new window.');
    return { action: 'deny' };
  });

  // 2. Prevent arbitrary navigation (keeps app contained)
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    const parsedUrl = new URL(navigationUrl);
    // Only allow local dev server or file:// protocol
    if (!parsedUrl.protocol.startsWith('file:') && !parsedUrl.hostname.includes('localhost') && !parsedUrl.hostname.includes('127.0.0.1')) {
      event.preventDefault();
      console.warn(`[Security] Blocked external navigation to: ${navigationUrl}`);
    }
  });
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
