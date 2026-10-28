"""Original deterministic, tileable procedural fallback maps. No external input assets."""
from PIL import Image
from pathlib import Path
import math,random
root=Path(__file__).resolve().parents[1]/'apps/web/public/assets/materials'
root.mkdir(parents=True,exist_ok=True)
colors={'oak':(203,174,130),'walnut':(131,94,65),'ash':(218,211,190),'herringbone':(192,158,115),'tile':(198,204,195),'marble':(231,229,220),'carpet':(195,183,163),'concrete':(166,168,163),'terrazzo':(210,194,175),'plaster':(242,240,234),'brick':(181,108,82),'paneling':(151,117,81),'wallpaper':(222,217,202),'porcelain':(226,228,223)}
N=256
for name,base in colors.items():
 rng=random.Random(name);im=Image.new('RGB',(N,N));height=Image.new('L',(N,N));rough=Image.new('L',(N,N))
 for y in range(N):
  for x in range(N):
   n=rng.uniform(-1,1);seam=False
   if name in ['oak','walnut','ash','herringbone']:
    xx,yy=(x,y) if name!='herringbone' or (x//64+y//64)%2 else (y,x)
    grain=math.sin(2*math.pi*(xx/256*13+.07*math.sin(2*math.pi*yy/256)))
    value=grain*5+n*2+((yy//32)%3-1)*5
    seam=yy%32<1 or (xx+(yy//32%2)*128)%256<1
   elif name=='marble': value=-24*max(0,math.sin(2*math.pi*(x/256*3+y/256+.18*math.sin(2*math.pi*y/256))))**18+n*2
   elif name=='carpet': value=n*16+math.sin(x*math.pi)*2
   elif name=='plaster': value=n*1.7+1.5*math.sin(2*math.pi*x/N)*math.sin(2*math.pi*y/N)
   elif name=='brick':
    value=n*7+((y//32+x//64)%3-1)*5
    seam=y%32<3 or (x+(y//32%2)*32)%64<3
   elif name=='paneling':
    value=4*math.sin(2*math.pi*(x/N*15+.05*math.sin(y/N*math.pi*2)))+n*2
    seam=x%32<2
   elif name=='wallpaper': value=n*1.5+5*max(0,math.cos(2*math.pi*x/64)*math.cos(2*math.pi*y/64))**6
   elif name=='porcelain':
    value=n*1.5+2*math.sin(2*math.pi*x/N)*math.sin(2*math.pi*y/N)
    seam=x%128<1 or y%128<1
   elif name=='terrazzo': value=n*7+(-28 if rng.random()<.035 else 0)
   else:value=n*5+4*math.sin(2*math.pi*x/256)*math.sin(2*math.pi*y/256)
   if name=='tile':seam=x%128<2 or y%128<2
   if seam:value+=30 if name=='brick' else -22
   im.putpixel((x,y),tuple(max(0,min(255,int(c+value)))for c in base));height.putpixel((x,y),int(max(0,min(255,128+value*2))))
   rough.putpixel((x,y),int((100 if name=='marble' else 225 if name=='carpet' else 180)+n*8))
 normal=Image.new('RGB',(N,N))
 for y in range(N):
  for x in range(N):
   dx=(height.getpixel(((x+1)%N,y))-height.getpixel(((x-1)%N,y)))/255*.45
   dy=(height.getpixel((x,(y+1)%N))-height.getpixel((x,(y-1)%N)))/255*.45
   length=math.sqrt(dx*dx+dy*dy+1)
   normal.putpixel((x,y),(int(128-dx/length*127),int(128-dy/length*127),int(128+127/length)))
 for kind,image in [('albedo',im),('normal',normal),('roughness',rough)]:image.save(root/f'{name}-{kind}.webp',quality=88)
print('Generated',len(colors)*3,'local maps')
