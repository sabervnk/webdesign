// SQL fragments accept only server-owned column names, never user input.
export function teachingOwner(column:'owner_id'|'p.owner_id'|'teacher_public_profiles.owner_id'){
 return `NOT EXISTS(SELECT 1 FROM classer_accounts admin_account WHERE admin_account.id=${column} AND admin_account.role='admin') AND NOT EXISTS(SELECT 1 FROM classer_administrator_ids admin_owner WHERE admin_owner.owner_id=${column})`;
}
