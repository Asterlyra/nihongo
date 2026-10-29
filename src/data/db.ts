import manifest from '../../content/manifest.json';
import { migrateCountCard } from '../domain/migration';
import Dexie, { type EntityTable } from 'dexie';
import type { LearningCard, Progress, Guard, ReviewEvent, Practice, Deck, Note, Settings, Session, StoredMeta } from '../types';

export class StudyDB extends Dexie {
  cards!: EntityTable<LearningCard, 'id'>;
  progress!: EntityTable<Progress, 'id'>;
  guards!: EntityTable<Guard, 'id'>;
  reviews!: EntityTable<ReviewEvent, 'id'>;
  practices!: EntityTable<Practice, 'id'>;
  decks!: EntityTable<Deck, 'id'>;
  notes!: EntityTable<Note, 'id'>;
  settings!: EntityTable<Settings, 'id'>;
  sessions!: EntityTable<Session, 'id'>;
  meta!: EntityTable<StoredMeta, 'id'>;
  constructor(name = 'nihongo-kobumi-v1') {
    super(name);
    this.version(1).stores({ cards: 'id,targetId,skill,dueAt,[skill+dueAt]', progress: 'id', guards: 'id', reviews: 'id,cardId,at', practices: 'id,targetId,at', decks: 'id', notes: 'id', settings: 'id', sessions: 'id', meta: 'id' });
    this.version(2).stores({ cards: 'id,targetId,skill,dueAt,[skill+dueAt]', progress: 'id', guards: 'id', reviews: 'id,cardId,at', practices: 'id,targetId,at', decks: 'id', notes: 'id', settings: 'id', sessions: 'id', meta: 'id' }).upgrade(async tx=>{
      const cards=await tx.table('cards').toArray() as LearningCard[];const reviews=await tx.table('reviews').toArray() as ReviewEvent[];const settings=await tx.table('settings').get('settings') as Settings|undefined;const timezone=settings?.timezone??'Asia/Shanghai';
      for(const c of cards)if(!c.count)await tx.table('cards').put(migrateCountCard(c,reviews,timezone));
      const session=await tx.table('sessions').get('active');if(session)await tx.table('sessions').put({...session,lastEventId:undefined,revision:session.revision+1});
      await tx.table('meta').put({id:'dataVersion',value:'2'});
    });
  }
}
export const db = new StudyDB();
export async function initialize(validTargets?: Set<string>) {
  await db.transaction('rw', [db.settings, db.decks, db.meta], async () => {
    if (!await db.settings.get('settings')) await db.settings.add({ id: 'settings', listening: false, autoPlay: true, listeningEnabled: true, furigana: true, timezone: 'Asia/Shanghai' });
    if (!await db.decks.get('favorites')) await db.decks.add({ id: 'favorites', name: '我的收藏', wordIds: [] });
    if (!await db.meta.get('dataVersion')) await db.meta.put({ id: 'dataVersion', value: '2' });
  });
  if (validTargets) await reconcileContent(validTargets);
}
export async function reconcileContent(validTargets: Set<string>, database: StudyDB = db) {
  await database.transaction('rw', [database.cards, database.sessions, database.meta], async () => {
    const missing = (await database.cards.toArray()).filter(c => !validTargets.has(c.targetId));
    for (const c of missing) if (!c.paused) await database.cards.put({ ...c, paused: true, revision: c.revision + 1 });
    const s = await database.sessions.get('active');
    if (s?.activeId && (s.isIntroduction ? !validTargets.has(s.activeId) : missing.some(c => c.id === s.activeId))) await database.sessions.put({ ...s, activeId: undefined, revision: s.revision + 1 });
    await database.meta.put({ id: 'contentVersion', value: manifest.contentVersion });
  });
}
