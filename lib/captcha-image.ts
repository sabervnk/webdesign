const glyphs=['11111100011000110001100011000111111','00100011000010000100001000010001110','11111000010000111111100001000011111','11111000010000101111000010000111111','10001100011000111111000010000100001','11111100001000011111000010000111111','11111100001000011111100011000111111','11111000010001000100010000100001000','11111100011000111111100011000111111','11111100011000111111000010000111111'];
const crc=(data:Uint8Array)=>{let c=0xffffffff;for(const b of data){c^=b;for(let i=0;i<8;i++)c=(c>>>1)^((c&1)?0xedb88320:0)}return (c^0xffffffff)>>>0};
const number=(n:number)=>new Uint8Array([n>>>24,n>>>16&255,n>>>8&255,n&255]);
const concat=(...a:Uint8Array[])=>{const out=new Uint8Array(a.reduce((s,x)=>s+x.length,0));let p=0;for(const x of a){out.set(x,p);p+=x.length}return out};
const chunk=(name:string,data:Uint8Array)=>{const type=new TextEncoder().encode(name);return concat(number(data.length),type,data,number(crc(concat(type,data))))};
export async function captchaImage(code:string){
 const width=220,height=72,pixels=new Uint8Array(width*height*3);let seed=crypto.getRandomValues(new Uint32Array(1))[0]||1;const random=()=>{seed^=seed<<13;seed^=seed>>>17;seed^=seed<<5;return (seed>>>0)/4294967296};
 const put=(x:number,y:number,color:number[])=>{x=Math.round(x);y=Math.round(y);if(x<0||y<0||x>=width||y>=height)return;pixels.set(color,(y*width+x)*3)};
 for(let y=0;y<height;y++)for(let x=0;x<width;x++)put(x,y,[245,248,247]);
 for(let i=0;i<360;i++)put(random()*width,random()*height,[170+random()*40,190+random()*30,185+random()*35]);
 for(let line=0;line<5;line++){const offset=random()*height,amplitude=5+random()*12;for(let x=0;x<width;x++)put(x,offset+Math.sin(x/25+line)*amplitude,[190,210,202])}
 for(let i=0;i<code.length;i++){const glyph=glyphs[+code[i]],left=18+i*31+Math.round(random()*4),top=18+Math.round(random()*10),color=[28+random()*25,65+random()*30,70+random()*30];for(let y=0;y<7;y++)for(let x=0;x<5;x++)if(glyph[y*5+x]==='1')for(let yy=0;yy<4;yy++)for(let xx=0;xx<4;xx++)put(left+x*4+xx+Math.sin((y*4+yy)/12+i)*2,top+y*4+yy,color)}
 const raw=new Uint8Array((width*3+1)*height);for(let y=0;y<height;y++)raw.set(pixels.subarray(y*width*3,(y+1)*width*3),y*(width*3+1)+1);
 const stream=new Blob([raw]).stream().pipeThrough(new CompressionStream('deflate')),compressed=new Uint8Array(await new Response(stream).arrayBuffer());
 return concat(new Uint8Array([137,80,78,71,13,10,26,10]),chunk('IHDR',concat(number(width),number(height),new Uint8Array([8,2,0,0,0]))),chunk('IDAT',compressed),chunk('IEND',new Uint8Array()));
}
