# Next.js正式站点

已建立Next App Router，生产构建输出standalone。当前已接入首页、归档、公开搜索、三类阅读、关于/404、移动导航与隔离主人空间，参见[Demo手册](../../scripts/demo/README.md)。

- src/app：路由、元数据、全局CSS与有限同域API代理，由集成者维护。
- src/layouts、components：站点壳、导航和通用交互。
- src/features/reader：服务端正文、目录、代码复制、图片查看。
- src/features/records、search：发现、筛选与公开检索。
- src/features/owner、server：主人展示和受控API适配；业务/授权由Nest负责，不在Next复制。

正文和授权结果来自Nest，不读取私密目录。品牌与历史原型在design，当前正式运行证据在docs/project/evidence/DEMO-001。真实身份、iPhone与性能预算/生产仍有未完成项，不将Demo自检升级为正式发布通过。
