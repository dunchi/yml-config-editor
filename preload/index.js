"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('gemini', {
    writeClipboard: (text) => electron_1.ipcRenderer.invoke('clipboard:writeText', text),
    // Crypto APIs
    decrypt: (cipherText, password, salt) => electron_1.ipcRenderer.invoke('crypto:decrypt', cipherText, password, salt),
    parseAndDecrypt: (data, password, salt) => electron_1.ipcRenderer.invoke('crypto:parse-and-decrypt', data, password, salt),
    reEncrypt: (current, rememberedKeys, password, salt) => electron_1.ipcRenderer.invoke('crypto:re-encrypt', current, rememberedKeys, password, salt),
    parseKeysOnly: (data) => electron_1.ipcRenderer.invoke('crypto:parse-keys-only', data)
});
