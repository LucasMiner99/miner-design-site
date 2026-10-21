const marker='chat_compact_dm_v1';
// Apply the approved size/spacing once, including installations with saved old values.
// D1 batches are atomic; concurrent requests cannot reapply the migration after a save.
export async function compactChatRows(db,rows){
 if(rows.some(r=>r.key===marker))return rows;
 const statements=[['chat_font_size','21'],['chat_gap','2']].map(([key,value])=>db.prepare(
  'INSERT OR REPLACE INTO streambot_settings (key,value) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM streambot_settings WHERE key=?)'
 ).bind(key,value,marker));
 statements.push(db.prepare('INSERT OR IGNORE INTO streambot_settings (key,value) VALUES (?,?)').bind(marker,'1'));
 await db.batch(statements);
 return (await db.prepare('SELECT key,value FROM streambot_settings').all()).results||[];
}
