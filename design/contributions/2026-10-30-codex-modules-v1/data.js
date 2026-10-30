export const categories = ['全部', '技术实践', '生活经验', '随想认知'];
export const records = [
  { id:'microfrontend', page:'tech', date:'2026-10-26', category:'技术实践', title:'微前端，不只是一份配置', excerpt:'从主应用入口、应用注册、路由匹配，一步步找到加载边界。把这次理解问题的路径，也一起留下。', tags:['微前端','问题拆解','路由'], bodyText:'主子应用 qiankun registerMicroApps activeRule 配置 路由 加载 排查 bug 验证' },
  { id:'mapo', page:'recipe', date:'2026-10-25', category:'生活经验', title:'麻婆豆腐，第二次。', excerpt:'豆腐焯水，红油慢炒。材料不复杂，火候和先后顺序，却值得再记一遍。', tags:['厨房','川菜','实践'], bodyText:'麻婆豆腐 豆腐 牛肉 花椒 豆瓣酱 材料 工序 焯水 红油 火候' },
  { id:'patience', page:'thought', date:'2026-10-18', category:'随想认知', title:'允许自己暂时没有答案', excerpt:'有些问题不需要立刻解决。先放一放，也给新的经历留一点余地。', tags:['自我提醒','成长'], bodyText:'认识 允许 答案 不确定 生活 比较 后来补充 慢慢想明白' },
  { id:'network', page:'tech', date:'2026-10-14', category:'技术实践', title:'一次请求，先看它经过了哪里', excerpt:'把注意力从错误提示移到请求链路：发出、转发、返回，每一段都有可以验证的线索。', tags:['网络','排查','请求'], bodyText:'网络 请求 response status fetch 排查 入口 代理 HTTP 响应' },
  { id:'ordinary', page:'thought', date:'2026-10-07', category:'随想认知', title:'把普通的一天也留下', excerpt:'不是每次记录都需要结论。有时候，记得那天做过什么，就已经很好。', tags:['日常','记录'], bodyText:'生活 记录 普通 日子 琐碎 留下 观察' },
  { id:'slow', page:'thought', date:'2026-09-28', category:'随想认知', title:'认真做一件小事', excerpt:'从一顿饭、一段代码开始，把注意力放回自己能够照顾的事情上。', tags:['专注','生活'], bodyText:'专注 生活 小事 注意力 慢 认真' }
];
export const hrefFor = record => `?page=${record.page}&id=${encodeURIComponent(record.id)}`;
export function escapeHtml(value='') {
  return String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
}
export function filterRecords(query='', category='全部') {
  const words=query.trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
  return records.filter(r => (category==='全部'||r.category===category) && words.every(word => `${r.title} ${r.excerpt} ${r.tags.join(' ')} ${r.bodyText}`.toLocaleLowerCase().includes(word)));
}
