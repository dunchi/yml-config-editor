export interface GeminiAPI {
  writeClipboard: (text: string) => Promise<void>;
  openEncrypt: () => Promise<void>;
  openDecrypt: () => Promise<void>;
  encrypt: (plainText: string, password: string, salt: string) => Promise<string>;
  decrypt: (cipherText: string, password: string, salt: string) => Promise<string>;
  parseAndDecrypt: (data: string, password: string, salt: string) => Promise<{ plain: string; rememberedKeys: string[] }>;
  reEncrypt: (current: string, rememberedKeys: string[], password: string, salt: string) => Promise<string>;
  parseKeysOnly: (data: string) => Promise<{ plain: string; rememberedKeys: string[] }>;
}

declare global {
  interface Window {
    gemini: GeminiAPI;
  }
}
