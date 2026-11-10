# Vege Motion 交接说明

44 株来自指定 approved-chili-individuals 目录的原始植物，5 款动效，共 220 个透明背景动画 WebP。原网页没有被修改。单株 ID、源文件名、情绪与来源地址见 catalog.json；44 株各有一份 profiles.json 定位，不能共用一组眼睛或帽子坐标。

## 1. 推荐接入：直接使用预先导出的动画

从 Vege Motion 网页下载「全部 220 个动效」，解压后有 animations/{植物ID}/{动作}.webp。把 animations 目录放进项目静态资源目录即可：

```html
<img src="/animations/eggplant-07/tired.webp" width="240" height="240" alt="疲惫的茄子">
```

WebP 是透明背景、循环播放的动画，支持当前 Chrome、Safari、Firefox 和 Edge。棋盘格只是预览背景，没有烘焙到动画里。文件实际尺寸都是 480×480。按容器缩放，避免非等比拉伸。

动作编号：01 crazy 发疯；02 luck 接好运；03 wave 浪；04 tired 疲惫；05 brick 搬砖。时长依次 540、2560、1600、2040、1680 毫秒。

同一植物换动作只换文件名；换植物换完整 ID。例：eggplant-07 是「精疲力竭」，不是 eggplant-01 的颜色替换。44 株包含辣椒10、玉米9、蘑菇7、茄子9、白菜9。以本包 catalog.json 为准。

## 2. 可选图片播放器

adapter.js 的导出目录约定为 exports/（完整下载包解压出的 animations/ 可改名为 exports/），暂停海报放 posters/。源码包包含渲染源码、原图、定位、纹理、暂停海报和说明；220 个动画从网页单独下载，避免同一套大文件重复。

```html
<div id="plant"></div>
<script src="/vege-motion/adapter.js"></script>
<script>
const player = VegeMotionPlayer.mount(document.querySelector('#plant'), {
  base: '/vege-motion/', plant: 'eggplant-07', motion: 'tired', size: 240
});
player.set('cabbage-05', 'brick');
// player.pause(); player.play(); player.destroy();
</script>
```

如果不使用暂停功能，不必部署 posters/。大量卡片同时出现时，只播放可见区域的动画，其他卡片用静态图片，避免同时运行 220 个解码器。

## 3. 可复用实时渲染源码

engine.js、catalog.json、profiles.json、plants/、fx/ 必须保持同级相对路径。无需 npm 包、框架、联网字体或后端。用本地 HTTP 服务打开 render.html（不支持直接 file:// 读取 JSON）：

```sh
python -m http.server 8080
```

```html
<canvas id="motion" width="480" height="480"></canvas>
<script src="engine.js"></script>
<script>
(async () => {
  const renderer = await VegeMotion.create(document.querySelector('#motion'), {base:'./'});
  await renderer.select('eggplant-07');
  const start = performance.now();
  function frame(now) {
    renderer.draw('tired', (now-start)/1000);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
})();
</script>
```

render.html?plant=eggplant-07&motion=tired&guides=1 可以看眼睛/眼下/帽檐定位辅助线。不要给正式播放加 guides。原图保留；44株植物的搬砖状态使用工帽融合专用图，其余状态继续使用原图。

## 4. 以后增加植物

44 株已经逐张设定。新增植物应在 catalog.json 中添加记录，将透明 PNG 放 plants/，并在 profiles.json 为新 ID 添加定位。

定位全部采用「裁透明边并加8像素余量后的植物图」归一化坐标（左上0,0；右下1,1），不是480画布坐标。eyes 是实际眼睛中心（不是眉毛）；head 是帽檐接触位置；hatWidth 是相对植物图显示宽度；hatAngle 是弧度。shadowOffset、shadowRadius、shadowAngle、shadowOpacity 用于眼下阴影；base 是海浪支撑点。shadowClip=false 仅用于透明空心轮廓等特殊图；protectWhiteEyes 用于白色眼球；foreground 用于需要保留在帽前的原有光环等装饰。

换图片尺寸、裁剪或轮廓后必须重新测量，不能保证任意新植物自动正确。只替换 image 路径会保留旧坐标，容易再次出现黑眼圈错位和帽子悬空。

## 5. 核对与参考

