// =============================================
// Project: gemini-md (Electron + Spring-crypto compatible)
// =============================================
//
// How to run:
// 1) Save files with the given structure.
// 2) npm install
// 3) npm run dev
// 4) In the UI, 입력한 encrypt key / (옵션) salt(hex) 로 붙여넣기 & 저장 흐름 수행.
//
// Notes:
// - Spring Security Encryptors.text(password, salt) 호환 (AES-256-CBC + PBKDF2WithHmacSHA1, 1024 iters, 32-byte key, 16-byte IV)
// - 출력 형식: HEX(iv || ciphertext)  — Config Server의 {cipher} 접두사도 지원
// - paste 시 {cipher}… 혹은 순수 HEX를 감지해 복호화
// - paste한 원문에서 {cipher} 값을 가진 “키=값 / 키: 값” 라인들을 기억했다가 Cmd+S 시 해당 키들의 값만 재암호화하여 클립보드에 복사
// - 기본 salt는 'deadbeef' (Config Server RSA 흐름의 기본값과 동일). 실제 운영에서는 조직 고정 salt를 명시 입력 권장
// =============================================

// ---------------------------------------------
// package.json
// ---------------------------------------------
{
  "name": "gemini-md",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "electron .",
    "build": "echo 'Bundle as needed (e.g., electron-builder)'"
  },
  "devDependencies": {
    "@types/node": "^22.0.0",
    "electron": "^31.0.0",
    "typescript": "^5.5.0"
  }
}

// ---------------------------------------------
// tsconfig.json
// ---------------------------------------------
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "bundler",
    "strict": true,
    "jsx": "react-jsx",
    "lib": ["ES2022", "DOM"],
    "types": ["node"],
    "allowJs": false,
    "outDir": "dist"
  },
  "include": ["electron", "renderer", "preload"]
}

// ---------------------------------------------
// electron/main.ts
// ---------------------------------------------
import { app, BrowserWindow, ipcMain, clipboard } from 'electron'
import path from 'node:path'

let win: BrowserWindow | null = null

