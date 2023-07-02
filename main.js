const {
    app,
    BrowserWindow,
    ipcMain
} = require("electron");
const path = require("path");
const fs = require("fs");

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

async function createWindow() {

    // Create the browser window.
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        'minHeight': 500,
        'minWidth': 900,
        webPreferences: {
            // preload: path.join(__dirname, "preload.js") // use a preload script
        }
    });

    // Load app
    await win.loadFile(path.join(__dirname, "index.html"));
    win.webContents.openDevTools();

    // rest of code..
}

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

// Create a listener for deleting files
ipcMain.on("deleteFile", (event, args) => {
    fs.unlinkSync(args.filePath);

    // Send the result back to the renderer process
    win.webContents.send("deleteFileResponse", true);
});

app.on('ready', createWindow);