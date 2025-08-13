"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
var electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld('gemini', {
    writeClipboard: function (text) { return electron_1.ipcRenderer.invoke('clipboard:writeText', text); },
    // Crypto APIs
    decrypt: function (cipherText, password, salt) {
        return electron_1.ipcRenderer.invoke('crypto:decrypt', cipherText, password, salt);
    },
    parseAndDecrypt: function (data, password, salt) {
        return electron_1.ipcRenderer.invoke('crypto:parse-and-decrypt', data, password, salt);
    },
    reEncrypt: function (current, rememberedKeys, password, salt) {
        return electron_1.ipcRenderer.invoke('crypto:re-encrypt', current, rememberedKeys, password, salt);
    },
    parseKeysOnly: function (data) { return electron_1.ipcRenderer.invoke('crypto:parse-keys-only', data); }
});
