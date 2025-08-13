import crypto from 'node:crypto';
// PBKDF2(HmacSHA1), iterations=1024, keylen=32 (256-bit)
function deriveKey(password, saltHex) {
    const salt = Buffer.from(saltHex, 'hex');
    return crypto.pbkdf2Sync(password, salt, 1024, 32, 'sha1');
}
// AES-256-CBC, IV=16 bytes random; 출력: hex(iv || cipher)
export function springEncrypt(plain, password, saltHex) {
    const key = deriveKey(password, saltHex);
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
    const enc = Buffer.concat([cipher.update(Buffer.from(plain, 'utf8')), cipher.final()]);
    return Buffer.concat([iv, enc]).toString('hex');
}
// 입력: "{cipher}" 접두사 가능, 또는 순수 hex(iv||cipher)
export function springDecrypt(cipherText, password, saltHex) {
    console.log('springDecrypt called with:', { cipherText: cipherText.substring(0, 20) + '...', password: password ? '***' : 'N/A', saltHex }); // Added log
    const hex = cipherText.trim().startsWith('{cipher}') ? cipherText.trim().slice(8) : cipherText.trim();
    console.log('springDecrypt - hex after prefix removal:', hex.substring(0, 20) + '...'); // Added log
    const all = Buffer.from(hex, 'hex');
    if (all.length <= 16)
        throw new Error('암호문 형식 오류');
    const iv = all.subarray(0, 16);
    const ct = all.subarray(16);
    const key = deriveKey(password, saltHex);
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    const dec = Buffer.concat([decipher.update(ct), decipher.final()]);
    console.log('springDecrypt - decryption successful.'); // Added log
    return dec.toString('utf8');
}
// 붙여넣은 원문에서 {cipher} 값을 가진 키들을 기억하고, 가독성을 위해 즉시 복호화된 본문을 생성
// - 라인 패턴 지원: "key=value" | "key: value" | YAML 인용 문자열(쌍따옴표/홑따옴표)
export function tryParseKeyedLines(raw, decryptFn) {
    console.log('tryParseKeyedLines called with raw data (first 100 chars):', raw.substring(0, 100) + '...'); // Added log
    const lines = raw.split(/\r?\n/);
    const out = [];
    const remembered = new Set();
    const keyValRe = /^(\s*)([A-Za-z0-9_.\-\w\[\]]+)(\s*[:=]\s*)(.*)$/;
    for (const line of lines) {
        const m = line.match(keyValRe);
        if (m) {
            const [, lead, key, sep, rhs] = m;
            const trimmed = rhs.trim();
            const unquoted = trimmed.replace(/^['"](.*)['"]$/, '$1');
            const isCipherPrefixed = unquoted.startsWith('{cipher}');
            const withoutPrefix = isCipherPrefixed ? unquoted.slice(8) : unquoted;
            const looksHex = /^[0-9a-fA-F]+$/.test(withoutPrefix) && withoutPrefix.length > 32;
            console.log(`  Line: "${line.substring(0, 50)}"... Key: "${key}", looksHex: ${looksHex}, isCipherPrefixed: ${isCipherPrefixed}`); // Added log
            if (looksHex) {
                if (isCipherPrefixed) {
                    remembered.add(key);
                    console.log(`    Remembered key: ${key}`); // Added log
                }
                if (decryptFn) {
                    try {
                        console.log(`    Attempting decryption for key "${key}"...`); // Added log
                        const plain = decryptFn(withoutPrefix);
                        out.push(`${lead}${key}${sep}${plain}`);
                        console.log(`    Decryption successful for key "${key}".`); // Added log
                        continue;
                    }
                    catch (e) {
                        console.error(`    Decryption failed for key "${key}":`, e); // Added log
                        // 실패 시 원문 유지
                    }
                }
            }
        }
        out.push(line);
    }
    console.log('tryParseKeyedLines finished. Remembered keys:', remembered); // Added log
    return { plain: out.join('\n'), rememberedKeys: remembered };
}
// 현재 편집 중 본문에서 rememberedKeys 의 값만 암호화하여 출력 생성
export function reEncryptRemembered(current, rememberedKeys, encryptFn) {
    const lines = current.split(/\r?\n/);
    const keyValRe = /^(\s*)([A-Za-z0-9_.\-\[\]]+)(\s*[:=]\s*)(.*)$/;
    const out = [];
    for (const line of lines) {
        const m = line.match(keyValRe);
        if (m) {
            const [, lead, key, sep, rhs] = m;
            if (rememberedKeys.has(key)) {
                const value = rhs.trim().replace(/^['"](.*)['"]$/, '$1');
                const encHex = encryptFn(value);
                out.push(`${lead}${key}${sep}{cipher}${encHex}`);
                continue;
            }
        }
        out.push(line);
    }
    return out.join('\n');
}
