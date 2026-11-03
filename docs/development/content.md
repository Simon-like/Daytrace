# 站点个人内容库

更新：2026-11-03。Markdown 内容协议、Nest 解析器与双端阅读已经存在；快捷上传、发布/回滚及正式私密内容持久库尚待实施。完整推荐见 [Markdown 渲染与内容管理方案](../research/2026-11-03-Markdown渲染与内容管理方案.md)。

## 现在怎样组织文件

正式协议为 [Markdown v1](../architecture/contracts/markdown-v1.md)，每篇记录固定一个目录，正文为 `index.md`，包含 YAML 元数据与普通 Markdown，附件在同一记录目录下：

```text
<内容根>/
  public/<记录目录>/index.md
  public/<记录目录>/images/example.png
  private/<记录目录>/index.md
  private/<记录目录>/files/notes.pdf
```

当前加载器只扫描 public/private 的直接子目录，不要再套 engineering/life/reflection 分类层。三类内容通过 `type: engineering | recipe | reflection` 与 tags 管理。目录名称可以变化；正式规范链接 `/records/<id>/` 保持不变。slug 和 oldSlugs 是别名，不是文章身份。

| 位置 | 用途 | 边界 |
| --- | --- | --- |
| `content/public/` | 经授权可入库的公开源内容（可选） | 不会因为放进此目录就自动发布，仍需校验 status 与 visibility |
| `content/private/` | 现有本地占位与忽略边界 | 真实私密推荐外置持久库，不进入普通 Git、公开构建或测试产物 |
| `apps/api/fixtures/demo/` | 当前工程合成 Demo | 不代表真实经历或生产内容 |
| 外置运行内容库（规划） | 正文、附件与私密内容的正式存储 | 上传由 Nest 校验，独立版本、发布快照与备份；尚未实现 |
| `docs/` | 项目说明、研发知识、模板与方案 | 不自动扫描为站点文章 |

## 当前约束

- 按 v1 写齐必填字段；缺 visibility 会使候选快照失败，不能把默认私密理解为允许带错发布。
- 公开展示只接受 `status: published` 且 `visibility: public`。正文、附件、索引、缓存都必须遵守同一权限边界。
- 正文不用 H1，不接收原始 HTML；图片和附件必须在 attachments 中声明，相对引用会转成受控附件 ID。
- 内容模板位于 `docs/templates/content/`，详细字段与迁移规则以契约为准。
- 忽略私密目录只防误提交，不代表已有认证、独立备份或恢复能力。

## 后续快捷维护方式（规划）

主人空间选择/拖入 Markdown 与附件，或导入 ZIP/目录 → 自动整理私密草稿 → 定位缺图和错误 → 桌面/手机预览 → 显式保存私密或公开发布。普通 MD 由导入器补齐元数据，原始内容包按协议校验。上传新版用稳定 ID 与 revision 检查，避免按标题覆盖文章。

保持外部 Markdown 编辑器写作；站内首期提供管理、预览、上传新版、元数据修改、版本与导出，不建设富文本编辑器。发布失败必须保留旧版本，回滚和备份恢复另有持久记录；目前内存快照保留不能当作完整发布系统。
