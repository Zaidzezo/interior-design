"""Original high dynamic range studio illumination, generated locally, CC0."""
import math
from pathlib import Path
W,H=512,256
output=bytearray(f'#?RADIANCE\nFORMAT=32-bit_rle_rgbe\n\n-Y {H} +X {W}\n'.encode())
for y in range(H):
 for x in range(W):
  sky=max(0,math.cos(y/H*math.pi));window=math.exp(-((x/W-.24)/.08)**8-((y/H-.43)/.16)**8)*8
  ceiling=math.exp(-((y/H-.12)/.1)**2)*1.5
  rgb=[.24+.65*sky+window+ceiling,.23+.69*sky+window*.94+ceiling,.22+.76*sky+window*.83+ceiling]
  mantissa,exponent=math.frexp(max(rgb));scale=mantissa*256/max(rgb)
  output.extend([min(255,int(c*scale)) for c in rgb]+[exponent+128])
root=Path(__file__).resolve().parents[1]/'apps/web/public/assets/environments';root.mkdir(parents=True,exist_ok=True);(root/'studio.hdr').write_bytes(output)
