# D 档案方向：功能模块稿

状态：本地可运行的交互设计原型，非正式产品。主题已确认，模块排版仍待用户评审。

## 查看

在本目录启动：

```sh
python3 -m http.server 7300 --bind 127.0.0.1
```

- 模块对照：`http://127.0.0.1:7300/review.html`
- 可操作页面：`http://127.0.0.1:7300/?page=home`
- 页面参数：home、archive、tech、recipe、thought、about、404。
- 直接以 file 协议打开 index.html 会受到浏览器模块限制，使用本地 HTTP 预览。
- 127.0.0.1 是本机预览，不是远程或手机可访问的已发布站点。

## 验证

```sh
node --check app.js
node --check pages.js
node --check data.js
node validate.mjs
node capture-states.mjs
```

验证脚本默认复用同项目 Kimi 原型已存在的 Playwright 安装；也可设置 `MODULE_DESIGN_PLAYWRIGHT` 指向其他本机 `playwright/index.mjs`。浏览器运行依赖需已存在；网站本身没有 npm 运行依赖。

`validate.mjs` 可用 `MODULE_DESIGN_URL` 更换本地服务地址；capture-states.mjs 当前使用 7300，变更端口时同步修改脚本。

证据：`previews/validation.json`，各模块 desktop/mobile 截图、五张对照图、搜索/菜单/目录/表格/菜谱步骤状态图。

## 内容与资产

data.js 是六条公开合成记录。pages.js 是设计模板，不是正式 Markdown 解析器。没有登录、私密内容和部署系统。

assets/mapo-tofu.png 是独立生成的照片示例；原始提示词在 assets/照片提示词.md。尚未进行生产级资源优化，不将本地加载速度当性能成绩。

更多说明见 [交付说明](交付说明.md)和[模块设计说明](../../../docs/design/模块页面设计-v1.0.md)。