references/ 是用户给的五个原始 GIF。manifest.json 列出220项、时长、帧数、文件大小和渲染输入指纹。qa/check-report.json 记录解码、透明度、帧数/时长、输入指纹与定位几何检查结果；qa/*-proof.png 是五款在0%、25%、50%进度的检查图。解码检查和视觉检查分别记录，不能把能播放当成视觉完全相同。

源码中的金光为清理辣椒残影后重建的光束、绿色震动线/音符/墨镜为独立图层，海浪、安全帽、电脑、汗滴、Zzz 等保留原始参考的独立纹理。可替换植物的动画并非原始 GIF 的逐像素复制：原参考本身包含辣椒；本次保留动作语义与节奏，为不同轮廓单独调整配件。

原目标网页： https://hannahqwq.github.io/emuge-PersonalDevice/
本次只交付独立动效资源和预览站，不改动目标网页。

预览与整套下载： https://plant-motion-gif-preview-nov9.nice-wasp-5723.chatgpt.site/
整套下载的 ZIP 同时包含 source/vege-motion-source.zip，可直接把一个 ZIP 转交。

## 6. 重新导出（可选）

安装 Python 依赖和 Playwright Chromium，先在包目录启动 HTTP 服务：

```sh
pip install -r requirements.txt
playwright install chromium
python -m http.server 8080
```

另一个终端运行 `python export-animations.py` 导出全部；或 `python export-animations.py eggplant-07` 只导出指定植物。Linux 若没有 `/usr/bin/chromium`，将脚本中的 `executable_path='/usr/bin/chromium'` 删除即可使用 Playwright 安装的 Chromium。自定义服务地址用 `VEGE_MOTION_URL=http://127.0.0.1:8080/`。导出后运行 `python check-exports.py` 校验实际文件。生成的 `exports/` 可直接部署；与整套 ZIP 的 `animations/` 是同一批资源，只是目录名不同。


新版针对截图指出的10株使用 profiles.json 中的 eyeShadows 数组：每只眼睛独立 center、radius、angle、opacity，均为植物图自身的归一化坐标。它覆盖默认 shadowOffset，适用于闭眼、挤眼、星星眼和左右不对称的情况。倾倒时和原植物一起旋转。shadowProtectWhites 用于保护牙齿等白色五官，浅色白菜未开启该选项，避免把浅色皮肤上的阴影误删。
好运按原始GIF重新对齐大/小闪星和右下闪星，四叶草从底部沿曲线上飘；光束使用独立的金色纹理，起始透明渐显。

上一轮修正：所有疲惫阴影使用像素空间的柔边圆形（radiusX×图宽=radiusY×图高）；白菜07、茄子07、玉米09分别定位。海浪整张放在植物前景，不作矩形裁切；植物底部随白色浪沿上下浮动，幼年茄子有独立入水深度上限。玉米安全帽下移，茄子帽檐位于绿色茎下；所有搬砖面部投光各有screenQuad和screenStrength，方形透视边缘略柔化，按面部曲率与原图纹理调节，使用screen混合。汗滴宽度90px。


## 本轮更新：44株工帽融合、电脑面光与前倾滑低

- 全部44株搬砖形象使用 `brick-actors/{id}.webp`：工帽与头部融合，带接触阴影和正确遮挡。原始植物继续保存在 `plants/`，其余四款使用原图。带蓝色光环的白菜03保留完整光环，光环在工帽前方；其他原有泪滴、星星眼、派对道具与爆炸细节保留。
- `brick-rigs.json` 独立记录44张专用图的新眼睛、帽檐、显示高度和投光区域。`engine.js` 只在 brick 状态加载对应形象，`hatBaked:true` 防止重复画帽。不可只换图不换坐标。
- 按原始 `brick.gif` 的1.68秒循环补回前倾滑低：按标准GIF逐帧测量的倾角与位移曲线前倾滑低、再恢复，身体长宽比例全程不变；植物与融合工帽同一变换，电脑保持固定桌面位置。原有表情不替换。
- 44株搬砖面光采用屏幕方向的冷白面积光：矩形投射区域带宽柔边，亮度向右下屏幕方向增强，按原素材明暗调节，在植物透明轮廓内合成，保留表情和材质。
- 白菜07「平衡」黑眼圈参照白菜08「安详」的相对半径和透明度，在自己的闭眼下方重新定位。
- 其余132个发疯、接好运、浪动图保留原文件。`engines/motion4-preserved.js` / `motion4-profiles.json` 与 `engines/motion5-preserved.js` 记录保留输出的生成版本；`input-digest.py` 对新导出记录引擎、定位、融合图与效果纹理。
- `qa/motion6-check.json` 记录保留文件SHA-256、非搬砖渲染回归、面光透明边界、滑低幅度、固定电脑及真实电脑图层眼部遮挡检查。视觉审核采用抽样阶段。
- 源码包包含全部运行所需图片、配件、定位、暂停海报及五个原始参考GIF。原始未裁图库另打包为 `vege-motion-originals.zip`，完整220动效下载会同时放入这个原图备份；备份不影响运行，渲染使用的44株规范化原图已经在 `plants/`。


## 两款动作按原始标准重新校正（motion7）

搬砖使用 `brick.gif` 的12阶段位移、倾角曲线。身体和融合工帽一起作刚性旋转/平移，sx=sy=1，不再通过纵向缩放实现下滑。电脑保持固定，脸部面光与植物一起定位。

疲惫使用 `tired.gif` 的12阶段侧伏曲线。身体缓慢下沉，轻微变形，最后保持侧伏姿态；每株的tiredAngleScale、tiredNarrow、tiredStretch单独记录倾角和微形变，宽矮植物减小侧伏幅度，保持向下瘫软。按实际透明轮廓落地，避免按图片空白角定位导致悬浮；黑眼圈和原表情随同一变换。

`qa/motion7-reference-curves.json` 记录两个标准GIF的SHA-256及测得曲线；`qa/motion7-check.json` 记录132个其他动图保留、搬砖等比、疲惫微形变与实际轮廓支撑检查。44株搬砖与44株疲惫均重新导出。


## 疲惫Zzz最终定位（motion8）

44株疲惫的Zzz改为围绕当前头部定位，随植物下沉、侧伏一起移动。只裁掉原纹理中的透明行程空白，保留原Z字形、出现时序和透明度；完整Zzz组最大宽112px，比上一版实际字形宽约83px增大约35%。额外上飘范围限制在6px，字形与植物轮廓保持小间距，自动避开脸部与画布边界。其余身体姿态、黑眼圈和四款动效保留。

`qa/motion8-check.json` 记录所有疲惫帧的Zzz/植物像素间距、遮挡、边界、局部飘移，以及176个其他动图文件保持不变的检查。
