const { app, BrowserWindow } = require('electron')
const path = require('path')

function createWindow () {
  const win = new BrowserWindow({
    width: 900,
    height: 650,
    webPreferences: {
      nodeIntegration: true
    },
    autoHideMenuBar: true,
    // Setting backgroundColor prevents visual flashing on load
    backgroundColor: '#0f111a',
    title: "OptiCore Suite",
    icon: path.join(__dirname, 'icon.ico') // We don't have an icon, but this is best practice
  })

  // Prevent title changes from HTML file if desired, or let it be
  win.on('page-title-updated', (evt) => {
    evt.preventDefault();
  });

  win.loadFile('index.html')
}

app.whenReady().then(() => {
  createWindow()
  
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
