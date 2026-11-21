import {database,bucket} from '@/db/storage';

export async function drainMedia(){
 const db=database(),rows=await db.prepare('SELECT object_key FROM classer_media_deletions LIMIT 50').all<{object_key:string}>();
 for(const row of rows.results)try{await bucket().delete(row.object_key);await db.prepare('DELETE FROM classer_media_deletions WHERE object_key=?').bind(row.object_key).run()}catch{break}
}

// Delete a login and its records, or a learner record without a separate login.
// D1.batch rolls back all database changes if a statement fails.
export async function removeIdentity(id:string,actor:string,roster?:{teacherId:string;studentId:string}){
 const db=database();
 if(id===actor||await db.prepare('SELECT 1 FROM classer_administrator_ids WHERE owner_id=?').bind(id).first())return 403;
 if(roster&&!await db.prepare("SELECT 1 FROM teacher_workspaces w,json_each(w.data,'$.students') s WHERE w.owner_id=? AND json_extract(s.value,'$.id')=?").bind(roster.teacherId,roster.studentId).first())return 404;
 if(!roster&&!await db.prepare('SELECT 1 WHERE EXISTS(SELECT 1 FROM classer_accounts WHERE id=?) OR EXISTS(SELECT 1 FROM teacher_workspaces WHERE owner_id=?) OR EXISTS(SELECT 1 FROM teacher_public_profiles WHERE owner_id=?)').bind(id,id,id).first())return 404;
 const scope=roster?"SELECT id FROM classer_accounts WHERE role='student' AND teacher_id=? AND student_id=? AND id<>? AND id NOT IN (SELECT owner_id FROM classer_administrator_ids)":"SELECT id FROM classer_accounts WHERE (id=? OR (role='student' AND teacher_id=?)) AND id<>? AND id NOT IN (SELECT owner_id FROM classer_administrator_ids)";
 const args=roster?[roster.teacherId,roster.studentId,actor]:[id,id,actor];
 const linked=roster?'SELECT ? AS teacher_id,? AS student_id':"SELECT teacher_id,student_id FROM classer_accounts WHERE id=? AND role='student'";
 const linkedArgs=roster?[roster.teacherId,roster.studentId]:[id];
 const now=new Date().toISOString();
 await db.batch([
  ...(!roster?[db.prepare('INSERT OR IGNORE INTO classer_deleted_identities VALUES (?)').bind(id)]:[]),
  db.prepare(`INSERT OR IGNORE INTO classer_deleted_identities ${scope}`).bind(...args),
  ...(!roster?[db.prepare("INSERT OR IGNORE INTO classer_media_deletions SELECT object_key FROM teacher_videos WHERE owner_id=? UNION SELECT object_key FROM classer_blog_media WHERE owner_id=? UNION SELECT 'avatars-v1/'||?").bind(id,id,id)]:[]),
  ...['classer_sessions','classer_recovery','classer_email_recovery'].map(t=>db.prepare(`DELETE FROM ${t} WHERE account_id IN (${scope})`).bind(...args)),
  db.prepare(`DELETE FROM classer_direct_messages WHERE teacher_id=? OR sender_id IN (${scope}) OR EXISTS(SELECT 1 FROM (${linked}) t WHERE t.teacher_id=classer_direct_messages.teacher_id AND t.student_id=classer_direct_messages.student_id)`).bind(id,...args,...linkedArgs),
  db.prepare(`DELETE FROM site_inquiries WHERE json_extract(data,'$.kind')='class' AND (json_extract(data,'$.teacherOwnerId')=? OR json_extract(data,'$.teacherId') IN (SELECT id FROM teacher_public_profiles WHERE owner_id=?) OR id IN (SELECT json_extract(s.value,'$.sourceInquiryId') FROM teacher_workspaces w,json_each(w.data,'$.students') s,(${linked}) t WHERE w.owner_id=t.teacher_id AND json_extract(s.value,'$.id')=t.student_id))`).bind(id,id,...linkedArgs),
  db.prepare(`UPDATE classer_commissions SET data=json_set(data,'$.students',json(COALESCE((SELECT json_group_object(key,value) FROM json_each(classer_commissions.data,'$.students') WHERE key NOT IN (SELECT student_id FROM (${linked}) t WHERE t.teacher_id=classer_commissions.owner_id)),'{}')),'$.sessions',json(COALESCE((SELECT json_group_object(key,value) FROM json_each(classer_commissions.data,'$.sessions') WHERE key NOT IN (SELECT json_extract(s.value,'$.id') FROM teacher_workspaces w,json_each(w.data,'$.sessions') s,(${linked}) t WHERE w.owner_id=t.teacher_id AND json_extract(s.value,'$.studentId')=t.student_id)),'{}'))),version=version+1 WHERE owner_id IN (SELECT teacher_id FROM (${linked}))`).bind(...linkedArgs,...linkedArgs,...linkedArgs),
  ...['students','sessions','assessments','messages'].map(key=>db.prepare(`UPDATE teacher_workspaces SET data=json_set(data,'$.${key}',json((SELECT json_group_array(json(value)) FROM json_each(teacher_workspaces.data,'$.${key}') WHERE json_extract(value,'$.${key==='students'?'id':'studentId'}') NOT IN (SELECT student_id FROM (${linked}) t WHERE t.teacher_id=teacher_workspaces.owner_id)))),version=version+1,updated_at=? WHERE owner_id IN (SELECT teacher_id FROM (${linked}))`).bind(...linkedArgs,now,...linkedArgs)),
  ...(roster?[]:['teacher_articles','classer_blog_categories','classer_blog_media','teacher_videos','teacher_public_profiles','classer_commissions','teacher_workspaces']).map(t=>db.prepare(`DELETE FROM ${t} WHERE owner_id=?`).bind(id)),
  db.prepare(`DELETE FROM classer_accounts WHERE id IN (${scope})`).bind(...args)
 ]);
 await drainMedia();return 200;
}
