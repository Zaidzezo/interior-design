"""Original deterministic, tileable procedural fallback maps. No external input assets."""
from PIL import Image
from pathlib import Path
import math,random
root=Path(__file__).resolve().parents[1]/'apps/web/public/assets/materials'
root.mkdir(parents=True,exist_ok=True)
colors={'oak':(203,174,130),'walnut':(131,94,65),'ash':(218,211,190),'herringbone':(192,158,115),'tile':(198,204,195),'marble':(231,229,220),'carpet':(195,183,163),'concrete':(166,168,163),'terrazzo':(210,194,175)}
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
   elif name=='terrazzo': value=n*7+(-28 if rng.random()<.035 else 0)
   else:value=n*5+4*math.sin(2*math.pi*x/256)*math.sin(2*math.pi*y/256)
   if name=='tile':seam=x%128<2 or y%128<2
   if seam:value-=22
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
