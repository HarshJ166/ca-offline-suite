const {
  app,
  BrowserWindow,
  protocol,
  ipcMain,
  shell,
  dialog,
} = require("electron");
const fs = require("fs");
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
const licenseManager = require("./LicenseManager");
const { generateReportIpc } = require("./ipc/generateReport");
const { registerOpportunityToEarnIpc } = require("./ipc/opportunityToEarn");
const db = require("./db/db");
const { spawn, execFile } = require("child_process");
const log = require("electron-log");

let pythonProcess = null;

function getProductionExecutablePath() {
  const platformExecutables = {
    win32: path.join(process.resourcesPath, "backend", "main", "main.exe"),
    darwin: path.join(process.resourcesPath, "backend", "main", "main"),
    // win32: path.join(__dirname, "../dist/main", "main.exe"),
    // darwin: path.join(__dirname, "../dist/main", "main"),
    // linux: path.join(process.resourcesPath, "dist", "linux", "my_app"),
  };

  const executablePath = platformExecutables[process.platform];

  if (!executablePath || !fs.existsSync(executablePath)) {
    const errorMessage = `Executable not found for platform: ${process.platform}`;
    log.error(errorMessage);
    dialog.showErrorBox("Executable Missing", errorMessage);
    return null;
  }

  return executablePath;
}

// Function to start the appropriate process (executable in production or Python script in development)
async function startPythonExecutable() {
  return new Promise((resolve, reject) => {
    let command, args;
    let options = {
      detached: false,
      stdio: "pipe",
    };
    if (isDev) {
      const venvPythonPath =
        process.platform === "win32"
          ? path.join(__dirname, "../.venv/Scripts/python.exe") // Path to .venv Python on Windows
          : path.join(__dirname, "../.venv/bin/python"); // Path to .venv Python on macOS/Linux

      const pythonScriptPath = path.join(__dirname, "../backend/main.py");
      const workingDir = path.join(__dirname, "../");

      if (!fs.existsSync(pythonScriptPath)) {
        const errorMessage =
          "Python script main.py not found in development mode.";
        log.error(errorMessage);
        dialog.showErrorBox("Development Error", errorMessage);
        reject(new Error(errorMessage));
        return;
      }

      if (!fs.existsSync(venvPythonPath)) {
        const errorMessage =
          "Virtual environment not found. Ensure .venv is set up.";
        log.error(errorMessage);
        dialog.showErrorBox("Development Error", errorMessage);
        reject(new Error(errorMessage));
        return;
      }

      command = venvPythonPath; // Use Python from .venv
      args = ["-m", "backend.main"];
      options.cwd = workingDir;
    } else {
      // Production mode: Run platform-specific executable
      const executablePath = getProductionExecutablePath();
      if (!executablePath) {
        reject(new Error("Executable not found"));
        return;
      }

      command = executablePath;
      args = [];
    }

    try {
      log.info("Options : ", options);
      pythonProcess = spawn(command, args, options);

      pythonProcess.stdout.on("data", (data) =>
        log.info(`Process stdout: ${data}`)
      );
      pythonProcess.stderr.on("data", (data) =>
        log.error(`Process stderr: ${data}`)
      );

      pythonProcess.on("error", (error) => {
        const errorMessage = `Failed to start process: ${error.message}`;
        log.error(errorMessage);
        dialog.showErrorBox("Process Error", errorMessage);
        reject(error);
      });

      pythonProcess.on("close", (code) => {
        if (code !== 0) {
          const errorMessage = `Process exited with non-zero code: ${code}`;
          log.error(errorMessage);
          // dialog.showErrorBox("Process Exited", errorMessage);
          reject(new Error(errorMessage));
        } else {
          log.info("Process started successfully.");
          resolve();
        }
      });

      // Small delay to ensure the process initializes
      setTimeout(resolve, 2000);
    } catch (error) {
      const errorMessage = `Unexpected error starting process: ${error.message}`;
      log.error(errorMessage);
      dialog.showErrorBox("Unexpected Error", errorMessage);
      reject(error);
    }
  });
}

// Configure electron-log
log.transports.console.level = "debug"; // Set the log level
log.transports.file.level = "info"; // Only log info level and above in the log file

log.info("Working Directory:", process.cwd());

