import './types.js'

const decryptInput = document.getElementById('decrypt-input') as HTMLTextAreaElement
const decryptOutput = document.getElementById('decrypt-output') as HTMLTextAreaElement

function getCryptoParams() {
  const password = 'nice7700@!' // 고정된 비밀번호
  const salt = 'deadbeef' // 고정된 salt
  return { password, salt }
}

// 복호화 입력 이벤트
decryptInput.addEventListener('input', async () => {
  const text = decryptInput.value.trim()
  if (!text) {
    decryptOutput.value = ''
    return
  }
  
  try {
    const { password, salt } = getCryptoParams()
    const decrypted = await window.gemini.decrypt(text, password, salt)
    decryptOutput.value = decrypted
  } catch (err: any) {
    decryptOutput.value = '오류: ' + (err?.message ?? '복호화 실패')
  }
})

// 포커스를 첫 번째 입력 필드에 설정
decryptInput.focus()

export {}
