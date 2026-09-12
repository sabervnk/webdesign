export class RequestError extends Error {
 status:number;
 constructor(message:string,status:number){super(message);this.status=status;this.name='RequestError'}
}

// Enforce limits while reading, including chunked requests without Content-Length.
export async function readBytes(r:Request,max:number):Promise<Uint8Array>{
 const length=Number(r.headers.get('content-length'));
 if(Number.isFinite(length)&&length>max)throw new RequestError('حجم اطلاعات بیش از حد مجاز است. / Payload too large.',413);
 if(!r.body)return new Uint8Array();
 const reader=r.body.getReader();const chunks:Uint8Array[]=[];let size=0;
 try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.byteLength;if(size>max){await reader.cancel();throw new RequestError('حجم اطلاعات بیش از حد مجاز است. / Payload too large.',413)}chunks.push(value)}}finally{reader.releaseLock()}
 const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength}return bytes;
}

export async function payload(r:Request,max=200000):Promise<Record<string,unknown>>{
 const bytes=await readBytes(r,max);
 let body:unknown;try{body=JSON.parse(new TextDecoder().decode(bytes))}catch{throw new RequestError('اطلاعات JSON معتبر نیست. / Invalid JSON.',400)}
 if(!body||typeof body!=='object'||Array.isArray(body))throw new RequestError('ساختار درخواست معتبر نیست. / Expected a JSON object.',400);
 return body as Record<string,unknown>;
}

export function requestFailure(error:unknown,fallback:string){return Response.json({error:error instanceof RequestError?error.message:fallback},{status:error instanceof RequestError?error.status:503,headers:{'Cache-Control':'private, no-store'}})}
