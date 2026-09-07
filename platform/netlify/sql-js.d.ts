declare module 'sql.js/dist/sql-asm.js' {
  type Value=string|number|null|Uint8Array;
  interface Statement {bind(values:Value[]):void;step():boolean;getAsObject():Record<string,Value>;free():void}
  interface Database {run(sql:string,values?:Value[]):void;prepare(sql:string):Statement;getRowsModified():number;export():Uint8Array;close():void}
  export default function init():Promise<{Database:new(data?:Uint8Array)=>Database}>;
}
