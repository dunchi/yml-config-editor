# gemini.md — Electron 암·복호화 편집기

- Spring Security `Encryptors.text(password, salt)` 호환 (AES-256-CBC, PBKDF2WithHmacSHA1/1024)
- 붙여넣기(Paste) 시 자동 복호화, 원문의 암호화였던 키 목록 기억 → Cmd+S 시 해당 키들의 값만 재암호화하여 **클립보드로 복사** + 우하단 토스트 표시
- salt 기본값은 `deadbeef` (운영에서는 조직 공통 salt를 고정 권장)

## 단축키
- **Cmd/Ctrl + S**: 재암호화 & 클립보드 복사

## 주의
- 이 구현은 Spring Security *standard/CBC* 모드와 호환됩니다. Config Server가 `stronger(GCM)`를 사용 중이면 별도 구현이 필요합니다.
- 대용량/중첩 YAML 파싱이 필요한 경우 AST 파서를 붙이세요 (js-yaml 등). 현재 구현은 라인 기반입니다.