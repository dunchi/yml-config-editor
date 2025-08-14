import './types.js'
import type { FileTreeItem } from './types.js'

const $ = (sel: string) => document.querySelector(sel) as HTMLElement

const editor = $('#editor') as HTMLTextAreaElement
const toast = $('#toast') as HTMLDivElement
const fileTree = $('#file-tree') as HTMLDivElement
const refreshBtn = $('#refresh-btn') as HTMLButtonElement

// 헤더 버튼들
const encryptBtn = $('#encrypt-btn') as HTMLButtonElement
const decryptBtn = $('#decrypt-btn') as HTMLButtonElement

// 기억한 키들: 사용자가 paste로 넣었을 때 {cipher} 값이었던 키 목록
let rememberedKeys: Set<string> = new Set()

function showToast(msg: string) {
  toast.textContent = msg
  toast.classList.add('show')
  setTimeout(() => toast.classList.remove('show'), 2200)
}

function getCryptoParams() {
  const password = 'nice7700@!' // 고정된 비밀번호
  const salt = 'deadbeef' // 고정된 salt
  return { password, salt }
}

// 파일 트리 렌더링
function renderFileTree(items: FileTreeItem[], container: HTMLElement) {
  container.innerHTML = ''
  
  if (!items || items.length === 0) {
    container.innerHTML = '<div style="padding: 16px; color: #6b7280;">파일이 없습니다.</div>'
    return
  }

  items.forEach(item => {
    const itemEl = document.createElement('div')
    itemEl.className = `tree-item ${item.type}`
    itemEl.textContent = item.name
    itemEl.setAttribute('data-path', item.path)
    
    if (item.type === 'file') {
      itemEl.addEventListener('dblclick', async () => {
        await openFile(item.path)
      })
    }
    
    container.appendChild(itemEl)
    
    if (item.type === 'directory' && item.children && item.children.length > 0) {
      const childrenContainer = document.createElement('div')
      childrenContainer.className = 'tree-children'
      renderFileTree(item.children, childrenContainer)
      container.appendChild(childrenContainer)
    }
  })
}

// 파일 열기 및 복호화
async function openFile(filePath: string) {
  try {
    showToast('파일을 읽는 중...')
    const content = await window.gemini.readRepositoryFile(filePath)
    
    // 파일 내용을 복호화 시도
    const { password, salt } = getCryptoParams()
    const { plain, rememberedKeys: keys } = await window.gemini.parseAndDecrypt(content, password, salt)
    
    editor.value = plain
    rememberedKeys = new Set(keys)
    
    showToast(`파일 "${filePath}"을 열었습니다.`)
  } catch (error: any) {
    showToast('파일 읽기 실패: ' + (error?.message ?? '알 수 없는 오류'))
  }
}

// 파일 트리 새로고침
async function refreshFileTree() {
  try {
    fileTree.innerHTML = 'Loading...'
    const files = await window.gemini.refreshRepository()
    renderFileTree(files, fileTree)
  } catch (error: any) {
    fileTree.innerHTML = '<div style="padding: 16px; color: #ef4444;">로드 실패</div>'
    showToast('파일 목록 새로고침 실패: ' + (error?.message ?? '알 수 없는 오류'))
  }
}

// 초기 파일 트리 로드
async function loadInitialFileTree() {
  try {
    const files = await window.gemini.getRepositoryFiles()
    renderFileTree(files, fileTree)
  } catch (error: any) {
    fileTree.innerHTML = '<div style="padding: 16px; color: #ef4444;">로드 실패</div>'
  }
}

// 이벤트 리스너들
refreshBtn.addEventListener('click', refreshFileTree)

// 버튼 이벤트 핸들러
encryptBtn.addEventListener('click', async () => {
  await window.gemini.openEncrypt()
})

decryptBtn.addEventListener('click', async () => {
  await window.gemini.openDecrypt()
})

// 페이지 로드 시 파일 트리 초기화
document.addEventListener('DOMContentLoaded', loadInitialFileTree)

// Paste 트리거: 붙여넣는 텍스트를 자동 복호화 & 키 기억
editor.addEventListener('paste', async (e: ClipboardEvent) => {
  console.log('Paste event triggered.'); // Added log
  try {
    const { password, salt } = getCryptoParams()
    console.log('Crypto params:', { password: password ? '***' : 'N/A', salt }); // Added log
    const data = e.clipboardData?.getData('text') ?? ''
    console.log('Pasted data:', data); // Added log
    if (!data) {
      console.log('No data pasted, returning.'); // Added log
      return
    }

    // 자동 감지: {cipher} 접두사 제거
    const stripped = data.trim().startsWith('{cipher}') ? data.trim().slice(8) : data.trim()
    console.log('Stripped data (after {cipher} check):', stripped); // Added log
    
    // 만약 HEX와 공백으로만 이루어져 있다면 단일 암호문으로 간주 (key: value 형식과 구분)
    const hexLike = /^[0-9a-fA-F\s]+$/.test(stripped) && stripped.length > 32
    console.log('hexLike (single blob check):', hexLike); // Added log

    if (hexLike) {
      e.preventDefault()
      console.log('Attempting single blob decryption...'); // Added log
      const plain = await window.gemini.decrypt(stripped.replace(/\s+/g, ''), password, salt)
      console.log('Single blob decrypted plain text:', plain); // Added log
      editor.value = plain
      // 단일 값의 경우 키가 없으므로 rememberedKeys는 비어있게 됨
      const { rememberedKeys: keys } = await window.gemini.parseKeysOnly(data)
      rememberedKeys = new Set(keys) // IPC는 배열을 반환하므로 Set으로 변환
      console.log('Remembered keys (single blob):', rememberedKeys); // Added log
    } else {
      console.log('Attempting multi-line/keyed decryption...'); // Added log
      // 파일/문서 형태: 각 라인에서 {cipher} 또는 순수 hex 감지 → 부분 복호화 및 키 기억
      const { plain, rememberedKeys: keys } = await window.gemini.parseAndDecrypt(data, password, salt)
      console.log('Multi-line decrypted plain text:', plain); // Added log
      console.log('Remembered keys (multi-line):', keys); // Added log
      
      // 복호화가 일어나 원문이 변경된 경우에만 UI를 업데이트
      if (plain !== data) {
        console.log('Plain text changed, preventing default paste and updating editor.'); // Added log
        e.preventDefault()
        editor.value = plain
        rememberedKeys = new Set(keys) // IPC는 배열을 반환하므로 Set으로 변환
      } else {
        console.log('Plain text did not change, allowing default paste (or no change needed).'); // Added log
      }
    }
  } catch (err: any) {
    console.error('Error during paste event:', err); // Added log
    // 암호문 형식 오류 등은 그냥 붙여넣기 되도록 허용 (기존 동작 유지)
  }
})

// Cmd+S 저장 → 기억한 키 값만 재암호화하여 클립보드로 복사 + 토스트
window.addEventListener('keydown', async (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    try {
      const { password, salt } = getCryptoParams()
      const output = await window.gemini.reEncrypt(editor.value, Array.from(rememberedKeys), password, salt)
      await window.gemini.writeClipboard(output)
      showToast('암호화되어 클립보드에 복사했습니다.')
    } catch (err: any) {
      showToast('오류: ' + (err?.message ?? '암호화 실패'))
    }
  }
})

export {}