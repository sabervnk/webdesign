DELETE FROM teacher_workspaces WHERE owner_id IN (SELECT owner_id FROM classer_administrator_ids);
