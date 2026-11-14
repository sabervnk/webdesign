import { sqliteTable,text,integer,index,uniqueIndex } from 'drizzle-orm/sqlite-core';
export const workspaces=sqliteTable('teacher_workspaces',{ownerId:text('owner_id').primaryKey(),data:text('data').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()});
export const teacherProfiles=sqliteTable('teacher_public_profiles',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull().unique(),data:text('data').notNull(),published:integer('published').notNull().default(0),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()},t=>[index('public_profiles_listing_idx').on(t.published,t.updatedAt)]);
export const teacherArticles=sqliteTable('teacher_articles',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),teacherId:text('teacher_id').notNull().references(()=>teacherProfiles.id),data:text('data').notNull(),status:text('status').notNull().default('draft'),version:integer('version').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('articles_owner_idx').on(t.ownerId,t.updatedAt),index('articles_published_idx').on(t.status,t.createdAt,t.teacherId),index('articles_teacher_idx').on(t.teacherId)]);
export const siteInquiries=sqliteTable('site_inquiries',{id:text('id').primaryKey(),email:text('email').notNull(),data:text('data').notNull(),status:text('status').notNull().default('new'),version:integer('version').notNull().default(1),createdAt:text('created_at').notNull(),updatedAt:text('updated_at').notNull()},t=>[index('inquiries_email_date_idx').on(t.email,t.createdAt),index('inquiries_created_idx').on(t.createdAt)]);
export const teacherVideos=sqliteTable('teacher_videos',{
 ownerId:text('owner_id').primaryKey(),key:text('object_key').notNull(),
 size:integer('size').notNull(),visible:integer('visible').notNull().default(0),
});

export const accounts=sqliteTable('classer_accounts',{
 id:text('id').primaryKey(),username:text('username').notNull().unique(),name:text('name').notNull(),email:text('email').notNull(),phone:text('phone').notNull().default(''),
 role:text('role').notNull(),passwordHash:text('password_hash').notNull(),active:integer('active').notNull().default(1),
 epoch:integer('epoch').notNull().default(0),mustChange:integer('must_change').notNull().default(1),
 teacherId:text('teacher_id'),studentId:text('student_id'),createdAt:text('created_at').notNull(),
});
export const accountSessions=sqliteTable('classer_sessions',{
 token:text('token').primaryKey(),accountId:text('account_id').notNull().references(()=>accounts.id),epoch:integer('epoch').notNull(),expires:integer('expires').notNull(),
},t=>[index('classer_sessions_exp_idx').on(t.expires)]);
export const accountRecovery=sqliteTable('classer_recovery',{
 token:text('token').primaryKey(),accountId:text('account_id').notNull().references(()=>accounts.id),epoch:integer('epoch').notNull(),expires:integer('expires').notNull(),
},t=>[index('classer_recovery_exp_idx').on(t.expires)]);
export const authLimits=sqliteTable('classer_auth_limits',{key:text('key').primaryKey(),window:integer('window').notNull(),count:integer('count').notNull()},t=>[index('classer_auth_limit_window_idx').on(t.window)]);
export const siteCopy=sqliteTable('classer_site_copy',{id:integer('id').primaryKey(),data:text('data').notNull(),version:integer('version').notNull().default(1)});

export const emailRecovery=sqliteTable('classer_email_recovery',{
 accountId:text('account_id').primaryKey().references(()=>accounts.id),challenge:text('challenge').notNull().unique(),
 codeHash:text('code_hash').notNull(),email:text('email').notNull(),epoch:integer('epoch').notNull(),
 createdAt:integer('created_at').notNull(),expires:integer('expires').notNull(),attempts:integer('attempts').notNull().default(0),
 delivered:integer('delivered').notNull().default(0),grantHash:text('grant_hash').unique(),grantExpires:integer('grant_expires'),
},t=>[index('classer_email_recovery_expires_idx').on(t.expires)]);
export const recoveryLimits=sqliteTable('classer_recovery_limits',{
 key:text('key').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull(),
},t=>[index('classer_recovery_limits_expires_idx').on(t.expires)]);


export const blogCategories=sqliteTable('classer_blog_categories',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),name:text('name').notNull()},t=>[uniqueIndex('classer_blog_categories_owner_name').on(t.ownerId,t.name)]);
export const blogMedia=sqliteTable('classer_blog_media',{id:text('id').primaryKey(),ownerId:text('owner_id').notNull(),objectKey:text('object_key').notNull(),type:text('type').notNull(),size:integer('size').notNull(),name:text('name').notNull(),createdAt:text('created_at').notNull()},t=>[index('classer_blog_media_owner_idx').on(t.ownerId)]);

export const commissions=sqliteTable('classer_commissions',{ownerId:text('owner_id').primaryKey(),data:text('data').notNull(),version:integer('version').notNull().default(1),updatedAt:text('updated_at').notNull()});
export const translations=sqliteTable('classer_translations',{id:text('id').primaryKey(),translated:text('translated').notNull(),createdAt:text('created_at').notNull()});
export const translationLimits=sqliteTable('classer_translation_limits',{id:text('id').primaryKey(),count:integer('count').notNull().default(0)});

export const administratorIds=sqliteTable('classer_administrator_ids',{ownerId:text('owner_id').primaryKey()});

export const directMessages=sqliteTable('classer_direct_messages',{id:text('id').primaryKey(),teacherId:text('teacher_id').notNull(),studentId:text('student_id').notNull(),senderId:text('sender_id').notNull(),senderRole:text('sender_role').notNull(),body:text('body').notNull(),createdAt:text('created_at').notNull(),teacherReadAt:text('teacher_read_at'),studentReadAt:text('student_read_at')},t=>[index('direct_messages_thread_idx').on(t.teacherId,t.studentId,t.createdAt,t.id)]);
export const captchaChallenges=sqliteTable('classer_captchas',{id:text('id').primaryKey(),answerHash:text('answer_hash').notNull(),bindingHash:text('binding_hash').notNull(),expires:integer('expires').notNull()});
export const securityLimits=sqliteTable('classer_security_limits',{id:text('id').primaryKey(),count:integer('count').notNull(),expires:integer('expires').notNull()});
