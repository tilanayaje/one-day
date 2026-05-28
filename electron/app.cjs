const { app, BrowserWindow } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

function getMimeType(ext) {
  const types = {
    '.html': 'text/html',
    '.js':   'application/javascript',
    '.css':  'text/css',
    '.png':  'image/png',
    '.ico':  'image/x-icon',
    '.ttf':  'font/ttf',
    '.json': 'application/json',
    '.woff': 'font/woff',
    '.woff2':'font/woff2',
  };
  return types[ext] || 'application/octet-stream';
}

function startServer(distPath, port) {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      let filePath = path.join(distPath, req.url === '/' ? 'index.html' : req.url);
      if (!fs.existsSync(filePath)) filePath = path.join(distPath, 'index.html');
      const ext = path.extname(filePath);
      res.setHeader('Content-Type', getMimeType(ext));
      fs.createReadStream(filePath).pipe(res);
    });
    server.listen(port, '127.0.0.1', () => resolve());
  });
}

async function createWindow() {
  const distPath = path.join(__dirname, '../dist');
  const port = 19006;
  await startServer(distPath, port);

  const win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 900,
    minHeight: 600,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
    title: 'One Day',
  });

  win.loadURL(`http://127.0.0.1:${port}`);
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});