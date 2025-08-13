#!/bin/bash

# 현재 스크립트가 있는 디렉토리로 이동
cd "$(dirname "$0")"

echo "YML Config Editor.app을 생성합니다..."

# 현재 디렉토리의 절대 경로 가져오기
PROJECT_DIR=$(pwd)

# AppleScript 임시 파일 생성 (PATH 설정 포함, 전면 실행)
cat > /tmp/yml_config_editor_launcher.scpt << EOF
do shell script "export PATH=\"/usr/local/bin:/opt/homebrew/bin:\$PATH\"; cd '$PROJECT_DIR' && npm run dev"
EOF

# AppleScript를 앱으로 컴파일
osacompile -o ~/config.app /tmp/yml_config_editor_launcher.scpt

# 임시 파일 삭제
rm /tmp/yml_config_editor_launcher.scpt

echo "config.app이 홈 디렉토리(~)에 생성되었습니다."
echo "더블클릭하여 YML Config Editor를 실행할 수 있습니다 (Terminal 앱 없이 실행됩니다)."

# 터미널 창을 5초 후에 자동으로 닫기
echo "5초 후 창이 닫힙니다..."
sleep 5