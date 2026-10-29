import { db, type StudyDB } from './db';
import { newCountCard, schedule, schedulerIdentity } from '../domain/scheduler';
import { dailyStats, dayKey, isRecap, todayQueue } from '../domain/statistics';
import { selectCards, nextStudyItem } from '../domain/queue';
import { DEFAULT_DAILY_TARGET, validDailyTarget, dailyGoal } from '../domain/daily-goal';
import { plannedNewWords } from '../domain/planning';
import {prepareStudyGroup,validGroupSize} from '../domain/study-group';
import type { LearningCard, Mode, Session, Skill, Word } from '../types';

const uid = () => crypto.randomUUID();
const freshSession = (mode: Mode, now: number, batch: string[] = []): Session => ({ id: 'active', mode, revealed: false, hintUsed: false, updatedAt: now, revision: 0, batch });
export async function setStudyGroupSize(size:number,database:StudyDB=db){
  if(!validGroupSize(size))throw new Error('每组词数需为 1 到 100 的整数。');
  await database.settings.update('settings',{studyGroupSize:size});
}
export async function beginSession(mode: Mode, batch: string[] = [], now = Date.now(), database: StudyDB = db) {
  const previous = await database.sessions.get('active');
  if (previous?.mode === mode && !batch.length) return previous;
  const s = { ...freshSession(mode, now, batch), dailyExtra:previous?.dailyExtra,studyGroup:previous?.studyGroup,lastTargetId:previous?.lastTargetId, revision: (previous?.revision ?? -1) + 1 };
  await database.sessions.put(s);
  return s;
}
export async function setDailyWordTarget(target:number,database:StudyDB=db){
  if(!validDailyTarget(target))throw new Error('每日词汇量需为 0 到 50000 的整数，0 表示不限。');
  await database.transaction('rw',[database.settings,database.sessions],async()=>{
    await database.settings.update('settings',{dailyWordTarget:target});
    const session=await database.sessions.get('active');
    if(session?.dailyExtra)await database.sessions.put({...session,dailyExtra:undefined,revision:session.revision+1});
  });
}
export async function continueDailyWords(amount:number,validWords:Set<string>,now=Date.now(),database:StudyDB=db){
  if(!Number.isInteger(amount)||amount<1||amount>100)throw new Error('继续学习数量无效。');
  return database.transaction('rw',[database.settings,database.sessions,database.progress,database.reviews],async()=>{
    const settings=await database.settings.get('settings');const day=dayKey(now,settings?.timezone);
    const done=dailyStats(day,await database.progress.toArray(),await database.reviews.toArray(),[],validWords,settings?.timezone??'Asia/Shanghai').words.length;
    const old=await database.sessions.get('active')??freshSession('new',now);
    const dailyExtra={day,target:settings?.dailyWordTarget??DEFAULT_DAILY_TARGET,limit:done+amount};
    await database.sessions.put({...old,dailyExtra,revision:old.revision+1,updatedAt:now});
  });
}
export async function beginToday(validWords: Set<string>, timezone: string, now = Date.now(), database: StudyDB = db) {
  return database.transaction('rw', [database.sessions,database.progress,database.reviews], async()=>{
    const day=dayKey(now,timezone);
    const stats=dailyStats(day,await database.progress.toArray(),await database.reviews.toArray(),[],validWords,timezone);
    const old=await database.sessions.get('active');
    const session:Session={...freshSession('today',now,stats.words),dailyExtra:old?.dailyExtra,studyGroup:old?.studyGroup,lastTargetId:old?.lastTargetId,day,completed:[],revision:(old?.revision??-1)+1};
    await database.sessions.put(session);return session;
  });
}
export async function assignCurrent(activeId: string, isIntroduction: boolean, now = Date.now(), database: StudyDB = db) {
  return database.transaction('rw', database.sessions, async () => {
    const old = await database.sessions.get('active') ?? freshSession('recommended', now);
    if (old.activeId === activeId && old.isIntroduction === isIntroduction) return old;
    const s = { ...old, activeId, isIntroduction, revealed: false, hintUsed: false, revealedAt: undefined, pendingRating: undefined, updatedAt: now, revision: old.revision + 1 };
    await database.sessions.put(s); return s;
  });
}
export async function introduceWord(word: Word, listening = false, now = Date.now(), database: StudyDB = db) {
  await database.transaction('rw', [database.progress, database.cards, database.sessions, database.settings,database.guards], async () => {
    const old = await database.progress.get(word.id);
    if (!old?.introducedAt) {
      await database.progress.put({ ...old, id: word.id, introducedAt: now });
      const skills: Skill[] = ['meaning'];
      if (/[\u3400-\u9fff]/.test(word.writing)) skills.push('reading');
      if (listening) skills.push('listening');
      for (const skill of skills) { const c = newCountCard(word.id, skill, now); if (!await database.cards.get(c.id)) await database.cards.add(c); }
      const guards=await database.guards.toArray();
      await database.guards.bulkPut([...guards.filter(g=>g.id!==word.id&&(g.gap??0)>0).map(g=>({...g,gap:Math.max(0,(g.gap??0)-1)})),{id:word.id,at:now,gap:1}]);
    }
    const settings=await database.settings.get('settings');
    if(settings?.plannedWordIds?.includes(word.id))await database.settings.update('settings',{plannedWordIds:settings.plannedWordIds.filter(id=>id!==word.id),planUpdatedAt:now});
    const s = await database.sessions.get('active');
    if (s?.activeId === word.id) await database.sessions.put({ ...s,lastTargetId:word.id, batch:s.mode==='new'&&s.batch.length?[...new Set([...s.batch,word.id])]:s.batch, activeId: undefined, isIntroduction: false, revealed: false, hintUsed: false, lastEventId:undefined, updatedAt: now, revision: s.revision + 1 });
  });
}
export async function addCard(targetId: string, skill: Skill, now = Date.now(), database: StudyDB = db) {
  const c = newCountCard(targetId, skill, now);
  await database.transaction('rw', database.cards, async () => { if (!await database.cards.get(c.id)) await database.cards.add(c); });
}
export async function reveal(hintUsed = false, now = Date.now(), database: StudyDB = db, pendingRating?: number) {
  if (pendingRating !== undefined && ![1,2,3].includes(pendingRating)) throw new Error('反馈类型无效。');
  await database.transaction('rw', [database.sessions, database.guards, database.cards], async () => {
    const s = await database.sessions.get('active'); if (!s?.activeId || s.isIntroduction) return;
    const c = await database.cards.get(s.activeId); if (!c) return;
    await database.sessions.put({ ...s, revealed: true, pendingRating: pendingRating ?? s.pendingRating, hintUsed: s.hintUsed || hintUsed, revealedAt: s.revealedAt ?? now, updatedAt: now, revision: s.revision + 1 });
    await database.guards.put({ id: c.targetId, at: now, exceptCard: isRecap(s.mode) ? undefined : c.id, gap:c.count?1:undefined });
  });
}
export async function submitReview(card: LearningCard, rating: number, eventId: string = uid(), now = Date.now(), database: StudyDB = db) {
  return database.transaction('rw', [database.cards, database.reviews, database.sessions, database.guards, database.settings], async () => {
    if (await database.reviews.get(eventId)) throw new Error('这次反馈已经保存，请继续下一项。');
    const current = await database.cards.get(card.id); const s = await database.sessions.get('active');
    if (!current || current.revision !== card.revision || current.paused || s?.activeId !== card.id) throw new Error('这张卡片已在其他页面变化，请重新开始本轮。');
    if (current.skill==='listening' && (await database.settings.get('settings'))?.listeningEnabled===false) throw new Error('听辨回忆已关闭，请切换其他卡片。');
    if (!s.revealed) throw new Error('请先回忆并展开答案。');
    if (!isRecap(s.mode)) {
      if(s.revealedAt!==undefined&&now-s.revealedAt>10*60_000)throw new Error('答案已展开较久，请重新回忆。');
      const guard = await database.guards.get(current.targetId);
      if (!selectCards([current], guard ? [guard] : [], now, s.mode, s.batch,(await database.settings.get('settings'))?.timezone).length) throw new Error('这张卡片还没有到复习时间，请使用自由练习。');
      const result = schedule(current, rating, now, s.hintUsed,(await database.settings.get('settings'))?.timezone);
      const guardBefore = await database.guards.get(current.targetId);
      const guardsBefore=current.count?(await database.guards.toArray()).filter(g=>g.id===current.targetId||(g.gap??0)>0):undefined;
      const guardAfter = { id: current.targetId, at: now, exceptCard: current.count?undefined:current.id, gap:current.count?1:undefined };
      const guardsAfter=guardsBefore?[...guardsBefore.filter(g=>g.id!==current.targetId).map(g=>({...g,gap:Math.max(0,(g.gap??0)-1)})),guardAfter].sort((a,b)=>a.id.localeCompare(b.id)):undefined;
      const afterSession: Session = { ...s,lastTargetId:current.targetId, activeId: undefined, revealed: false, hintUsed: false, revealedAt: undefined, pendingRating: undefined, updatedAt: now, revision: s.revision + 1, lastEventId: eventId };
      await database.reviews.add({ id: eventId, cardId: current.id, at: now, rating: result.rating, before: current, after: result.after, sessionBefore: s, sessionAfter: afterSession, guardBefore, guardAfter, rawLog: result.rawLog, ...schedulerIdentity(current), guardsBefore, guardsAfter });
      await database.cards.put(result.after); if(guardsAfter)await database.guards.bulkPut(guardsAfter);else await database.guards.put(guardAfter); await database.sessions.put(afterSession);
      return result.after;
    }
    throw new Error('今日回顾和自由练习应保存到练习记录。');
  });
}
export async function submitPractice(card: LearningCard, rating: number, now = Date.now(), database: StudyDB = db) {
  await database.transaction('rw', [database.practices, database.sessions, database.cards, database.settings], async () => {
    const s = await database.sessions.get('active');
    if (!s || !isRecap(s.mode) || s.activeId !== card.id || !s.revealed) throw new Error('练习状态已变化，请重新选择。');
    if (![1,2,3].includes(rating)) throw new Error('反馈类型无效。');
    const current=await database.cards.get(card.id);
    if (!current || current.paused || current.revision!==card.revision || (s.mode==='today' && !todayQueue([current],s).length)) throw new Error('这张卡片已变化，请重新选择。');
    if (current.skill==='listening' && (await database.settings.get('settings'))?.listeningEnabled===false) throw new Error('听辨回忆已关闭，请切换其他卡片。');
    await database.practices.add({ id: uid(), source:s.mode==='today'?'today':'practice', targetId: card.targetId, skill: card.skill, at: now, rating: s.hintUsed ? 1 : rating });
    await database.sessions.put({ ...s, completed:s.mode==='today'?[...new Set([...(s.completed??[]),card.id])]:s.completed, activeId: undefined, revealed: false, hintUsed: false, revealedAt: undefined, pendingRating: undefined, updatedAt: now, revision: s.revision + 1 });
  });
}
// Passive lookup exposes an answer but never advances the memory state.
export async function recordExposure(targetId: string, now = Date.now(), database: StudyDB = db) {
  await database.transaction('rw', [database.guards, database.sessions, database.cards], async () => {
    const cards = await database.cards.where('targetId').equals(targetId).toArray();
    if (!cards.length) return;
    const s = await database.sessions.get('active');
    const current = cards.find(c => c.id === s?.activeId);
    await database.guards.put({ id: targetId, at: now, exceptCard: current && !isRecap(s?.mode) ? current.id : undefined,gap:cards.some(c=>c.count)?1:undefined });
    if (current && s) await database.sessions.put({ ...s, revealed: true, hintUsed: true, revealedAt: s.revealedAt ?? now, revision: s.revision + 1, updatedAt: now });
  });
}
export async function undo(now = Date.now(), database: StudyDB = db) {
  await database.transaction('rw', [database.cards, database.reviews, database.sessions, database.guards], async () => {
    const s = await database.sessions.get('active'); const e = s?.lastEventId && await database.reviews.get(s.lastEventId);
    if (!e || e.revertedAt) throw new Error('没有可撤销的反馈。');
    const c = await database.cards.get(e.cardId); const guard = await database.guards.get(e.before.targetId);
    if (!c || c.revision !== e.after.revision || guard?.at !== e.guardAfter?.at) throw new Error('已经开始后续学习，无法安全撤销这次反馈。');
    if(e.guardsAfter&&JSON.stringify((await database.guards.toArray()).filter(g=>e.guardsAfter!.some(after=>after.id===g.id)).sort((a,b)=>a.id.localeCompare(b.id)))!==JSON.stringify(e.guardsAfter))throw new Error('已经开始后续学习，无法安全撤销这次反馈。');
    await database.cards.put(e.before);
    await database.reviews.update(e.id, { revertedAt: now });
    if(e.guardsBefore){for(const g of e.guardsAfter??[])if(!e.guardsBefore.some(before=>before.id===g.id))await database.guards.delete(g.id);await database.guards.bulkPut(e.guardsBefore);}else if (e.guardBefore) await database.guards.put(e.guardBefore); else await database.guards.delete(e.before.targetId);
    if (e.sessionBefore) await database.sessions.put({ ...e.sessionBefore, revision: (s?.revision ?? 0) + 1, lastEventId: undefined, updatedAt: now });
  });
}
export async function clearCurrent(database: StudyDB = db) {
  await database.transaction('rw', database.sessions, async () => {
    const s = await database.sessions.get('active');
    if (s) await database.sessions.put({ ...s, activeId: undefined, revealed: false, hintUsed: false, revealedAt: undefined, pendingRating: undefined, revision: s.revision + 1, updatedAt: Date.now() });
  });
}
export async function deferCurrent(now = Date.now(), database: StudyDB = db) {
  await database.transaction('rw', [database.cards, database.sessions, database.guards], async () => {
    const s = await database.sessions.get('active');
    if (!s?.activeId) return;
    const c = await database.cards.get(s.activeId);
    if (c) await database.guards.put({ id: c.targetId, at: now,gap:c.count?1:undefined });
    await database.sessions.put({ ...s, activeId: undefined, revealed: false, hintUsed: false, revealedAt: undefined, pendingRating: undefined, revision: s.revision + 1, updatedAt: now });
  });
}
export async function pauseCard(id: string, paused: boolean) {
  await db.transaction('rw', [db.cards, db.sessions], async () => {
    const c = await db.cards.get(id); if (c) await db.cards.put({ ...c, paused, revision: c.revision + 1 });
    const s = await db.sessions.get('active'); if (s?.activeId === id) await db.sessions.put({ ...s, activeId: undefined, revision: s.revision + 1 });
  });
}
export async function toggleFavorite(wordId: string, deckId = 'favorites') {
  await db.transaction('rw', db.decks, async () => {
    const deck = await db.decks.get(deckId); if (!deck) return;
    await db.decks.put({ ...deck, wordIds: deck.wordIds.includes(wordId) ? deck.wordIds.filter(id => id !== wordId) : [...deck.wordIds, wordId] });
  });
}
export async function recordRead(id: string, position?: number) {
  await db.transaction('rw', db.progress, async () => { const old = await db.progress.get(id); await db.progress.put({ ...old, id, readAt: old?.readAt ?? Date.now(), position }); });
}
export async function recordExercise(id: string, correct: boolean, questionId: string, database: StudyDB = db, now = Date.now()) {
  await database.transaction('rw', [database.progress, database.practices], async () => {
    const old = await database.progress.get(id); await database.progress.put({ ...old, id, practicedAt: now, results: { ...old?.results, [questionId]: correct } });
    await database.practices.add({ id: uid(), targetId: id, skill: 'exercise', at: now, correct });
  });
}

