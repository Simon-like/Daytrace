import Link from "next/link";
import { Icon } from "../../components/icon";
export const metadata = { title: "关于有迹" };
export default function AboutPage() {
  return <main className="about-main"><header className="page-heading dt-scene-title"><p className="eyebrow">ABOUT THIS LITTLE GARDEN</p><h1>让经历有迹可循。</h1><p>一份个人知识与生活档案。也是一个让自己愿意回来翻翻的地方。</p></header><div className="about-grid"><section><h2>给日常一个去处</h2><p>工作里，常常刚理解一个问题，就赶着处理下一件事。生活里，做过一道菜、读过一段话，也可能很快忘记细节。</p><p>有迹想留下的，是理解发生的过程：从哪里开始拆解，在哪一步卡住，后来又有了什么不同的认识。</p><h2>记录，不必从一篇文章开始</h2><p>一句话、一份过程、一张随手拍的照片，都可以成为一页。允许不完整，也允许以后修改和补充。</p><p className="hand-note">留给未来的自己，一条能走回来的路。</p><h2>这是一份可以带走的档案</h2><p>记录以 Markdown 与独立附件保存，让内容可以离开这个站点，继续陪伴你。公开的放在归档里；只想留给自己的，放进主人空间。</p><Link className="inline-link" href="/archive">从一页记录开始 <Icon name="arrow" size={17} /></Link></section><aside className="about-card"><img src="/brand/daytrace-icon-reverse.svg" width="70" height="70" alt="有迹品牌标记" /><p>有迹</p><span>DAYTRACE</span><hr /><p className="about-card-note">档案的秩序，<br />手写的温度。</p><small>你现在看到的是演示版本。<br />文章、身份与私密材料均为示例，<br />不代表主人的真实经历。</small></aside></div></main>;
}
