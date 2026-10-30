---
schemaVersion: 1
id: rec_7d0c0f2d-8f5b-4f0e-a3a6-111111111111
type: engineering
title: 合成样本：一次可验证的发布检查
slug: synthetic-release-check
oldSlugs: [release-check-v0]
occurredOn: 2026-10-29
updatedAt: "2026-10-30T09:30:00+08:00"
revision: 3
tags: [发布, 验证]
summary: 用于 ENGINE-001 纵向切片的合成技术记录，不代表真实经历。
status: published
visibility: public
attachments:
  - id: ast_7d0c0f2d-8f5b-4f0e-a3a6-444444444444
    path: images/check.png
    mediaType: image/png
    title: 一像素合成测试图
    width: 1
    height: 1
  - id: ast_7d0c0f2d-8f5b-4f0e-a3a6-666666666666
    path: files/checklist.txt
    mediaType: text/plain
    title: 合成核对清单
---

## 从问题开始

PUBLIC_SSR_PARAGRAPH_7F3A：这段文字必须先出现在 Nest 的公开详情响应，再原样进入 Next 首屏 HTML。

这里保留一条 `contentRevision`，用于辨认同一次内容快照。

## 验证路径

```ts
const verifiedByRealRequest = true;
```

| 检查 | 结果 |
| --- | --- |
| 公开状态 | published + public |
| 正文来源 | Nest 单次解析 |

### 受控附件

![一像素合成测试图](images/check.png)

[下载合成核对清单](files/checklist.txt)

只记录这条合成链路实际验证的内容，不把它写成生产发布经验。
