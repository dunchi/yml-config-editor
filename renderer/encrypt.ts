import './types.js'

const encryptInput = document.getElementById('encrypt-input') as HTMLTextAreaElement
const encryptOutput = document.getElementById('encrypt-output') as HTMLTextAreaElement

function getCryptoParams() {
  const password = 'nice7700@!' // 고정된 비밀번호
  const salt = 'deadbeef' // 고정된 salt
  return { password, salt }
}

// 암호화 입력 이벤트
encryptInput.addEventListener('input', async () => {
  const text = encryptInput.value.trim()
  if (!text) {
    encryptOutput.value = ''
    return
  }
  
  try {
    const { password, salt } = getCryptoParams()
    const encrypted = await window.gemini.encrypt(text, password, salt)
    encryptOutput.value = `{cipher}${encrypted}`
  } catch (err: any) {
    encryptOutput.value = '오류: ' + (err?.message ?? '암호화 실패')
  }
})

// 포커스를 첫 번째 입력 필드에 설정
encryptInput.focus()

export {}