// Planning is an intention. It never creates cards or a learning event.
export async function addToPlan(ids:string[],validWords:Set<string>,now=Date.now(),database:StudyDB=db){
  if(ids.some(id=>!validWords.has(id)))throw new Error('选择中有不存在的单词，请刷新词库。');
  return database.transaction('rw',[database.settings,database.progress],async()=>{
    const settings=await database.settings.get('settings');if(!settings)throw new Error('设置尚未就绪。');
    const known=new Set((await database.progress.toArray()).filter(p=>p.introducedAt!==undefined).map(p=>p.id));
    const before=settings.plannedWordIds??[];const next=[...new Set([...before,...ids.filter(id=>!known.has(id))])];
    await database.settings.update('settings',{plannedWordIds:next,planUpdatedAt:now});return next.length-before.length;
  });
}
export async function editPlan(id:string,action:'remove'|'up'|'down',now=Date.now(),database:StudyDB=db){
  await database.transaction('rw',database.settings,async()=>{
    const settings=await database.settings.get('settings');if(!settings)throw new Error('设置尚未就绪。');
    const ids=[...(settings.plannedWordIds??[])],index=ids.indexOf(id);if(index<0)return;
    if(action==='remove')ids.splice(index,1);
    else {const other=index+(action==='up'?-1:1);if(other<0||other>=ids.length)return;[ids[index],ids[other]]=[ids[other],ids[index]];}
    await database.settings.update('settings',{plannedWordIds:ids,planUpdatedAt:now});
  });
}

