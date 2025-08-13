import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('gemini', {
  writeClipboard: (text: string) => ipcRenderer.invoke('clipboard:writeText', text),

  // Crypto APIs
  decrypt: (cipherText: string, password: string, salt: string) =>
    ipcRenderer.invoke('crypto:decrypt', cipherText, password, salt),

  parseAndDecrypt: (data: string, password: string, salt: string) =>
    ipcRenderer.invoke('crypto:parse-and-decrypt', data, password, salt),

  reEncrypt: (current: string, rememberedKeys: string[], password: string, salt: string) =>
    ipcRenderer.invoke('crypto:re-encrypt', current, rememberedKeys, password, salt),

  parseKeysOnly: (data: string) => ipcRenderer.invoke('crypto:parse-keys-only', data)
})
