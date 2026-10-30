from pathlib import Path
import subprocess,json
from PIL import Image
root=Path(__file__).resolve().parent
out=root/'daytrace-logo'/'website-icon';out.mkdir(exist_ok=True)
mark='''<g fill="none" stroke="#F0F0E8" stroke-linecap="round" stroke-linejoin="round"><path d="M40 53 V212 H210" stroke-width="18"/><path d="M87 52 V99 C87 140 166 144 166 99 V52 M166 99 C166 164 145 190 103 192" stroke-width="20"/></g><circle cx="216" cy="51" r="11" fill="#F0F0E8"/>'''
def svg(body,title,box='0 0 256 256'):
 return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="{box}" role="img"><title>{title}</title>{body}</svg>\n'
for name,radius in [('favicon',52),('apple-touch-icon',0)]:
 (out/f'{name}.svg').write_text(svg(f'<rect width="256" height="256" rx="{radius}" fill="#29352C"/>'+mark,'有迹 Daytrace 网站图标'))
for size in [16,32,48,64,192,512]:
 subprocess.run(['rsvg-convert','-w',str(size),'-h',str(size),'-o',str(out/f'favicon-{size}.png'),str(out/'favicon.svg')],check=True)
subprocess.run(['rsvg-convert','-w','180','-h','180','-o',str(out/'apple-touch-icon.png'),str(out/'apple-touch-icon.svg')],check=True)
Image.open(out/'favicon-48.png').save(out/'favicon.ico',format='ICO',sizes=[(16,16),(32,32),(48,48)],append_images=[Image.open(out/'favicon-16.png'),Image.open(out/'favicon-32.png')])
body='''<rect width="1120" height="760" fill="#F0F0E8"/>
<text x="64" y="65" fill="#29352C" font-family="'Helvetica Neue',Arial,sans-serif" font-size="17" letter-spacing="3">DAYTRACE / WEBSITE ICON</text><path d="M64 92 H1056" stroke="#D4D7CC"/>
'''+f'<g transform="translate(80 160) scale(1.4)"><rect width="256" height="256" rx="52" fill="#29352C"/>{mark}</g>'+'''
<g font-family="'Songti SC',serif" fill="#29352C"><text x="540" y="202" font-size="38">有迹</text><text x="540" y="246" font-size="20">浏览器标签 · 收藏夹 · 手机主屏幕</text></g>
<rect x="540" y="292" width="480" height="68" rx="12" fill="#E4E5DC"/><rect x="552" y="303" width="278" height="56" rx="9" fill="#FAFAF6"/>
'''+f'<g transform="translate(571 320) scale(.09375)"><rect width="256" height="256" rx="52" fill="#29352C"/>{mark}</g>'+'''
<text x="607" y="338" fill="#29352C" font-family="'Helvetica Neue',Arial,sans-serif" font-size="17">有迹 · Daytrace</text><text x="540" y="416" fill="#62695B" font-family="'Helvetica Neue',Arial,sans-serif" font-size="14" letter-spacing="2">ACTUAL SIZE / 16 · 32 · 64 PX</text>
'''
for size,x in [(16,542),(32,618),(64,720)]:
 body+=f'<g transform="translate({x} {492-size}) scale({size/256})"><rect width="256" height="256" rx="52" fill="#29352C"/>{mark}</g>'
body+='''<path d="M64 588 H1056" stroke="#D4D7CC"/><text x="64" y="650" font-family="'Kaiti SC','STKaiti',serif" font-size="28" fill="#29352C">小小一枚，也能一眼找到。</text><text x="64" y="708" font-family="'Helvetica Neue',Arial,sans-serif" font-size="14" letter-spacing="2" fill="#62695B">OLIVE INK #29352C / MINERAL PAPER #F0F0E8</text>'''
(root/'网站图标展示.svg').write_text(svg(body,'有迹 Daytrace 网站图标使用展示','0 0 1120 760'))
subprocess.run(['rsvg-convert','-w','1120','-o',str(root/'网站图标展示.png'),str(root/'网站图标展示.svg')],check=True)
results=[]
for p in out.glob('*.png'):
 im=Image.open(p);results.append({'file':p.name,'size':list(im.size),'mode':im.mode}); assert im.width==im.height
ico=Image.open(out/'favicon.ico');assert ico.ico.sizes()=={(16,16),(32,32),(48,48)}
assert Image.open(out/'apple-touch-icon.png').convert('RGBA').getextrema()[3]==(255,255)
(out/'验证记录.json').write_text(json.dumps({'png':results,'ico_sizes':sorted(list(s) for s in ico.ico.sizes()),'apple_background_opaque':True,'browser_integration':'not performed'},ensure_ascii=False,indent=2)+'\n')
