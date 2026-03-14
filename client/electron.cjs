const { app, BrowserWindow } = require('electron');
const path = require('path');
const { spawn } = require('child_process');

let mainWindow;
let serverProcess;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true
    },
    title: '建筑包工头系统'
  });

  // 启动后端服务
  const serverPath = path.join(__dirname, '..', 'server');
  serverProcess = spawn('npm', ['run', 'dev'], {
    cwd: serverPath,
    shell: true,
    env: { ...process.env, PORT: '3001' }
  });

  serverProcess.stdout.on('data', (data) => {
    console.log(`Server: ${data}`);
  });

  serverProcess.stderr.on('data', (data) => {
    console.error(`Server Error: ${data}`);
  });

  // 等待后端启动后打开前端
  setTimeout(() => {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  }, 3000);

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (serverProcess) {
      serverProcess.kill();
    }
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
