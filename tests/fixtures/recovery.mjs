import {DatabaseSync} from 'node:sqlite';
import {readFile} from 'node:fs/promises';
const migration=await readFile(new URL('../../drizzle/0004_email_recovery.sql',import.meta.url),'utf8');
export function recoveryDatabase(){
 const sqlite=new DatabaseSync(':memory:');
 sqlite.exec("PRAGMA foreign_keys=ON; CREATE TABLE classer_accounts(id TEXT PRIMARY KEY,username TEXT,name TEXT,email TEXT NOT NULL,epoch INTEGER NOT NULL DEFAULT 0,active INTEGER NOT NULL DEFAULT 1,password_hash TEXT,must_change INTEGER DEFAULT 1); CREATE TABLE classer_sessions(token TEXT,account_id TEXT,epoch INTEGER);");
 sqlite.exec(migration);
 sqlite.prepare('INSERT INTO classer_accounts(id,username,email,password_hash) VALUES(?,?,?,?)').run('teacher-1','teacher','teacher@example.com','old-hash');
 const db={prepare(sql){
  let values=[];
  const statement={bind(...v){values=v;return statement},async first(){return sqlite.prepare(sql).get(...values)??null},async all(){return {results:sqlite.prepare(sql).all(...values)}},async run(){return {meta:{changes:Number(sqlite.prepare(sql).run(...values).changes)}}}};
  return statement;
 }};
 return {db,sqlite};
}

