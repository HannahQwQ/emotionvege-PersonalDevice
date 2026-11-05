@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not exist vendor\face-api.js (
  echo 首次运行：正在下载识别库和模型...
  python download_vendor.py
)
python server.py
pause
