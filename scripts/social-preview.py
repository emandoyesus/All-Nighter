"""Generate the 1200 x 630 share card. Requires Pillow."""
from PIL import Image, ImageDraw, ImageFont
from pathlib import Path
im=Image.new('RGB',(1200,630)); d=ImageDraw.Draw(im)
for y in range(630):
 for x in range(1200):
  glow=max(0,1-((x-1050)**2+(y-80)**2)**.5/1100)
  im.putpixel((x,y),(int(5+5*glow),int(11+20*glow),int(13+20*glow)))
cream='#f3ece1'; mint='#83f9d6'; muted='#a8b7b0'; border='#29413e'
font='/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
bold='/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
def text(x,y,s,size=22,color=cream,heavy=False):
 d.text((x,y),s,font=ImageFont.truetype(bold if heavy else font,size),fill=color)
d.rounded_rectangle((24,24,1176,606),radius=24,outline=border,width=2)
d.ellipse((60,61,92,93),fill=mint);d.ellipse((71,55,99,83),fill='#102221')
text(109,61,'ALL NIGHTER',24,heavy=True)
text(60,174,'Show up.',58,heavy=True)
text(60,248,'Lock in till',58,heavy=True)
text(60,322,'sunrise.',58,mint,True)
text(62,418,'A shared focus room for your crew.',23,muted)
text(62,455,'Music. Company. A little momentum.',23,muted)
d.rounded_rectangle((724,146,1128,483),radius=20,fill='#101d20',outline=border,width=2)
d.ellipse((749,174,759,184),fill=mint);text(770,168,'TONIGHT / 2 AWAKE',16,mint,True)
text(750,214,'One room. One queue.',23,heavy=True)
for i,(initial,name,desc) in enumerate([('E','Em','Building something new'),('S','Sam','One more track')]):
 y=269+i*74
 d.rounded_rectangle((748,y,1103,y+60),radius=10,fill='#192a2b')
 d.ellipse((760,y+12,796,y+48),fill='#294a44');text(770,y+18,initial,15,mint,True)
 text(810,y+7,name,17,heavy=True);text(810,y+30,desc,14,muted)
for i,h in enumerate([10,22,33,18,28,12,24]):
 x=752+i*9;d.rounded_rectangle((x,447-h,x+4,447),radius=2,fill=mint)
text(830,424,'Listening together',17,mint)
d.line((60,528,1130,528),fill=border,width=1)
text(62,553,'SHARED MUSIC',16,mint,True);text(355,553,'FOCUS SESSIONS',16,muted);text(680,553,'YOUR NIGHT CREW',16,muted)
im.save(Path(__file__).resolve().parents[1]/'static/og-image.png',optimize=True)
