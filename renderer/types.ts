export interface FileTreeItem {
  name: string;
  type: 'file' | 'directory';
  path: string;
  children?: FileTreeItem[];
}

export interface GeminiAPI {
  writeClipboard: (text: string) => Promise<void>;
  openEncrypt: () => Promise<void>;
  openDecrypt: () => Promise<void>;
  encrypt: (plainText: string, password: string, salt: string) => Promise<string>;
  decrypt: (cipherText: string, password: string, salt: string) => Promise<string>;
  parseAndDecrypt: (data: string, password: string, salt: string) => Promise<{ plain: string; rememberedKeys: string[] }>;
  reEncrypt: (current: string, rememberedKeys: string[], password: string, salt: string) => Promise<string>;
  parseKeysOnly: (data: string) => Promise<{ plain: string; rememberedKeys: string[] }>;
  getRepositoryFiles: () => Promise<FileTreeItem[]>;
  readRepositoryFile: (filePath: string) => Promise<string>;
  refreshRepository: () => Promise<FileTreeItem[]>;
}

declare global {
  interface Window {
    gemini: GeminiAPI;
  }
}
