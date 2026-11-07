# 情绪菜园

手机浏览器里完成：面部表情识别（位置自动确定，识别不对可在摄像头页点"调整"用转盘改）→ 选情绪/强度/特殊状态 → 听声音 → 种进校园地图。
点"确认并保存"后，记录自动发到电脑，追加为 `records.csv`（Excel / WPS 直接打开）。

- 面部识别、声音合成全在**手机本地**运行。摄像头画面只在内存里用 3.5 秒，**不录制、不保存、不上传**，识别完立即关闭摄像头。
- 只有文字记录（地点、情绪、强度、特殊状态、乐器、置信度）会发到电脑。
- 全程只需要局域网，**不需要联网、不需要隧道**（下载识别库那一步除外，只做一次）。

## 一、电脑上准备（一次）

1. 安装 Python 3（python.org，Windows 安装时勾选 *Add to PATH*）。Mac/Linux 自带 openssl；Windows 如果没有 openssl，装 Git for Windows 即可（自带）。
2. 解压本压缩包。
3. 下载识别库和模型（约 2~3 MB，只做一次）：
   ```
   python download_vendor.py
   ```
   成功后 `vendor/` 里有 `face-api.js` 和 `model/` 下 4 个文件。
   下载失败（网络原因）可手动下载，放到对应位置：
   - 在 npm 镜像（如 registry.npmmirror.com）或 jsdelivr 上找包 `@vladmandic/face-api`
   - `dist/face-api.js` → `vendor/face-api.js`
   - `model/` 下的 `tiny_face_detector_model.bin`、`tiny_face_detector_model-weights_manifest.json`、`face_expression_model.bin`、`face_expression_model-weights_manifest.json` → `vendor/model/`

## 二、启动

- Windows：双击 `start.bat`
- Mac：终端运行 `bash start.sh`（或双击 `start.command`，首次需 `chmod +x`）
- 或手动：`python server.py`

终端会显示类似：

```
电脑本机打开： https://localhost:8443/
手机打开（需与电脑同一 Wi-Fi）： https://192.168.1.23:8443/
```

首次启动会自动生成自签名证书。如果电脑换了网络（IP 变了），下次启动会自动重新生成。

## 三、手机使用

1. 手机和电脑连**同一个 Wi-Fi**（注意：有些校园网/公共 Wi-Fi 开了"AP 隔离"，设备间互相访问不了，此时用手机热点给电脑连，或让电脑开热点给手机连）。
2. 手机浏览器打开终端里显示的"手机打开"地址。首次会提示"连接不安全/证书无效"（自签名证书的正常现象）：
   - iPhone Safari：点"显示详细信息" → "访问此网站"
   - Android Chrome：点"高级" → "继续前往"
3. 想直接定位到某个地点（贴二维码用）：在地址后加 `?zone=library`，可选值：
   `class` 教学楼 · `library` 图书馆 · `dorm` 宿舍 · `canteen` 食堂 · `field` 操场 · `garden` 菜地
   例：`https://192.168.1.23:8443/?zone=canteen`
   没带 `?zone=` 时：校园坐标已配置则静默用 GPS 定位，否则随机给一个地点；摄像头页左上角的"📍 地点 · 调整"可以手动改。
   调试用：地址加 `?debug=1` 会在摄像头页多出"模拟识别 / 跳过"两个按钮（正式使用不显示）。
4. 走完流程，点"确认并保存"。电脑终端会打印"收到记录"，`records.csv` 增加一行。
5. 可选：浏览器菜单 →"添加到主屏幕"，之后全屏打开。

## 四、记录表字段（records.csv）

| 列 | 含义 |
|---|---|
| id | 记录唯一编号（手机重发时用来去重） |
| server_time | 电脑收到的时间 |
| client_time | 手机上点保存的时间（UTC） |
| zone | 地点 |
| emotion | 情绪 |
| level / solfege / stage | 强度 1~7 / 对应音名 / 植物生长阶段 |
| special | 特殊状态（无则为空） |
| instrument | 乐器 |
| confidence | 识别置信度（手动选择则为空） |
| device | 手机浏览器信息 |

## 五、常见问题

| 现象 | 处理 |
|---|---|
| 摄像头报"无法使用摄像头" | 必须用 `https://` 地址打开，并允许相机权限 |
| 摄像头提示识别库加载失败 | 没运行 `download_vendor.py`，或 `vendor/` 文件缺失 |
| 手机打不开页面 | 不在同一 Wi-Fi；电脑防火墙拦截了 8443 端口（Windows 弹窗时选"允许"）；网络有 AP 隔离 |
| iPhone 没声音 | 把侧边静音拨片拨到响铃；不要用微信内置浏览器，用 Safari |
| 保存后电脑没记录 | 页面底部会显示"待同步 N 条"，电脑开着服务器且网络恢复后每 15 秒自动重发，不会丢 |
| 终端提示 records.csv 被占用 | Excel 正开着它。关掉，或先复制一份再看；手机会自动重发 |
| 想清空数据 | 停掉服务器，删除 `records.csv` |

## 六、传到 GitHub

直接把整个文件夹提交即可。`.gitignore` 已排除 `records.csv`、证书和私钥，**数据和私钥不会被上传**。
`vendor/` 建议一并提交（这样别人 clone 后不用再下载）。

> 页面放到 GitHub Pages 的话，手机能打开页面（自带 HTTPS），但记录要发回电脑，需要电脑端有 HTTPS 地址（局域网自签名地址不行，浏览器会拦截"HTTPS 页面访问 HTTP/不受信任地址"）。
> 现场演示请直接用本方案：电脑 `server.py` 同时提供页面和接收记录。
