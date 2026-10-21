const migrations=[
 {marker:'chat_compact_dm_v2',values:[['chat_font_size','32'],['chat_gap','3']]},
 {marker:'chat_spring_v1',values:[['chat_animation_ms','300']]},
];
// Apply the approved size/spacing once, including installations with saved old values.
// D1 batches are atomic; concurrent requests cannot reapply the migration after a save.
export async function compactChatRows(db,rows){
 const pending=migrations.filter(({marker})=>!rows.some(r=>r.key===marker));
 if(!pending.length)return rows;
 const statements=[];
 for(const {marker,values} of pending){
  statements.push(...values.map(([key,value])=>db.prepare(
   'INSERT OR REPLACE INTO streambot_settings (key,value) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM streambot_settings WHERE key=?)'
  ).bind(key,value,marker)));
  statements.push(db.prepare('INSERT OR IGNORE INTO streambot_settings (key,value) VALUES (?,?)').bind(marker,'1'));
 }
 await db.batch(statements);
 return (await db.prepare('SELECT key,value FROM streambot_settings').all()).results||[];
}
