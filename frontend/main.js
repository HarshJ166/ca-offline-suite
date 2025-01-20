const { app, BrowserWindow, protocol, ipcMain, shell } = require("electron");
const { registerOpenFileIpc } = require("./ipc/fileHandler.js");
require("dotenv").config();
const path = require("path");
const { registerIndividualDashboardIpc } = require("./ipc/individualDashboard.js");
const { registerCaseDashboardIpc } = require("./ipc/caseDashboard.js");
const { registerReportHandlers } = require("./ipc/reportHandlers.js");
const { registerAuthHandlers } = require("./ipc/authHandlers.js");
const sessionManager = require("./SessionManager");
const licenseManager = require('./LicenseManager');

console.log("Working Directory:", process.cwd());

const log = require("electron-log");
// const database = require('./db/db');
// const UserRepository = require('./db/repository/UserRepository');

// Configure electron-log
log.transports.console.level = "debug"; // Set the log level
log.transports.file.level = "info"; // Only log info level and above in the log file

// Instead of electron-is-dev, we'll use this simple check
const isDev = process.env.NODE_ENV === "development";
console.log("process.env.NODE_ENV", process.env.NODE_ENV);

const BASE_DIR = isDev ? __dirname : process.resourcesPath;

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
    console.log("Production path:", prodPath);
    log.info("Production path:", prodPath);
    win.loadFile(prodPath).catch((err) => {
      console.error("Failed to load production build:", err);
    });
  }

  if (isDev) {
    // win.webContents.openDevTools();
  }

  registerIndividualDashboardIpc();
  registerCaseDashboardIpc();
  registerOpenFileIpc(BASE_DIR);
  registerReportHandlers();
  registerAuthHandlers();
}

function createUser() {
  try {
    const userData = {
      username: "john_doe",
      email: "john.doe@example.com",
      password: "securepassword", // Adjust this according to your hashing mechanism
    };

    const newUser = UserRepository.createUser(userData);
    console.log("User created successfully:", newUser);
  } catch (error) {
    console.error("Error creating user:", error);
  }
}

app.setName("CypherSol Dev");

app.whenReady().then(async () => {
  console.log("App is ready", app.getPath('userData'));
  try {
    try{
      await sessionManager.init();
    }
    catch(error){
      console.log("SessionManager initialization failed:", error);
    }

    try{
      await licenseManager.init();
    }
    catch(error){
      console.log("LicenseManager initialization failed:", error);
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
