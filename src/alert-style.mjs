const marker='alerts_radial_v1';
export const alertStyleDefaults={alerts_gap:21,alerts_card_width:580,alerts_name_size:44,alerts_label_size:23,alerts_duration_seconds:5,alerts_scale_percent:100};
export async function radialAlertRows(db,rows){
 if(rows.some(r=>r.key===marker))return rows;
 await db.batch([
  ...Object.entries(alertStyleDefaults).map(([key,value])=>db.prepare('INSERT OR REPLACE INTO streambot_settings (key,value) SELECT ?,? WHERE NOT EXISTS (SELECT 1 FROM streambot_settings WHERE key=?)').bind(key,String(value),marker)),
  db.prepare('INSERT OR IGNORE INTO streambot_settings (key,value) VALUES (?,?)').bind(marker,'1')
 ]);
 return (await db.prepare('SELECT key,value FROM streambot_settings').all()).results||[];
}
