#!/usr/bin/env python3
"""下载 face-api 识别库和表情模型到 vendor/（只需运行一次，约 2~3 MB）。
依次尝试多个国内可用的镜像，哪个通用哪个。"""
import os, sys, urllib.request

ROOT = os.path.dirname(os.path.abspath(__file__))
PKG = '@vladmandic/face-api'
FILES = [  # (包内路径, 本地路径, 最小合理大小)
    ('dist/face-api.js', 'vendor/face-api.js', 300_000),
    ('model/tiny_face_detector_model.bin', 'vendor/model/tiny_face_detector_model.bin', 100_000),
    ('model/tiny_face_detector_model-weights_manifest.json', 'vendor/model/tiny_face_detector_model-weights_manifest.json', 200),
    ('model/face_expression_model.bin', 'vendor/model/face_expression_model.bin', 100_000),
    ('model/face_expression_model-weights_manifest.json', 'vendor/model/face_expression_model-weights_manifest.json', 200),
]
MIRRORS = [
    'https://registry.npmmirror.com/{pkg}/latest/files/{path}',
    'https://cdn.jsdmirror.com/npm/{pkg}/{path}',
    'https://fastly.jsdelivr.net/npm/{pkg}/{path}',
    'https://gcore.jsdelivr.net/npm/{pkg}/{path}',
    'https://cdn.jsdelivr.net/npm/{pkg}/{path}',
    'https://unpkg.com/{pkg}/{path}',
]

def fetch(url):
    req = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(req, timeout=40) as r:
        return r.read()

ok_all = True
for path, local, minsize in FILES:
    dst = os.path.join(ROOT, local)
    os.makedirs(os.path.dirname(dst), exist_ok=True)
    if os.path.exists(dst) and os.path.getsize(dst) >= minsize:
        print('已存在，跳过：', local); continue
    done = False
    for m in MIRRORS:
        url = m.format(pkg=PKG, path=path)
        try:
            data = fetch(url)
            if len(data) < minsize:
                raise ValueError('文件过小(%d)' % len(data))
            open(dst, 'wb').write(data)
            print('OK  %-55s %7.1f KB  <- %s' % (local, len(data) / 1024, url.split('/')[2]))
            done = True; break
        except Exception as e:
            print('..  %s 失败：%s' % (url.split('/')[2], e))
    if not done:
        ok_all = False
        print('!!  无法下载', local)
print('\n全部完成 ✔' if ok_all else '\n有文件下载失败：请换个网络/开代理后重试，或手动下载，见 README')
sys.exit(0 if ok_all else 1)
