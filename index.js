const { app, BrowserWindow, shell, protocol } = require('electron');
const fs = require('fs');

// https://discuss.atom.io/t/how-to-catch-the-event-of-clicking-the-app-windows-close-button-in-electron-app/21425
let win;
let willQuitApp;

// Check for updates
const { autoUpdater } = require("electron-updater");
app.on('ready', function () {
    autoUpdater.checkForUpdatesAndNotify();
});

// Create window
function createWindow() {
    const windowStateKeeper = require('electron-window-state');
    // Window state
    let mainWindowState = windowStateKeeper({
        defaultWidth: 1000,
        defaultHeight: 800,
    });
    // Create the browser window.
    const path = require('path');
    win = new BrowserWindow({
        icon: path.join(__dirname, 'icon.icns'),
        'x': mainWindowState.x,
        'y': mainWindowState.y,
        'width': mainWindowState.width,
        'height': mainWindowState.height,
        minWidth: 350,
        minHeight: 100,
        // hide until ready
        show: false,
        // Enables DRM
        webPreferences: {
            plugins: true,
            nodeIntegration: false,
            contextIsolation: true,
            sandbox: true,
        },
        titleBarStyle: 'hiddenInset'
    });

    // Let us register listeners on the window, so we can update the state
    // automatically (the listeners will be removed when the window is closed)
    // and restore the maximized or full screen state
    mainWindowState.manage(win);
    // hides toolbar
    win.setMenuBarVisibility(false);
    // allows you to open toolbar by pressing alt
    win.setAutoHideMenuBar(true);
    
    win.loadURL("https://discord.com/app",
    {userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/92.0.4515.159 Safari/537.36'});

    // Inject custom JavaScript
    let injectJSPath = path.join(process.resourcesPath, 'inject.js');
    if (!fs.existsSync(injectJSPath)) injectJSPath = './inject.js';
    fs.readFile(injectJSPath, 'utf-8', (_, data) => {
        win.webContents.executeJavaScript(data);
    });

    // Inject custom CSS
    let injectCSSPath = path.join(process.resourcesPath, 'inject.css');
    if (!fs.existsSync(injectCSSPath)) injectCSSPath = './inject.css';
    fs.readFile(injectCSSPath, 'utf-8', (_, data) => {
        win.webContents.insertCSS(data);
    });

    win.webContents.on('new-window', (e, url) => {
        e.preventDefault();
        shell.openExternal(url);
    });

    // shows when ready
    win.once('ready-to-show', () => {
        win.show()
    })

    // Mirror behaviour of real app by only hiding the window
    win.on('close', (e) => {
        if (willQuitApp) {
            /* the user tried to quit the app */
            win = null;
        } else {
            /* the user only tried to close the window */
            e.preventDefault();
            win.hide();
        }
    });
}

app.whenReady().then(() => {
    protocol.interceptFileProtocol('file', (request, callback) => {
        const url = request.url.substr(7)    /* all urls start with 'file://' */
        callback({ path: path.normalize(`${__dirname}/${url}`) })
      }, (err) => {
        if (err) console.error('Failed to register protocol')
      })
      createWindow()

    createWindow()
})

// Show the window again once user clicks on dock icon
app.on('activate', () => {
    win.show();
});

/* 'before-quit' is emitted when Electron receives 
 * the signal to exit and wants to start closing windows */
app.on('before-quit', () => willQuitApp = true);