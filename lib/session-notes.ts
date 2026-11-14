import type {Session} from './model';
export type SessionNote={id:string;text:string;createdAt:string;updatedAt?:string;legacy?:boolean;dateUnknown?:boolean;status?:Session['status']};
export function sessionNotes(s:Session):SessionNote[]{
 const notes=[...(s.notes??[])];
 for(const [i,n] of (s.noteHistory??[]).entries())notes.push({id:'history-'+i,text:n.note,createdAt:n.at,legacy:true,status:n.status});
 if(s.note.trim())notes.push({id:'legacy-note',text:s.note,createdAt:s.date+'T'+s.time+':00+03:30',dateUnknown:true,legacy:true,status:s.status});
 return notes.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt));
}
export function withSessionNotes(s:Session,notes:SessionNote[]):Session{return {...s,note:'',noteHistory:[],notes:notes.map(({legacy,...n})=>n)}}