async function createWindow() {
  win = new BrowserWindow({
    width: 980,
    height: 720,
    webPreferences: {
      preload: path.join(app.getAppPath(), 'preload', 'index.cjs')
    }
  })

  const file = path.join(app.getAppPath(), 'renderer', 'index.html')
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

// ---------------------------------------------
// preload/index.ts (compiled to CJS to simplify import in electron)
// ---------------------------------------------
import { contextBridge, ipcRenderer } from 'electron'

contextBridge.exposeInMainWorld('gemini', {
  writeClipboard: async (text: string) => ipcRenderer.invoke('clipboard:writeText', text)
})

// Build step for preload to CJS (simple):
//   npx tsc --module commonjs --outDir preload --target ES2022 preload/index.ts
// Or temporarily compile by hand; for dev simplicity, you can place a precompiled file at preload/index.cjs

// ---------------------------------------------
// preload/index.cjs (fallback precompiled; use this if you skip TS build for preload)
// ---------------------------------------------
// const { contextBridge, ipcRenderer } = require('electron');
// contextBridge.exposeInMainWorld('gemini', {
//   writeClipboard: async (text) => ipcRenderer.invoke('clipboard:writeText', text)
// });

// ---------------------------------------------
// renderer/index.html
// ---------------------------------------------
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta http-equiv="Content-Security-Policy" content="default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'"> 
  <title>gemini.md — Spring Config Encryptor</title>
  <style>
    html, body { height: 100%; margin: 0; font-family: ui-sans-serif, system-ui, -apple-system, Roboto, 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif; }
    .wrap { display: grid; grid-template-rows: auto 1fr auto; height: 100%; }
    header { padding: 12px 16px; border-bottom: 1px solid #e5e7eb; display:flex; gap:12px; align-items:center; }
    header input { padding: 8px 10px; border: 1px solid #cbd5e1; border-radius: 10px; min-width: 280px; }
    header input#salt { min-width: 160px; }
    header .hint { color:#64748b; font-size:12px }
    main { padding: 0; }
    textarea { box-sizing: border-box; width: 100%; height: 100%; border: 0; padding: 16px; font: 14px/1.5 ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace; }
    .footer { padding: 8px 12px; border-top: 1px solid #e5e7eb; color:#64748b; font-size:12px; display:flex; justify-content:space-between; }
    .toast { position: fixed; right: 16px; bottom: 16px; padding: 10px 12px; background: #111827; color: white; border-radius: 10px; box-shadow: 0 8px 20px rgba(0,0,0,.25); opacity: 0; transform: translateY(8px); transition: opacity .25s ease, transform .25s ease; font-size: 13px; }
    .toast.show { opacity: 1; transform: translateY(0); }
    .tag { background:#eef2ff; color:#3730a3; padding:2px 6px; border-radius:6px; font-size:11px; }
  </style>
</head>
<body>
  <div class="wrap">
    <header>
      <strong>gemini.md</strong>
      <span class="hint">Spring Config Server 호환 암·복호화 편집기</span>
      <input id="key" placeholder="encrypt key (필수)" autocomplete="off" />
      <input id="salt" placeholder="salt(hex) — 기본: deadbeef" autocomplete="off" />
      <span class="tag">AES-256-CBC · PBKDF2(HmacSHA1, 1024)</span>
    </header>
    <main>
      <textarea id="editor" placeholder="여기에 붙여넣기 (Cmd+V). {cipher}… 혹은 HEX(iv||cipher) 를 자동 복호화합니다."></textarea>
    </main>
    <div class="footer">
      <div>붙여넣기 시 <em>암호화된 값이었던 키</em>를 자동 추적합니다. 저장(Cmd+S) 시 해당 키 값만 재암호화 → 클립보드.</div>
      <div>© gemini.md</div>
    </div>
  </div>
  <div class="toast" id="toast">암호화되어 클립보드에 복사했습니다.</div>
  <script type="module" src="./renderer.js"></script>
</body>
</html>

// ---------------------------------------------
// renderer/renderer.ts (bundled at runtime as ES module)
// ---------------------------------------------
import { springEncrypt, springDecrypt, tryParseKeyedLines, reEncryptRemembered } from './spring-crypto.js'

const $ = (sel: string) => document.querySelector(sel) as HTMLElement

const keyInput = $('#key') as HTMLInputElement
const saltInput = $('#salt') as HTMLInputElement
const editor = $('#editor') as HTMLTextAreaElement
const toast = $('#toast') as HTMLDivElement

// 기억한 키들: 사용자가 paste로 넣었을 때 {cipher} 값이었던 키 목록
let rememberedKeys: Set<string> = new Set()

function showToast(msg: string) {
  toast.textContent = msg
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2200)
}

function getCryptoParams() {
  const password = keyInput.value.trim()
  if (!password) throw new Error('encrypt key를 입력하세요')
  let salt = saltInput.value.trim()
  if (!salt) salt = 'deadbeef' // 운영에서는 조직 고정 salt를 명시 입력 권장
  if (!/^[0-9a-fA-F]+$/.test(salt)) throw new Error('salt는 hex 문자열이어야 합니다')
  return { password, salt: salt.toLowerCase() }
}

// Paste 트리거: 붙여넣는 텍스트를 자동 복호화 & 키 기억
editor.addEventListener('paste', async (e: ClipboardEvent) => {
  try {
    const { password, salt } = getCryptoParams()
    const data = e.clipboardData?.getData('text') ?? ''
    if (!data) return

    // 자동 감지: {cipher} 접두사 제거
    const stripped = data.trim().startsWith('{cipher}') ? data.trim().slice(8) : data.trim()
    // 만약 HEX로 보이면 단일 암호문으로 간주하여 복호화 시도
    const hexLike = /^[0-9a-fA-F\s:\-]+$/.test(stripped.replace(/\s+/g, '')) && stripped.length > 32

    if (hexLike) {
      e.preventDefault()
      const plain = springDecrypt(stripped.replace(/\s+/g, ''), password, salt)
      editor.value = plain

      // 라인 파싱: {cipher}로 암호화되어 있던 키들을 기억 (붙여넣은 원문 기준)
      rememberedKeys = tryParseKeyedLines(data).rememberedKeys
    } else {
      // 파일/문서 형태: 각 라인에서 {cipher} 감지 → 부분 복호화 및 키 기억
      const { plain, rememberedKeys: keys } = tryParseKeyedLines(data, (cipherHex) => springDecrypt(cipherHex, password, salt))
      if (keys.size > 0) {
        e.preventDefault()
        editor.value = plain
        rememberedKeys = keys
      }
    }
  } catch (err: any) {
    console.error(err)
    // 기본 동작(그냥 붙여넣기) 허용
  }
})

// Cmd+S 저장 → 기억한 키 값만 재암호화하여 클립보드로 복사 + 토스트
window.addEventListener('keydown', async (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    try {
      const { password, salt } = getCryptoParams()
      const output = reEncryptRemembered(editor.value, rememberedKeys, (text) => springEncrypt(text, password, salt))
      await (window as any).gemini.writeClipboard(output)
      showToast('암호화되어 클립보드에 복사했습니다.')
    } catch (err: any) {
      showToast('오류: ' + (err?.message ?? '암호화 실패'))
    }
  }
})

// ---------------------------------------------
// renderer/spring-crypto.ts — Spring Encryptors.text 호환 구현
// ---------------------------------------------
import crypto from 'node:crypto'

// PBKDF2(HmacSHA1), iterations=1024, keylen=32 (256-bit)
function deriveKey(password: string, saltHex: string): Buffer {
  const salt = Buffer.from(saltHex, 'hex')
  return crypto.pbkdf2Sync(password, salt, 1024, 32, 'sha1')
}

// AES-256-CBC, IV=16 bytes random; 출력: hex(iv || cipher)
export function springEncrypt(plain: string, password: string, saltHex: string): string {
  const key = deriveKey(password, saltHex)
  const iv = crypto.randomBytes(16)
  const cipher = crypto.createCipheriv('aes-256-cbc', key, iv)
  const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()])
  return Buffer.concat([iv, enc]).toString('hex')
}

// 입력: "{cipher}" 접두사 가능, 또는 순수 hex(iv||cipher)
export function springDecrypt(cipherText: string, password: string, saltHex: string): string {
  const hex = cipherText.trim().startsWith('{cipher}') ? cipherText.trim().slice(8) : cipherText.trim()
  const all = Buffer.from(hex, 'hex')
  if (all.length <= 16) throw new Error('암호문 형식 오류')
  const iv = all.subarray(0, 16)
  const ct = all.subarray(16)
  const key = deriveKey(password, saltHex)
  const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv)
  const dec = Buffer.concat([decipher.update(ct), decipher.final()])
  return dec.toString('utf8')
}

// 붙여넣은 원문에서 {cipher} 값을 가진 키들을 기억하고, 가독성을 위해 즉시 복호화된 본문을 생성
// - 라인 패턴 지원: "key=value" | "key: value" | YAML 인용 문자열(쌍따옴표/홑따옴표)
export function tryParseKeyedLines(
  raw: string,
  decryptFn?: (hex: string) => string
): { plain: string; rememberedKeys: Set<string> } {
  const lines = raw.split(/\r?\n/)
  const out: string[] = []
  const remembered = new Set<string>()
  const keyValRe = /^(\s*)([A-Za-z0-9_.\-\[\]]+)(\s*[:=]\s*)(.*)$/
  for (const line of lines) {
    const m = line.match(keyValRe)
    if (m) {
      const [, lead, key, sep, rhs] = m
      const trimmed = rhs.trim()
      const unquoted = trimmed.replace(/^['\"](.*)['\"]$/, '$1')
      const withoutPrefix = unquoted.startsWith('{cipher}') ? unquoted.slice(8) : unquoted
      const looksHex = /^[0-9a-fA-F]+$/.test(withoutPrefix) && withoutPrefix.length > 32
      if (unquoted.startsWith('{cipher}') && looksHex) {
        remembered.add(key)
        if (decryptFn) {
          try {
            const plain = decryptFn(withoutPrefix)
            out.push(`${lead}${key}${sep}${plain}`)
            continue
          } catch {
            // 실패 시 원문 유지
          }
        }
      }
    }
    out.push(line)
  }
  return { plain: out.join('\n'), rememberedKeys: remembered }
}

// 현재 편집 중 본문에서 rememberedKeys 의 값만 암호화하여 출력 생성
export function reEncryptRemembered(
  current: string,
  rememberedKeys: Set<string>,
  encryptFn: (text: string) => string
): string {
  const lines = current.split(/\r?\n/)
  const keyValRe = /^(\s*)([A-Za-z0-9_.\-\[\]]+)(\s*[:=]\s*)(.*)$/
  const out: string[] = []
  for (const line of lines) {
    const m = line.match(keyValRe)
    if (m) {
      const [, lead, key, sep, rhs] = m
      if (rememberedKeys.has(key)) {
        const value = rhs.trim().replace(/^['\"](.*)['\"]$/, '$1')
        const encHex = encryptFn(value)
        out.push(`${lead}${key}${sep}{cipher}${encHex}`)
        continue
      }
    }
    out.push(line)
  }
  return out.join('\n')
}

// ---------------------------------------------
// README.md (요약)
// ---------------------------------------------
# gemini.md — Electron 암·복호화 편집기

- Spring Security `Encryptors.text(password, salt)` 호환 (AES-256-CBC, PBKDF2WithHmacSHA1/1024)
- 붙여넣기(Paste) 시 자동 복호화, 원문의 암호화였던 키 목록 기억 → Cmd+S 시 해당 키들의 값만 재암호화하여 **클립보드로 복사** + 우하단 토스트 표시
- salt 기본값은 `deadbeef` (운영에서는 조직 공통 salt를 고정 권장)

## 단축키
- **Cmd/Ctrl + S**: 재암호화 & 클립보드 복사

## 주의
- 이 구현은 Spring Security *standard/CBC* 모드와 호환됩니다. Config Server가 `stronger(GCM)`를 사용 중이면 별도 구현이 필요합니다.
- 대용량/중첩 YAML 파싱이 필요한 경우 AST 파서를 붙이세요 (js-yaml 등). 현재 구현은 라인 기반입니다.


좋아요, 이렇게 가죠. Electron으로 “gemini.md” 앱을 만들고, Spring Cloud Config의 Encryptors.text(password, salt) 호환 알고리즘(AES-256-CBC + PBKDF2(HmacSHA1, 1024회, 256비트 키))로 구현했습니다. 붙여넣기 트리거, 키 기억, Cmd+S 재암호화→클립보드 복사, 우하단 토스트까지 전부 들어갔어요. 코드 전부를 캔버스에 올려두었습니다. 거기 있는 그대로 복사해 프로젝트 루트에 파일 배치하면 됩니다.

강한 의견: 운영에선 조직 고정 salt(hex) 를 반드시 정하고(기본값 deadbeef는 데모용), 앱 UI의 salt 입력란에 고정 설정하세요. Config Server가 “stronger(GCM)”을 쓰는 환경이면 CBC용 구현과 호환되지 않으니 별도의 GCM 분기를 추가해야 합니다(원하면 제가 덧붙여 드립니다). 알고리즘/형식 근거는 Spring 공식 문서/소스 흐름과 동일합니다(텍스트 모드 AES-256-CBC, PBKDF2 파라미터, {cipher} 접두 사용).  ￼ ￼

사용 방법 (요약)
	1.	캔버스의 프로젝트 구조 그대로 파일 생성 → npm install → npm run dev
	2.	상단에 encrypt key(필수)와 salt(hex) 입력
	3.	암호문이 담긴 설정을 붙여넣기 ⇒ 자동 복호화 + “원래 암호화였던 키” 자동 기억
	4.	내용 마음껏 수정
	5.	Cmd/Ctrl+S ⇒ 기억한 키들만 {cipher}<HEX>로 재암호화 → 클립보드 복사 + 우하단 토스트

구현 포인트
	•	붙여넣기 시 {cipher} 접두사를 인식하고 제거, 또는 순수 HEX(IV||CIPHER)를 감지해 복호화.
	•	.properties/YAML 라인 형태의 키=값/키: 값에서 암호화 값이던 키만 추적 저장.
	•	저장 시 그 키들만 현재 값으로 재암호화하여 {cipher}<hex>로 내보냄(원문 형식 보존 지향).
	•	Node crypto로 PBKDF2(HmacSHA1, 1024, 32바이트 키), AES-256-CBC, IV 16바이트 랜덤, 출력은 HEX(IV||CIPHER).