export async function beginNextRound(database:StudyDB=db){
  await database.transaction('rw',[database.guards,database.sessions],async()=>{const guards=await database.guards.toArray();await database.guards.bulkPut(guards.map(g=>({...g,gap:0,exceptCard:undefined})));const s=await database.sessions.get('active');if(s)await database.sessions.put({...s,activeId:undefined,revealed:false,hintUsed:false,pendingRating:undefined,revealedAt:undefined,lastEventId:undefined,revision:s.revision+1});});
}


export async function advanceStudy(catalog:Word[],validTargets:Set<string>,practiceIndex=0,now=Date.now(),database:StudyDB=db){
  return database.transaction('rw',[database.cards,database.guards,database.sessions,database.settings,database.progress,database.reviews],async()=>{
    const session=await database.sessions.get('active')??freshSession('recommended',now);
    if(session.activeId)return session;
    const settings=await database.settings.get('settings'),timezone=settings?.timezone??'Asia/Shanghai';
    const progress=await database.progress.toArray();
    const cards=(await database.cards.toArray()).filter(c=>validTargets.has(c.targetId)&&(settings?.listeningEnabled!==false||c.skill!=='listening'));
    const day=dayKey(now,timezone),knownWords=new Set(catalog.map(w=>w.id));
    const reviews=await database.reviews.toArray();
    const done=dailyStats(day,progress,reviews,[],knownWords,timezone).words.length;
    const goal=dailyGoal(settings?.dailyWordTarget,done,day,session);
    const candidates=plannedNewWords(catalog,progress,settings?.plannedWordIds).filter(w=>session.mode!=='new'||!session.batch.length||session.batch.includes(w.id)||settings?.plannedWordIds?.includes(w.id));
    const grouped=prepareStudyGroup({session,size:settings?.studyGroupSize,newIds:candidates.map(w=>w.id),progress,reviews,cards,validWords:knownWords,now,remaining:goal.remaining,allowNew:!goal.reached});
    const next=nextStudyItem({cards,guards:await database.guards.toArray(),now,session:grouped.session,newIds:grouped.newIds,pendingRecallIds:grouped.state.pending,allowNew:!goal.reached,orderedNew:grouped.newIds.some(id=>settings?.plannedWordIds?.includes(id))||session.mode==='new',practiceIndex,timezone});
    if(!next)return session;
    const after={...grouped.session,lastTargetId:next.isIntroduction?next.id:cards.find(c=>c.id===next.id)?.targetId,activeId:next.id,isIntroduction:next.isIntroduction,revealed:false,hintUsed:false,revealedAt:undefined,pendingRating:undefined,updatedAt:now,revision:session.revision+1};
    await database.sessions.put(after);return after;
  });
}