// Instead of electron-is-dev, we'll use this simple check
const isDev = process.env.NODE_ENV === "development";
log.info("process.env.NODE_ENV", process.env.NODE_ENV);

const BASE_DIR = isDev ? __dirname : app.getPath("module");
log.info("current directory", app.getAppPath());
log.info("BASE_DIR", BASE_DIR);
log.info("__dirname", __dirname);

// Add this function to handle file protocol
function createProtocol() {
  protocol.registerFileProtocol("app", (request, callback) => {
    const url = request.url.replace("app://", "");
    try {
      return callback(path.normalize(`${__dirname}/../react-app/build/${url}`));
    } catch (error) {
      log.error("Protocol error:", error);
    }
  });
}

async function createWindow() {
  const win = new BrowserWindow({
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
    win.loadURL("http://localhost:3000");
  } else {
    // Use absolute path resolution for production
    const prodPath = path.resolve(
      __dirname,
      "react-app",
      "build",
      "index.html"
    );
    log.info("Directory name:", __dirname);
    log.info("Production path:", prodPath);
    log.info("Production path:", prodPath);
    win.loadFile(prodPath).catch((err) => {
      log.error("Failed to load production build:", err);
    });
  }

  const createTempDirectory = () => {
    let tempDir = "";
    if (isDev) {
      tempDir = path.join(__dirname, "tmp");
    } else {
      tempDir = path.join(app.getPath("temp"), "statements");
    }

    log.info("TEMP directory:", tempDir);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    log.info("TEMP directory:", tempDir);
    return tempDir;
  };

  const TMP_DIR = createTempDirectory();

  registerIndividualDashboardIpc();
  registerCaseDashboardIpc();
  generateReportIpc(TMP_DIR);
  registerOpenFileIpc(BASE_DIR);
  registerReportHandlers(TMP_DIR);
  registerAuthHandlers();
  registerOpportunityToEarnIpc();

  // Handle file saving to temp directory
  ipcMain.handle("save-file-to-temp", async (event, fileBuffer) => {
    try {
      const tempDir = createTempDirectory();
      const fileName = `${uuidv4()}.pdf`; // Generate unique filename
      const filePath = path.join(tempDir, fileName);

      await fs.promises.writeFile(filePath, Buffer.from(fileBuffer));
      return filePath;
    } catch (error) {
      log.error("Error saving file to temp directory:", error.message);
      throw error;
    }
  });

  // Clean up temp files
  ipcMain.handle("cleanup-temp-files", async () => {
    const tempDir = path.join(app.getPath("temp"), "report-generator");
    try {
      if (fs.existsSync(tempDir)) {
        await fs.promises.rm(tempDir, { recursive: true, force: true });
      }
      return true;
    } catch (error) {
      log.error("Error cleaning up temp files:", error);
      throw error;
    }
  });
}

app.setName("CypherSol Dev");

app.whenReady().then(async () => {
  log.info("App is ready", app.getPath("userData"));
  try {
    try {
      await sessionManager.init();
    } catch (error) {
      log.error("SessionManager initialization failed:", error);
      throw error;
    }

    try {
      await licenseManager.init();
    } catch (error) {
      log.error("LicenseManager initialization failed:", error);
      throw error;
    }

    try {
      await sessionManager.init();
    } catch (error) {
      log.error("SessionManager initialization failed:", error);
      throw error;
    }

    try {
      await licenseManager.init();
    } catch (error) {
      log.error("LicenseManager initialization failed:", error);
      throw error;
    }

    try {
      await startPythonExecutable();
    } catch (error) {
      log.error("Python initialization failed:", error);
      throw error;
    }

    // Proceed with the window creation and other tasks after initialization
    createProtocol();
    createWindow();

    // try {
    //   createUser();  // Handle user creation after SessionManager is ready
    // } catch (dbError) {
    //   console.error("User creation error:", dbError);
    // }
  } catch (error) {
    log.error("Failed to initialize App:", error);
    // Optionally handle the error, e.g., show an error dialog or quit the app
    app.quit();
  }
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  log.info("App is quitting");
  if (pythonProcess) {
    log.info("Stopping Python process...");
    pythonProcess.kill("SIGTERM");
  }
});

app.on("activate", () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow();
  }
});
