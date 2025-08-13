const $ = (sel) => document.querySelector(sel);
const keyInput = $('#key');
const saltInput = $('#salt');
const editor = $('#editor');
const toast = $('#toast');
// 기억한 키들: 사용자가 paste로 넣었을 때 {cipher} 값이었던 키 목록
let rememberedKeys = new Set();
function showToast(msg) {
    toast.textContent = msg;
    toast.classList.add('show');
    setTimeout(() => toast.classList.remove('show'), 2200);
}
function getCryptoParams() {
    const password = keyInput.value.trim();
    if (!password)
        throw new Error('encrypt key를 입력하세요');
    let salt = saltInput.value.trim();
    if (!salt)
        salt = 'deadbeef'; // 운영에서는 조직 고정 salt를 명시 입력 권장
    if (!/^[0-9a-fA-F]+$/.test(salt))
        throw new Error('salt는 hex 문자열이어야 합니다');
    return { password, salt: salt.toLowerCase() };
}
// Paste 트리거: 붙여넣는 텍스트를 자동 복호화 & 키 기억
editor.addEventListener('paste', async (e) => {
    console.log('Paste event triggered.'); // Added log
    try {
        const { password, salt } = getCryptoParams();
        console.log('Crypto params:', { password: password ? '***' : 'N/A', salt }); // Added log
        const data = e.clipboardData?.getData('text') ?? '';
        console.log('Pasted data:', data); // Added log
        if (!data) {
            console.log('No data pasted, returning.'); // Added log
            return;
        }
        // 자동 감지: {cipher} 접두사 제거
        const stripped = data.trim().startsWith('{cipher}') ? data.trim().slice(8) : data.trim();
        console.log('Stripped data (after {cipher} check):', stripped); // Added log
        // 만약 HEX와 공백으로만 이루어져 있다면 단일 암호문으로 간주 (key: value 형식과 구분)
        const hexLike = /^[0-9a-fA-F\s]+$/.test(stripped) && stripped.length > 32;
        console.log('hexLike (single blob check):', hexLike); // Added log
        if (hexLike) {
            e.preventDefault();
            console.log('Attempting single blob decryption...'); // Added log
            const plain = await window.gemini.decrypt(stripped.replace(/\s+/g, ''), password, salt);
            console.log('Single blob decrypted plain text:', plain); // Added log
            editor.value = plain;
            // 단일 값의 경우 키가 없으므로 rememberedKeys는 비어있게 됨
            const { rememberedKeys: keys } = await window.gemini.parseKeysOnly(data);
            rememberedKeys = new Set(keys); // IPC는 배열을 반환하므로 Set으로 변환
            console.log('Remembered keys (single blob):', rememberedKeys); // Added log
        }
        else {
            console.log('Attempting multi-line/keyed decryption...'); // Added log
            // 파일/문서 형태: 각 라인에서 {cipher} 또는 순수 hex 감지 → 부분 복호화 및 키 기억
            const { plain, rememberedKeys: keys } = await window.gemini.parseAndDecrypt(data, password, salt);
            console.log('Multi-line decrypted plain text:', plain); // Added log
            console.log('Remembered keys (multi-line):', keys); // Added log
            // 복호화가 일어나 원문이 변경된 경우에만 UI를 업데이트
            if (plain !== data) {
                console.log('Plain text changed, preventing default paste and updating editor.'); // Added log
                e.preventDefault();
                editor.value = plain;
                rememberedKeys = new Set(keys); // IPC는 배열을 반환하므로 Set으로 변환
            }
            else {
                console.log('Plain text did not change, allowing default paste (or no change needed).'); // Added log
            }
        }
    }
    catch (err) {
        console.error('Error during paste event:', err); // Added log
        // getCryptoParams() 실패 등 주요 오류는 사용자에게 알림
        if (err.message.includes('encrypt key') || err.message.includes('salt')) {
            showToast('오류: ' + err.message);
        }
        // 그 외 암호문 형식 오류 등은 그냥 붙여넣기 되도록 허용 (기존 동작 유지)
    }
});
// Cmd+S 저장 → 기억한 키 값만 재암호화하여 클립보드로 복사 + 토스트
window.addEventListener('keydown', async (e) => {
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') {
        e.preventDefault();
        try {
            const { password, salt } = getCryptoParams();
            const output = await window.gemini.reEncrypt(editor.value, Array.from(rememberedKeys), password, salt);
            await window.gemini.writeClipboard(output);
            showToast('암호화되어 클립보드에 복사했습니다.');
        }
        catch (err) {
            showToast('오류: ' + (err?.message ?? '암호화 실패'));
        }
    }
});
export {};
