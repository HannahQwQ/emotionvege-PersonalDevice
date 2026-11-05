#!/bin/bash
cd "$(dirname "$0")"
[ -f vendor/face-api.js ] || { echo "首次运行：正在下载识别库和模型..."; python3 download_vendor.py; }
python3 server.py
