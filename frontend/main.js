const { app, BrowserWindow, protocol, ipcMain, shell } = require("electron");
const { registerOpenFileIpc } = require("./ipc/fileHandler.js");
require("dotenv").config();
const path = require("path");
const {
  registerIndividualDashboardIpc,
} = require("./ipc/individualDashboard.js");
const { registerCaseDashboardIpc } = require("./ipc/caseDashboard.js");
const { registerReportHandlers } = require("./ipc/reportHandlers.js");
const { registerAuthHandlers } = require("./ipc/authHandlers.js");
const sessionManager = require("./SessionManager");
const licenseManager = require('./LicenseManager');
const { generateReportIpc } = require("./ipc/generateReport");
const db = require("./db/db");
const { autoUpdater } = require('electron-updater');
const fs = require('fs').promises;
const { v4: uuidv4 } = require('uuid');

const log = require("electron-log");

// Configure electron-log
log.transports.console.level = "debug"; // Set the log level
log.transports.file.level = "info"; // Only log info level and above in the log file

// Configure autoUpdater logging
autoUpdater.logger = log;
autoUpdater.logger.transports.file.level = 'info';

log.info("Working Directory:", process.cwd());

// Instead of electron-is-dev, we'll use this simple check
const isDev = process.env.NODE_ENV === "development";
log.info("process.env.NODE_ENV", process.env.NODE_ENV);

const BASE_DIR = isDev ? __dirname : process.resourcesPath;
log.info("BASE_DIR", BASE_DIR);
log.info("__dirname", __dirname);

let mainWindow;

// Add this function to handle file protocol
function createProtocol() {
  protocol.registerFileProtocol("app", (request, callback) => {
    const url = request.url.replace("app://", "");
    try {
      return callback(path.normalize(`${__dirname}/../react-app/build/${url}`));
    } catch (error) {
      console.error("Protocol error:", error);
    }
  });
}

// Auto-update event handlers
function setupAutoUpdater() {
  if (isDev) {
    log.info('Skipping auto-update setup in development mode');
    return;
  }

  autoUpdater.on('checking-for-update', () => {
    log.info('Checking for updates...');
    mainWindow.webContents.send('update-status', 'checking');
  });

  autoUpdater.on('update-available', (info) => {
    log.info('Update available:', info);
    mainWindow.webContents.send('update-status', 'available');
  });

  autoUpdater.on('update-not-available', (info) => {
    log.info('Update not available:', info);
    mainWindow.webContents.send('update-status', 'not-available');
  });

  autoUpdater.on('download-progress', (progressObj) => {
    log.info('Download progress:', progressObj);
    mainWindow.webContents.send('update-progress', progressObj);
  });

  autoUpdater.on('update-downloaded', (info) => {
    log.info('Update downloaded:', info);
    mainWindow.webContents.send('update-downloaded');
  });

  autoUpdater.on('error', (err) => {
    log.error('AutoUpdater error:', err);
    mainWindow.webContents.send('update-error', err.message);
  });

  // Check for updates every 30 minutes
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => {
      log.error('Error checking for updates:', err);
    });
  }, 30 * 60 * 1000);
}

// IPC handlers for updates
function setupUpdateIPC() {
  ipcMain.handle('check-for-updates', async () => {
    if (!isDev) {
      try {
        await autoUpdater.checkForUpdates();
        return { success: true };
      } catch (error) {
        log.error('Error checking for updates:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Dev mode' };
  });

  ipcMain.handle('download-update', async () => {
    if (!isDev) {
      try {
        await autoUpdater.downloadUpdate();
        return { success: true };
      } catch (error) {
        log.error('Error downloading update:', error);
        return { success: false, error: error.message };
      }
    }
    return { success: false, error: 'Dev mode' };
  });

  ipcMain.handle('install-update', () => {
    if (!isDev) {
      autoUpdater.quitAndInstall();
    }
  });
}

async function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1800,
    height: 1000,
    simpleFullscreen: true,
    webPreferences: {
      nodeIntegration: true,
      // contextIsolation: false,
      preload: path.join(__dirname, "preload.js"),
    },
    icon: path.join(__dirname, "./assets/cyphersol-icon.png"),
    autoHideMenuBar: true,
    title: isDev ? "CypherSol Dev" : "CypherSol",
  });

  if (isDev) {
    mainWindow.loadURL("http://localhost:3000");
  } else {
    // Use absolute path resolution for production
    const prodPath = path.resolve(
      __dirname,
      "react-app",
      "build",
      "index.html"
    );
    log.info("Directory name:", __dirname);
    console.log("Production path:", prodPath);
    log.info("Production path:", prodPath);
    mainWindow.loadFile(prodPath).catch((err) => {
      console.error("Failed to load production build:", err);
    });
  }

  if (isDev) {
    // mainWindow.webContents.openDevTools();
  }

  registerIndividualDashboardIpc();
  registerCaseDashboardIpc();
  generateReportIpc();
  registerOpenFileIpc(BASE_DIR);
  registerReportHandlers();
  registerAuthHandlers();

  setupAutoUpdater();
  setupUpdateIPC();
}

function createTempDirectory() {
  const tempDir = path.join(app.getPath('temp'), 'report-generator');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  return tempDir;
}

// Handle file saving to temp directory
ipcMain.handle('save-file-to-temp', async (event, fileBuffer) => {
  try {
    const tempDir = createTempDirectory();
    const fileName = `${uuidv4()}.pdf`; // Generate unique filename
    const filePath = path.join(tempDir, fileName);

    await fs.writeFile(filePath, Buffer.from(fileBuffer));
    return filePath;
  } catch (error) {
    console.error('Error saving file to temp directory:', error.message);
    throw error;
  }
});

// Clean up temp files
ipcMain.handle('cleanup-temp-files', async () => {
  const tempDir = path.join(app.getPath('temp'), 'report-generator');
  try {
    if (fs.existsSync(tempDir)) {
      await fs.rm(tempDir, { recursive: true, force: true });
    }
    return true;
  } catch (error) {
    console.error('Error cleaning up temp files:', error);
    throw error;
  }
});

app.setName("CypherSol Dev");

app.whenReady().then(async () => {
  console.log("App is ready", app.getPath("userData"));
  try {
    try {
      await sessionManager.init();
    }
    catch (error) {
      console.log("SessionManager initialization failed:", error);
    }

    try {
      await licenseManager.init();
    }
    catch (error) {
      console.log("LicenseManager initialization failed:", error);
    }

    // Proceed with the window creation and other tasks after initialization
    createProtocol();
    createWindow();

    // Initial update check after 1 minute
    if (!isDev) {
      setTimeout(() => {
        autoUpdater.checkForUpdates().catch(err => {
          log.error('Error in initial update check:', err);
        });
      }, 60 * 1000);
    }
  } catch (error) {
    console.error("Failed to initialize App:", error);
    // Optionally handle the error, e.g., show an error dialog or quit the app
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
