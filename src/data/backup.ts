import manifest from '../../content/manifest.json';
import packageInfo from '../../package.json';
import { z } from 'zod';
import { db, type StudyDB } from './db';
import { COUNT_CONFIG, COUNT_PARAMETERS, COUNT_VERSION } from '../domain/count-scheduler';
import { migrateCountCard } from '../domain/migration';
import { CONFIG_ID, PARAMETERS, SCHEDULER_VERSION } from '../domain/scheduler';
import { saveJSONFile } from '../platform';

const timestamp = z.number().finite().nonnegative();
const id = z.string().min(1).max(200);
const skill = z.enum(['meaning','reading','listening','kana','grammar']);
const mode = z.enum(['recommended','review','new','practice','today']);
const fsrs = z.object({ due: timestamp, stability: z.number().finite().nonnegative(), difficulty: z.number().finite().min(0).max(10), elapsed_days: z.number().nonnegative(), scheduled_days: z.number().nonnegative(), learning_steps: z.number().int().nonnegative(), reps: z.number().int().nonnegative(), lapses: z.number().int().nonnegative(), state: z.number().int().min(0).max(3), last_review: timestamp.optional() });
const count=z.object({stage:z.number().int().min(0).max(5),remaining:z.number().int().min(0).max(3),rounds:z.number().int().nonnegative(),queueOrder:timestamp,lastCompletedDay:z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()});
const card = z.object({ count:count.optional(),id, targetId: id, skill, paused: z.boolean(), fsrs, dueAt: timestamp, createdAt: timestamp, revision: z.number().int().nonnegative() });
const guard = z.object({ id, at: timestamp, exceptCard: id.optional(),gap:z.number().int().min(0).max(1).optional() });
const session = z.object({ id: z.literal('active'), mode, activeId: id.optional(), isIntroduction: z.boolean().optional(), revealed: z.boolean(), hintUsed: z.boolean(), revealedAt: timestamp.optional(), updatedAt: timestamp, revision: z.number().int().nonnegative(), batch: z.array(id), completed: z.array(id).optional(), day: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), pendingRating: z.number().int().min(1).max(3).optional(), lastEventId: id.optional(), lastTargetId:id.optional(), studyGroup:z.object({wordIds:z.array(id).min(1).max(100).refine(ids=>new Set(ids).size===ids.length),startedAt:timestamp}).optional(), dailyExtra:z.object({day:z.string().regex(/^\d{4}-\d{2}-\d{2}$/),target:z.number().int().min(0).max(50000),limit:z.number().int().nonnegative()}).optional() });
const review = z.object({ id, cardId: id, at: timestamp, rating: z.number().int().min(1).max(3), before: card, after: card, sessionBefore: session.optional(), sessionAfter: session.optional(), guardBefore: guard.optional(), guardAfter: guard.optional(), schedulerVersion: z.enum([SCHEDULER_VERSION,COUNT_VERSION]), configId: z.enum([CONFIG_ID,COUNT_CONFIG]), guardsBefore:z.array(guard).optional(),guardsAfter:z.array(guard).optional(), rawLog: z.unknown(), revertedAt: timestamp.optional() });
const backupSchema = z.object({
  format: z.literal('nihongo-kobumi'), schemaVersion: z.union([z.literal(1),z.literal(2)]), contentVersion: z.string(), appVersion: z.string(), exportedAt: timestamp,
  schedulerVersion: z.enum([SCHEDULER_VERSION,COUNT_VERSION]), configId: z.enum([CONFIG_ID,COUNT_CONFIG]), parameters: z.unknown(),
  data: z.object({
    cards: z.array(card),
    progress: z.array(z.object({ id, introducedAt: timestamp.optional(), readAt: timestamp.optional(), practicedAt: timestamp.optional(), position: z.number().int().nonnegative().optional(), results: z.record(z.string(), z.boolean()).optional() })),
    guards: z.array(guard), reviews: z.array(review),
    practices: z.array(z.object({ id, targetId: id, skill: z.enum(['meaning','reading','listening','kana','grammar','lookup','exercise']), at: timestamp, source: z.enum(['practice','today']).optional(), correct: z.boolean().optional(), rating: z.number().int().min(1).max(3).optional() })),
    decks: z.array(z.object({ id, name: z.string().min(1).max(100), wordIds: z.array(id) })),
    notes: z.array(z.object({ id, text: z.string().max(10000) })),
    settings: z.array(z.object({ id: z.literal('settings'), listening: z.boolean(), autoPlay: z.boolean().optional(), listeningEnabled: z.boolean().optional(), furigana: z.boolean(), timezone: z.string(), lastBackupAt: timestamp.optional(), plannedWordIds: z.array(id).max(50000).optional(), planUpdatedAt: timestamp.optional(), dailyWordTarget:z.number().int().min(0).max(50000).optional(),studyGroupSize:z.number().int().min(1).max(100).optional() })),
    sessions: z.array(session).max(1), meta: z.array(z.object({ id, value: z.string() })),
  }),
});
export type Backup = z.infer<typeof backupSchema>;
const hash = async (s: string) => Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(s)))).map(v => v.toString(16).padStart(2,'0')).join('');
const tables = ['cards','progress','guards','reviews','practices','decks','notes','settings','sessions','meta'] as const;
export async function exportBackup(database: StudyDB = db) {
  const data = await database.transaction('r', tables.map(t => database[t]), async () => Object.fromEntries(await Promise.all(tables.map(async t => [t, await database[t].toArray()]))));
  const body = JSON.parse(JSON.stringify({ format: 'nihongo-kobumi', schemaVersion: 2, appVersion: packageInfo.version, contentVersion: manifest.contentVersion, exportedAt: Date.now(), schedulerVersion: COUNT_VERSION, configId: COUNT_CONFIG, parameters: COUNT_PARAMETERS, data })) as Backup;
  return { ...body, checksum: await hash(JSON.stringify(body)) };
}
export async function validateImport(input: unknown) {
  if (!input || typeof input !== 'object' || !('checksum' in input)) throw new Error('不是有效的日语小步备份。');
  const { checksum, ...body } = input as Record<string, unknown>;
  if (typeof checksum !== 'string' || await hash(JSON.stringify(body)) !== checksum) throw new Error('文件完整性校验失败，文件可能已经损坏。');
  const result = backupSchema.safeParse(body);
  if (!result.success) throw new Error('备份结构或版本不兼容。原数据没有改变。');
  const b = result.data;
  if ((b.schedulerVersion===COUNT_VERSION&&b.configId!==COUNT_CONFIG)||(b.schedulerVersion===SCHEDULER_VERSION&&b.configId!==CONFIG_ID)||JSON.stringify(b.parameters) !== JSON.stringify(b.schedulerVersion===COUNT_VERSION?COUNT_PARAMETERS:PARAMETERS)) throw new Error('备份使用不同的调度配置，暂不支持直接恢复。');
  for (const t of tables) if (new Set(b.data[t].map(x => x.id)).size !== b.data[t].length) throw new Error(`备份中 ${t} 存在重复 ID。`);
  const cards = new Map(b.data.cards.map(c => [c.id,c]));
  for (const c of cards.values()) if (c.dueAt !== c.fsrs.due || (c.fsrs.last_review ?? 0) > b.exportedAt) throw new Error('卡片日期或状态不一致。');
  for (const e of b.data.reviews) if (!cards.has(e.cardId) || e.before.id !== e.cardId || e.after.id !== e.cardId || e.before.targetId !== e.after.targetId || e.before.skill !== e.after.skill || cards.get(e.cardId)?.targetId !== e.after.targetId || e.after.revision !== e.before.revision + 1 || e.after.dueAt !== e.after.fsrs.due || e.before.dueAt !== e.before.fsrs.due) throw new Error('复习日志引用或版本不一致。');
  for(const e of b.data.reviews)if(e.schedulerVersion===COUNT_VERSION?e.configId!==COUNT_CONFIG||!e.before.count||!e.after.count||!e.guardsBefore||!e.guardsAfter:e.configId!==CONFIG_ID)throw new Error('复习日志调度配置不一致。');
  for (const s of b.data.sessions) if (s.activeId && !s.isIntroduction && !cards.has(s.activeId)) throw new Error('会话引用了不存在的卡片。');
  for (const s of b.data.sessions) if (s.lastEventId && !b.data.reviews.some(e => e.id === s.lastEventId)) throw new Error('会话引用了不存在的复习日志。');
  if (b.data.settings.length !== 1) throw new Error('备份设置不完整。');
  const plan=b.data.settings[0].plannedWordIds??[];if(new Set(plan).size!==plan.length)throw new Error('待学规划中存在重复词条。');
  try { new Intl.DateTimeFormat('zh-CN', { timeZone: b.data.settings[0].timezone }).format(); } catch { throw new Error('备份时区无效。'); }
  for (const d of b.data.decks) if (new Set(d.wordIds).size !== d.wordIds.length) throw new Error('词本含有重复词条。');
  return b;
}
export async function restoreBackup(b: Backup, validTargets: Set<string>, database: StudyDB = db) {
  const timezone=b.data.settings[0].timezone;
  const restoredCards=b.data.cards.map(c=>migrateCountCard(c,b.data.reviews,timezone));
  const missing = restoredCards.filter(c => !validTargets.has(c.targetId));
  await database.transaction('rw', tables.map(t => database[t]), async () => {
    for (const name of tables) await database[name].clear();
    for (const c of restoredCards) await database.cards.add({ ...c, paused: c.paused || !validTargets.has(c.targetId) });
    await database.progress.bulkAdd(b.data.progress);
    await database.guards.bulkAdd(b.data.guards);
    await database.reviews.bulkAdd(b.data.reviews);
    await database.practices.bulkAdd(b.data.practices);
    await database.decks.bulkAdd(b.data.decks);
    await database.notes.bulkAdd(b.data.notes);
    await database.settings.bulkAdd(b.data.settings);
    await database.meta.bulkAdd(b.data.meta);await database.meta.put({id:'dataVersion',value:'2'});
    await database.sessions.bulkAdd(b.data.sessions.map(s => ({ ...s, lastEventId:s.lastEventId&&b.data.reviews.some(e=>e.id===s.lastEventId&&e.after.count)?s.lastEventId:undefined, activeId: s.activeId && (s.isIntroduction ? validTargets.has(s.activeId) : b.data.cards.some(c => c.id === s.activeId && validTargets.has(c.targetId))) ? s.activeId : undefined })));
  });
  return missing.length;
}
export async function downloadJSON(value: unknown, filename: string) {
  await saveJSONFile(value, filename);
}

export async function restoreWithSafetyBackup(b: Backup, validTargets: Set<string>, database: StudyDB = db) {
  const before = await exportBackup(database);
  await downloadJSON(before, `日语小步-恢复前-${Date.now()}.json`);
  return restoreBackup(b, validTargets, database);
}
