import { app, BrowserWindow, ipcMain, clipboard } from 'electron'
import path from 'node:path'
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { simpleGit } from 'simple-git'
import { springEncrypt, springDecrypt, tryParseKeyedLines, reEncryptRemembered } from '../renderer/spring-crypto.js'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

let win: BrowserWindow | null = null
let encryptWindow: BrowserWindow | null = null
let decryptWindow: BrowserWindow | null = null

const REPO_URL = 'https://github.com/nicemso/biseo-config-repo.git'
const REPO_DIR = path.join(process.cwd(), 'biseo-config-repo')

async function initializeRepository() {
  try {
    if (fs.existsSync(REPO_DIR)) {
      // 폴더가 존재하면 git pull
      const git = simpleGit(REPO_DIR)
      await git.pull()
      console.log('Repository updated successfully')
    } else {
      // 폴더가 없으면 git clone
      const git = simpleGit()
      await git.clone(REPO_URL, REPO_DIR)
      console.log('Repository cloned successfully')
    }
  } catch (error) {
    console.error('Git operation failed:', error)
  }
}

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

async function createEncryptWindow() {
  if (encryptWindow) {
    encryptWindow.focus()
    return
  }

  encryptWindow = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: true,
    minimizable: false,
    maximizable: false,
    parent: win || undefined,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.cjs')
    }
  })

  const encryptFile = path.join(__dirname, '..', 'renderer', 'encrypt.html')
  await encryptWindow.loadFile(encryptFile)

  encryptWindow.on('closed', () => {
    encryptWindow = null
  })
}

async function createDecryptWindow() {
  if (decryptWindow) {
    decryptWindow.focus()
    return
  }

  decryptWindow = new BrowserWindow({
    width: 500,
    height: 400,
    resizable: true,
    minimizable: false,
    maximizable: false,
    parent: win || undefined,
    modal: false,
    webPreferences: {
      preload: path.join(__dirname, '..', 'preload', 'index.cjs')
    }
  })

  const decryptFile = path.join(__dirname, '..', 'renderer', 'decrypt.html')
  await decryptWindow.loadFile(decryptFile)

  decryptWindow.on('closed', () => {
    decryptWindow = null
  })
}

interface FileTreeItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileTreeItem[];
}

async function getRepositoryFiles(dirPath = REPO_DIR, relativePath = ''): Promise<FileTreeItem[]> {
  try {
    if (!fs.existsSync(dirPath)) {
      return []
    }

    const items: FileTreeItem[] = []
    const entries = fs.readdirSync(dirPath, { withFileTypes: true })

    for (const entry of entries) {
      if (entry.name.startsWith('.')) continue // .git 등 숨김 파일 제외
      
      const fullPath = path.join(dirPath, entry.name)
      const itemRelativePath = path.join(relativePath, entry.name)
      
      if (entry.isDirectory()) {
        const children: FileTreeItem[] = await getRepositoryFiles(fullPath, itemRelativePath)
        items.push({
          name: entry.name,
          type: 'directory',
          path: itemRelativePath,
          children
        })
      } else {
        items.push({
          name: entry.name,
          type: 'file',
          path: itemRelativePath
        })
      }
    }

    return items
  } catch (error) {
    console.error('Error reading repository files:', error)
    return []
  }
}

async function readRepositoryFile(filePath: string): Promise<string> {
  try {
    const fullPath = path.join(REPO_DIR, filePath)
    const content = fs.readFileSync(fullPath, 'utf8')
    return content
  } catch (error) {
    console.error('Error reading file:', error)
    throw error
  }
}

app.whenReady().then(async () => {
  await initializeRepository()
  createWindow()
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

// Repository management
ipcMain.handle('repo:get-files', async () => {
  return await getRepositoryFiles()
})

ipcMain.handle('repo:read-file', async (_evt, filePath: string) => {
  return await readRepositoryFile(filePath)
})

ipcMain.handle('repo:refresh', async () => {
  await initializeRepository()
  return await getRepositoryFiles()
})

// Window control
ipcMain.handle('window:open-encrypt', () => {
  createEncryptWindow()
})

ipcMain.handle('window:open-decrypt', () => {
  createDecryptWindow()
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
