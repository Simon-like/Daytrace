# 应用协作边界

先读根AGENTS、中央任务卡、PRD、视觉基线。只在已认领任务允许范围内写文件。

模块Agent主要修改自身features目录；跨模块入口、路由、共享styles/components/layouts、依赖和锁文件由集成者串行合并。需要共享接口变动时先记录契约和影响，不暗改其他模块。

用户已确认Next.js + NestJS + monorepo，TypeScript/pnpm workspace为实施基线。ENGINE-001统一创建正式工程并锁版本，禁止重新选框架或自主生成另一套入口。src/app及共享布局/配置由集成者维护。src/server只作Nest API适配与必要会话转发；业务授权和内容读取集中Nest。

正文、图片、索引和登录状态的可见性由数据边界保证，不在客户端过滤已发送的私密字节。每次交付写清样本/真数据、预览/生产、模拟/真机的区别。
