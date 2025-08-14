import { app, BrowserWindow, ipcMain, clipboard } from 'electron'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { springEncrypt, springDecrypt, tryParseKeyedLines, reEncryptRemembered } from '../renderer/spring-crypto.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let win: BrowserWindow | null = null

async function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 720,
    webPreferences: {
      // Load preload script from the dist directory
      preload: path.join(__dirname, '..', 'preload', 'index.cjs') // __dirname is dist/electron
    }
  })

  // Load index.html from the dist directory
  const file = path.join(__dirname, '..', 'renderer', 'index.html') // __dirname is dist/electron
  await win.loadFile(file)
}

app.whenReady().then(() => {
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Clipboard bridge
ipcMain.handle('clipboard:writeText', (_evt, text: string) => {
  clipboard.writeText(text)
  return true
})

// Crypto bridges
ipcMain.handle('crypto:encrypt', (_evt, plainText: string, password: string, salt: string) => {
  return springEncrypt(plainText, password, salt)
})

ipcMain.handle('crypto:decrypt', (_evt, cipherText: string, password: string, salt: string) => {
  return springDecrypt(cipherText, password, salt)
})

ipcMain.handle('crypto:parse-and-decrypt', (_evt, data: string, password: string, salt: string) => {
  // Note: The decrypt function is now closed over in the main process
  return tryParseKeyedLines(data, (cipherHex) => springDecrypt(cipherHex, password, salt))
})

ipcMain.handle('crypto:re-encrypt', (_evt, current: string, rememberedKeys: string[], password: string, salt: string) => {
  // Note: The encrypt function is now closed over in the main process
  return reEncryptRemembered(current, new Set(rememberedKeys), (text) => springEncrypt(text, password, salt))
})

ipcMain.handle('crypto:parse-keys-only', (_evt, data: string) => {
  return tryParseKeyedLines(data)
})
