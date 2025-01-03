const { app, BrowserWindow ,protocol} = require('electron');
const path = require('path');
const database = require('./db');
const UserRepository = require('./repository/UserRepository');


// Instead of electron-is-dev, we'll use this simple check
const isDev = process.env.NODE_ENV === 'development' 
console.log('process.env.NODE_ENV', process.env.NODE_ENV);
// Add this function to handle file protocol
function createProtocol() {
    protocol.registerFileProtocol('app', (request, callback) => {
      const url = request.url.replace('app://', '');
      try {
        return callback(path.normalize(`${__dirname}/../react-app/build/${url}`));
      } catch (error) {
        console.error('Protocol error:', error);
      }
    });
  }


function createWindow() {
    const win = new BrowserWindow({
        width: 1800,
        height: 1000,
        simpleFullscreen: true,
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false
        },
        icon: path.join(__dirname, './assets/cyphersol-icon.png'),
        autoHideMenuBar: true,
        title: 'CypherSol',

    });

    if (isDev) {
        win.loadURL('http://localhost:3000');
    } else {
        // Use absolute path resolution for production
        const prodPath = path.resolve(__dirname, '..', 'react-app', 'build', 'index.html');
        console.log('Production path:', prodPath);
        win.loadFile(prodPath).catch(err => {
            console.error('Failed to load production build:', err);
        });
    }

    if (isDev) {
        // win.webContents.openDevTools();
    }
}

function createUser() {
    try {
      const userData = {
        username: 'john_doe',
        email: 'john.doe@example.com',
        password: 'securepassword', // Adjust this according to your hashing mechanism
      };
  
      const newUser = UserRepository.createUser(userData);
      console.log('User created successfully:', newUser);
    } catch (error) {
      console.error('Error creating user:', error);
    }
  }

app.whenReady().then(() => {
  createProtocol();
  createWindow();

  try {
    createUser();
  } catch (dbError) {
    console.error('User creation error:', dbError);
  }
});

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
