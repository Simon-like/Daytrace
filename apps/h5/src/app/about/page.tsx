import Link from "next/link";

export const metadata = { title: "关于有迹" };
export default function H5About() {
  return <main><header className="h5-page-heading dt-scene-title"><p className="h5-kicker">ABOUT DAYTRACE</p><h1>让经历<br />有迹可循。</h1><p>一份个人知识与生活档案，也是一个让自己愿意回来翻翻的地方。</p></header><section className="h5-about-note"><span aria-hidden="true">“</span><p>不是每一刻都要有答案，<br />但每一点理解，都有来处。</p></section><section className="h5-prose"><h2>给日常一个去处</h2><p>有迹想留下的，是理解发生的过程：从哪里开始拆解，在哪一步卡住，后来又有了什么不同的认识。</p><h2>记录可以慢慢完整</h2><p>一句话、一份过程、一张随手拍的照片，都可以成为一页。公开与私密各有边界，Markdown 与附件也可以带走。</p><Link className="h5-text-link" href="/archive">从一页记录开始 →</Link><p><Link className="h5-text-link" href="/owner/content">打开主人内容库 →</Link></p><small>当前为合成内容的本地演示版本。</small></section></main>;
}
