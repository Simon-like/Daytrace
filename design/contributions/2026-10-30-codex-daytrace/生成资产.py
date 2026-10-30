from pathlib import Path
import subprocess
root=Path('design/contributions/2026-10-30-codex-daytrace')
out=root/'daytrace-logo'
ink='#29352C'; paper='#F0F0E8'
def mark(color=ink):
 return f'''<g fill="none" stroke="{color}" stroke-linecap="round" stroke-linejoin="round">
 <path d="M24 30 V112 H104" stroke-width="7"/>
 <path d="M48 31 V54 C48 76 82 78 82 53 V31 M82 53 C82 87 71 101 51 103" stroke-width="8"/>
 </g><circle cx="106" cy="28" r="5" fill="{color}"/>'''
def svg(title,body,box):
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img"><title>{title}</title>{body}</svg>\n'
def lockup(color=ink):
 return f'''<g transform="translate(42 43) scale(1.05)">{mark(color)}</g>
 <g fill="{color}"><text x="228" y="136" font-family="'Songti SC', 'Noto Serif CJK SC', serif" font-size="98" letter-spacing="10">有迹</text>
 <text x="234" y="187" font-family="'Helvetica Neue', Arial, sans-serif" font-size="25" font-weight="400" letter-spacing="6.7">DAYTRACE</text></g>'''
(out/'logo.svg').write_text(svg('有迹 Daytrace — 品牌横向标志',lockup(),'0 0 550 250'))
(out/'logo-icon.svg').write_text(svg('有迹 Daytrace — 独立图标',mark(),'0 0 136 136'))
(out/'logo-reverse.svg').write_text(svg('有迹 Daytrace — 浅色反白标志',lockup(paper),'0 0 550 250'))
(out/'logo-icon-reverse.svg').write_text(svg('有迹 Daytrace — 浅色反白图标',mark(paper),'0 0 136 136'))
# A presentation composition of the actual vector mark, not a separate generated logo.
body=f'''<rect width="1500" height="1100" fill="{paper}"/>
<g fill="{ink}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="16" letter-spacing="3">
 <text x="78" y="72">DAYTRACE / BRAND STUDY</text><text x="1230" y="72">01 — 2026</text></g>
<path d="M78 101 H1422" stroke="#D4D7CC"/>
<g transform="translate(415 145) scale(1.2)">{lockup()}</g>
<text x="750" y="512" text-anchor="middle" font-family="'Kaiti SC', 'STKaiti', serif" font-size="28" letter-spacing="4" fill="{ink}">让经历有迹可循。</text>
<path d="M78 586 H1422" stroke="#D4D7CC"/>
<rect x="78" y="634" width="380" height="350" rx="3" fill="{ink}"/>
<g transform="translate(178 695) scale(1.35)">{mark(paper)}</g>
<g fill="{ink}" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" letter-spacing="2">
 <text x="514" y="661">THE MARK</text><text x="994" y="661">AT SMALL SIZES</text></g>
<g transform="translate(565 708) scale(1.4)">{mark()}</g>
<g transform="translate(996 749) scale(.47)">{mark()}</g>
<g transform="translate(1105 769) scale(.235)">{mark()}</g>
<g transform="translate(1195 781) scale(.118)">{mark()}</g>
<g font-family="'Helvetica Neue', Arial, sans-serif" font-size="15" fill="#62695B"><text x="1009" y="861">64</text><text x="1107" y="861">32</text><text x="1193" y="861">16</text></g>
<g fill="{ink}" font-family="'Songti SC', serif" font-size="21"><text x="514" y="950">档案的秩序，手写的温度。</text></g>
<g fill="#62695B" font-family="'Helvetica Neue', Arial, sans-serif" font-size="14" letter-spacing="1.4"><text x="78" y="1042">OLIVE INK / #29352C</text><text x="514" y="1042">MINERAL PAPER / #F0F0E8</text><text x="1155" y="1042">有迹 · DAYTRACE</text></g>'''
(root/'品牌展示.svg').write_text(svg('有迹 Daytrace 品牌展示：标志、反白及小尺寸',body,'0 0 1500 1100'))
for p in out.glob('*.svg'):
 size=['-w','1024','-h','1024'] if 'icon' in p.name else ['-w','1600']
 subprocess.run(['rsvg-convert',*size,'-o',str(p.with_suffix('.png')),str(p)],check=True)
subprocess.run(['rsvg-convert','-w','1500','-o',str(root/'品牌展示.png'),str(root/'品牌展示.svg')],check=True)
for size in [16,32,64,180]:
 subprocess.run(['rsvg-convert','-w',str(size),'-h',str(size),'-o',str(out/f'icon-{size}.png'),str(out/'logo-icon.svg')],check=True)
print(root.resolve())
