import {Skeleton} from '@/components/ui/skeleton';
export default function PageSkeleton({label='در حال بارگذاری…',compact=false}:{label?:string,compact?:boolean}) {
 return <section className={'page-skeleton'+(compact?' compact':'')} role="status" aria-busy="true" aria-label={label}>
  <span className="sr-only">{label}</span>
  <div aria-hidden="true"><Skeleton className="sk-heading"/><Skeleton className="sk-subtitle"/>
   <div className="sk-grid">{[0,1,2].map(i=><div className="sk-card" key={i}><Skeleton className="sk-avatar"/><Skeleton className="sk-line"/><Skeleton className="sk-line short"/><Skeleton className="sk-block"/></div>)}</div>
   {!compact&&<Skeleton className="sk-section"/>}
  </div>
 </section>;
}
