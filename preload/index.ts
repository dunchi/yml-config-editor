import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('gemini', {
  writeClipboard: (text: string) => ipcRenderer.invoke('clipboard:writeText', text),

  // Window control
  openEncrypt: () => ipcRenderer.invoke('window:open-encrypt'),
  openDecrypt: () => ipcRenderer.invoke('window:open-decrypt'),

  // Repository management
  getRepositoryFiles: () => ipcRenderer.invoke('repo:get-files'),
  readRepositoryFile: (filePath: string) => ipcRenderer.invoke('repo:read-file', filePath),
  refreshRepository: () => ipcRenderer.invoke('repo:refresh'),

  // Crypto APIs
  encrypt: (plainText: string, password: string, salt: string) =>
    ipcRenderer.invoke('crypto:encrypt', plainText, password, salt),

  decrypt: (cipherText: string, password: string, salt: string) =>
    ipcRenderer.invoke('crypto:decrypt', cipherText, password, salt),

  parseAndDecrypt: (data: string, password: string, salt: string) =>
    ipcRenderer.invoke('crypto:parse-and-decrypt', data, password, salt),

  reEncrypt: (current: string, rememberedKeys: string[], password: string, salt: string) =>
    ipcRenderer.invoke('crypto:re-encrypt', current, rememberedKeys, password, salt),

  parseKeysOnly: (data: string) => ipcRenderer.invoke('crypto:parse-keys-only', data)
})
