# 有迹网站图标

2026-10-30 / BRAND-002。用户认可前轮Logo，并要求网站icon更醒目；本轮专用icon等待反馈。

深橄榄#29352C实底，纸白#F0F0E8标记；增粗笔画、扩大主体。继承原Logo的档案边角、y笔迹和记录点。由SVG实际渲染，无外部字体或图片。

- favicon.svg：现代浏览器，透明圆角外部。
- favicon.ico：16/32/48像素多尺寸，用于兼容浏览器。
- favicon-16/32/48/64/192/512.png：固定尺寸PNG。
- apple-touch-icon.png：180×180不透明正方形，让iOS系统处理外形遮罩。
- apple-touch-icon.svg：对应可编辑源文件。

正式站点接入时，将文件复制到公开静态资源目录，再设置下列页面元信息。此次仅交付资产，未创建正式应用或修改旧模块原型。

```html
<link rel="icon" href="/favicon.ico" sizes="any">
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/apple-touch-icon.png" sizes="180x180">
```

已检查ICO包含三个尺寸、PNG尺寸和iOS图标实底，实际查看静态展示中的16/32/64px样张；浏览器安装与iPhone真机尚未验证。生成脚本在上一层目录的上一层。
