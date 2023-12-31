const {
    app,
    BrowserWindow,
    dialog,
    ipcMain
} = require("electron");
const path = require("path");
const fs = require("fs");
const Store = require('electron-store');
const settings = new Store();
require('update-electron-app')({
    repo: 'williamli0707/SeatingChart'
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.
let win;

async function createWindow() {

    if(!settings.get("classes")) settings.set("classes", {});
    if(!settings.get("lastSeen")) settings.set("lastSeen", ".");

    // Create the browser window.
    win = new BrowserWindow({
        width: 1280,
        height: 720,
        'minHeight': 500,
        'minWidth': 900,
        webPreferences: {
            // preload: path.join(__dirname, "preload.js") // use a preload script
            nodeIntegration: true,
            contextIsolation: false,
        }
    });

    // Load app
    await win.loadFile(path.join(__dirname, "index.html"));
    // win.webContents.openDevTools();

    // settings.set("testing testing.testing testing", {"array": [0]})

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

ipcMain.on('close-win', (event, args) => {
    win.destroy();
})

ipcMain.on('reload', async () => {
    win.destroy();
    // await createWindow();
})

app.on('ready', createWindow);

ipcMain.handle("settings.set", (event, key, value) => {
    settings.set(key, value);
    return value;
});

ipcMain.handle("settings.get", (event, key) => {
    return settings.get(key);
});

/**
 * precondition: args[0] = className = string, className doesn't already exist, args[1] = rows, args[2] = columns
 */
ipcMain.handle("add-class", (event, args) => {
    settings.set("classes." + args[0],
        {
            archived: false,
            rows: args[1],
            columns: args[2],
            iterations: [],
            students: {}
        }
    );
});

ipcMain.handle('interrupt-close-win', (event, args) => {
    return dialog.showMessageBox(win, {
        type: 'question',
        title: 'Confirm',
        message: 'You have unsaved changes. Are you sure you want to exit? ',
        buttons: ['Cancel', 'Exit']
    })
})

ipcMain.handle('interrupt-loading', (event, args) => {
    return dialog.showMessageBox(win, {
        type: 'question',
        title: 'Confirm',
        message: 'You have unsaved changes. Are you sure you want to continue? ',
        buttons: ['Cancel', 'Continue']
    })
})



// ipcMain.handle()

//TODO:
/*
- Scroll button - front and back (not needed for now I think)
- fill all empty seats in the front
 */