// Read only the MP4 box headers needed to check the uploaded movie.
export function mp4Duration(a:Uint8Array):number|null{
 const d=new DataView(a.buffer,a.byteOffset,a.byteLength);
 type Box={type:string,start:number,end:number};
 let budget=8192;
 function boxes(start:number,end:number):Box[]{
  const found:Box[]=[];
  while(start<end){
   if(--budget<0||end-start<8)throw Error('Invalid MP4 box');
   const type=String.fromCharCode(...a.subarray(start+4,start+8));
   let size=d.getUint32(start),header=8;
   if(size===1){
    if(end-start<16)throw Error('Invalid MP4 box');
    size=Number(d.getBigUint64(start+8));header=16;
   }else if(size===0)size=end-start;
   if(size<header||size>end-start)throw Error('Invalid MP4 box');
   found.push({type,start:start+header,end:start+size});start+=size;
  }
  return found;
 }
 function duration(b:Box){
  const version=d.getUint8(b.start);
  if(version!==0&&version!==1)return null;
  if(b.end-b.start<(version?32:20))return null;
  const scale=d.getUint32(b.start+(version?20:12));
  const ticks=version?Number(d.getBigUint64(b.start+24)):d.getUint32(b.start+16);
  return scale&&ticks>0&&Number.isSafeInteger(ticks)?ticks/scale:null;
 }
 try{
  const top=boxes(0,a.length);
  const moov=top.filter(b=>b.type==='moov');
  if(top[0]?.type!=='ftyp'||top[0].end-top[0].start<8||moov.length!==1||top.some(b=>b.type==='moof')||!top.some(b=>b.type==='mdat'&&b.end>b.start))return null;
  const content=boxes(moov[0].start,moov[0].end),movie=content.find(b=>b.type==='mvhd');
  if(!movie)return null;
  const total=duration(movie);
  if(total===null)return null;
  let video=false,maximum=total;
  for(const track of content.filter(b=>b.type==='trak')){
   const mdia=boxes(track.start,track.end).find(b=>b.type==='mdia');
   if(!mdia)continue;
   const media=boxes(mdia.start,mdia.end);
   const handler=media.find(b=>b.type==='hdlr');
   if(handler&&handler.end-handler.start>=12&&d.getUint32(handler.start+8)===0x76696465){
    const clock=media.find(b=>b.type==='mdhd'),length=clock?duration(clock):null;
    if(length===null)return null;
    maximum=Math.max(maximum,length);video=true;
   }
  }
  return video?maximum:null;
 }catch{return null}
}
