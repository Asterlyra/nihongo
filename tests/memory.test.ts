import { beforeEach, afterEach, expect, it, describe, vi } from 'vitest';
import { StudyDB } from '../src/data/db';
import { beginSession, beginToday, introduceWord, assignCurrent, reveal, submitPractice, submitReview, undo } from '../src/data/store';
import { dailyStats, dayKey, measuredReviews, recentDays, shouldAutoPlay, todayQueue, aggregateDays } from '../src/domain/statistics';
import { newCountCard, newCard, schedule, memoryBranches, memoryProbability } from '../src/domain/scheduler';
import { exportBackup, validateImport, restoreBackup } from '../src/data/backup';
import type { Practice, ReviewEvent, Word } from '../src/types';
const NOW=Date.UTC(2026,9,10,5),zone='Asia/Shanghai',ids=new Set(['w001','w002']);
const word:Word={id:'w001',writing:'水',reading:'みず',meaning:'水',pos:'名詞',unit:1,collocation:'水を飲む',note:'',audioText:'みず'};
let db:StudyDB;
beforeEach(async()=>{db=new StudyDB(`memory-test-${crypto.randomUUID()}`);await db.open();await db.settings.add({id:'settings',listening:false,furigana:true,timezone:zone});});
afterEach(async()=>{vi.restoreAllMocks();await db.delete();});
const event=(id:string,target:string,rating:number,at=NOW):ReviewEvent=>{const before=newCard(target,'meaning',at);return {id,cardId:before.id,at,rating,before,after:schedule(before,rating,at).after,schedulerVersion:'ts-fsrs@5.4.2',configId:'fsrs-v1-retention90',rawLog:{}};};

describe('统计口径与日期边界',()=>{
  it('每日词汇清单合并多能力与重复练习，排除撤销和查词，保留实际时间',()=>{
    const reviews=[event('meaning','w001',1,NOW+10),{...event('reading','w001',3,NOW+20),before:{...newCard('w001','reading',NOW),skill:'reading' as const}}, {...event('undone','w002',3,NOW+40),revertedAt:NOW+50}];
    const practices:Practice[]=[{id:'recap',targetId:'w001',at:NOW+30,skill:'meaning',rating:3,source:'today'},{id:'onlyPractice',targetId:'w002',at:NOW+60,skill:'meaning',rating:1,source:'practice'},{id:'lookup',targetId:'w002',at:NOW+80,skill:'lookup'}];
    const s=dailyStats(dayKey(NOW,zone),[{id:'w001',introducedAt:NOW}],reviews,practices,ids,zone);
    expect(s.words).toEqual(['w001']);
    expect(s.records).toEqual([{id:'w001',introduced:true,reviewCount:2,practiceCount:1,firstAt:NOW,lastAt:NOW+30,lastRating:3},{id:'w002',introduced:false,reviewCount:0,practiceCount:1,firstAt:NOW+60,lastAt:NOW+60,lastRating:undefined}]);
    expect(dailyStats(dayKey(NOW+86400_000,zone),[{id:'w001',introducedAt:NOW}],reviews,practices,ids,zone).records).toEqual([]);
  });
  it('新词和多张卡按词合并，正式反馈与回顾分开，撤销不计入',()=>{const es=[event('1','w001',3),event('2','w001',2),event('3','w002',1),{...event('4','w002',3),revertedAt:NOW+1},event('5','g01',3)];const practices:Practice[]=[{id:'p1',targetId:'w001',at:NOW,skill:'meaning',rating:1,source:'today'},{id:'p2',targetId:'w001',at:NOW,skill:'meaning',rating:3,source:'today'},{id:'p3',targetId:'w002',at:NOW,skill:'meaning',rating:3},{id:'lookup',targetId:'w002',at:NOW,skill:'lookup'}];const s=dailyStats('2026-10-10',[{id:'w001',introducedAt:NOW},{id:'g01',readAt:NOW}],es,practices,ids,zone);expect(s.introduced).toEqual(['w001']);expect(s.reviewed).toEqual(['w001','w002']);expect(s.words).toEqual(['w001','w002']);expect(s.formal).toHaveLength(4);expect(s.recap).toHaveLength(3);expect(s.recapWords).toEqual(['w001']);expect(s.feedback).toEqual([{rating:3,count:2},{rating:2,count:1},{rating:1,count:1}]);expect(aggregateDays([{id:'w001',introducedAt:NOW}],es,practices,ids,zone).get('2026-10-10')).toEqual(s);});
  it('午夜和切换统计时区只改变日期归属',()=>{const at=Date.UTC(2026,9,10,15,30);expect(dayKey(at,zone)).toBe('2026-10-10');expect(dayKey(at,'Asia/Tokyo')).toBe('2026-10-11');const e=event('1','w001',3,at);expect(dailyStats('2026-10-11',[],[e],[],ids,zone).words).toHaveLength(0);expect(dailyStats('2026-10-11',[],[e],[],ids,'Asia/Tokyo').words).toEqual(['w001']);expect(e.at).toBe(at);});
  it('跨夏令时的趋势仍包含连续日历日期',()=>{expect(recentDays(Date.UTC(2026,2,9,16),'America/New_York',3)).toEqual(['2026-03-07','2026-03-08','2026-03-09']);});
  it('能力表现只取每卡每日首次非初学、非撤销反馈',()=>{const first=event('1','w001',1);first.before.fsrs.reps=2;const second={...event('2','w001',3,NOW+1),before:first.before};const reverted={...event('0','w001',3,NOW-1),before:first.before,revertedAt:NOW};expect(measuredReviews([second,reverted,first,event('new','w002',3)],new Set(['2026-10-10']),zone)).toEqual([first]);});
});
describe('今日回顾与反馈确认',()=>{
  it('今日回顾每词一次，刷新续学，三档反馈不改 FSRS 或正式日志',async()=>{await introduceWord(word,true,NOW,db);await db.cards.add(newCountCard('w002','meaning',NOW));await db.progress.add({id:'w002',introducedAt:NOW});await beginToday(ids,zone,NOW,db);const before=await db.cards.toArray();let session=(await db.sessions.get('active'))!;expect(todayQueue(before,session)).toHaveLength(2);const c=todayQueue(before,session)[0];await assignCurrent(c.id,false,NOW,db);await reveal(false,NOW,db,2);expect((await db.sessions.get('active'))?.pendingRating).toBe(2);expect(await db.practices.count()).toBe(0);await submitPractice(c,2,NOW,db);db.close();await db.open();session=(await db.sessions.get('active'))!;expect(session.completed).toEqual([c.id]);expect(todayQueue(before,session).map(c=>c.targetId)).toEqual(['w002']);expect(await db.cards.toArray()).toEqual(before);expect(await db.reviews.count()).toBe(0);expect((await db.practices.toArray())[0]).toMatchObject({source:'today',rating:2});const next=todayQueue(before,session)[0];await assignCurrent(next.id,false,NOW,db);await reveal(false,NOW,db);await submitPractice(next,1,NOW,db);expect(todayQueue(before,(await db.sessions.get('active'))!)).toHaveLength(0);});
  it('今日批次剔除撤销事件和昨天新词，但含今天复习的旧词',async()=>{await introduceWord(word,false,NOW-86400_000,db);await db.reviews.bulkAdd([event('valid','w001',1),{...event('undone','w002',3),revertedAt:NOW}]);expect((await beginToday(ids,zone,NOW,db)).batch).toEqual(['w001']);});
  it('今日回顾不可写入正式调度，并发提交只保存一次',async()=>{await introduceWord(word,false,NOW,db);const session=await beginToday(ids,zone,NOW,db);const c=todayQueue(await db.cards.toArray(),session)[0];await assignCurrent(c.id,false,NOW,db);await reveal(false,NOW,db);await expect(submitReview(c,3,'wrong',NOW,db)).rejects.toThrow('练习记录');const results=await Promise.allSettled([submitPractice(c,3,NOW,db),submitPractice(c,1,NOW,db)]);expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(await db.practices.count()).toBe(1);expect(await db.reviews.count()).toBe(0);});
  it('回顾写入失败时，完成队列也回滚',async()=>{await introduceWord(word,false,NOW,db);const s=await beginToday(ids,zone,NOW,db);const c=todayQueue(await db.cards.toArray(),s)[0];await assignCurrent(c.id,false,NOW,db);await reveal(false,NOW,db);vi.spyOn(db.sessions,'put').mockRejectedValueOnce(new Error('write failed'));await expect(submitPractice(c,3,NOW,db)).rejects.toThrow('write failed');expect(await db.practices.count()).toBe(0);expect((await db.sessions.get('active'))?.completed).toEqual([]);});
  it('预选等级持久化但不评分；最终可修正并撤销',async()=>{await beginSession('review',[],NOW,db);await introduceWord(word,false,NOW,db);const c=(await db.cards.toArray())[0];await assignCurrent(c.id,false,NOW+60_000,db);await reveal(false,NOW+60_000,db,3);expect(await db.reviews.count()).toBe(0);expect(await db.cards.get(c.id)).toEqual(c);await submitReview(c,1,'fixed',NOW+60_000,db);expect((await db.reviews.get('fixed'))?.rating).toBe(1);await undo(NOW+61_000,db);expect((await db.sessions.get('active'))?.pendingRating).toBe(3);expect((await db.reviews.get('fixed'))?.revertedAt).toBe(NOW+61_000);});
});
describe('曲线与音频策略',()=>{
  it('三档曲线使用实际调度结果，概率在有效范围且递减，90%时长等于稳定性',()=>{let c=schedule(newCard('w001','meaning',NOW),3,NOW+60_000).after;c=schedule(c,3,c.dueAt).after;const before=JSON.stringify(c);const branches=memoryBranches(c,c.dueAt,30);expect(new Set(branches.map(b=>b.stability)).size).toBe(3);for(const b of branches){expect(b.dueAt).toBe(schedule(c,b.rating,c.dueAt).after.dueAt);expect(memoryProbability(b.stability,b.stability)).toBeCloseTo(.9,6);expect(b.points[0].probability).toBe(1);b.points.forEach((p,i)=>{expect(p.probability).toBeGreaterThanOrEqual(0);expect(p.probability).toBeLessThanOrEqual(1);if(i)expect(p.probability).toBeLessThanOrEqual(b.points[i-1].probability);});}expect(JSON.stringify(c)).toBe(before);});
  it('音频关闭、读音或假名正面均不自动泄露答案；听辨与词义可自动播放',()=>{expect(shouldAutoPlay('reading',false,false,true)).toBe(false);expect(shouldAutoPlay('kana',false,false,true)).toBe(false);expect(shouldAutoPlay('reading',false,true,true)).toBe(true);expect(shouldAutoPlay('listening',false,false,true)).toBe(true);expect(shouldAutoPlay('meaning',false,false,true)).toBe(true);expect(shouldAutoPlay(undefined,true,false,false)).toBe(false);});
});
describe('旧备份兼容与新增记录恢复',()=>{
  it('旧设置不含新字段仍可恢复，完整保留旧记录',async()=>{await introduceWord(word,false,NOW,db);const backup=await validateImport(await exportBackup(db));expect(backup.data.settings[0].autoPlay).toBeUndefined();const before=await db.cards.toArray();await restoreBackup(backup,ids,db);expect(await db.cards.toArray()).toEqual(before);expect((await db.settings.get('settings'))?.listeningEnabled).toBeUndefined();});
  it('新设置、回顾来源、预选等级和完成队列在备份中往返',async()=>{await introduceWord(word,false,NOW,db);await db.settings.update('settings',{autoPlay:false,listeningEnabled:false});let s=await beginToday(ids,zone,NOW,db);const c=todayQueue(await db.cards.toArray(),s)[0];await assignCurrent(c.id,false,NOW,db);await reveal(false,NOW,db,2);await submitPractice(c,2,NOW,db);s=(await db.sessions.get('active'))!;const b=await validateImport(await exportBackup(db));await restoreBackup(b,ids,db);expect(await db.sessions.get('active')).toEqual(s);expect((await db.practices.toArray())[0]).toMatchObject({source:'today',rating:2});expect(await db.settings.get('settings')).toMatchObject({autoPlay:false,listeningEnabled:false});});
});

it('其他页面关闭听辨后，旧卡提交被拒绝且历史不变',async()=>{
  await introduceWord(word,true,NOW,db);const c=(await db.cards.toArray()).find(c=>c.skill==='listening')!;
  await beginSession('review',[],NOW+60_000,db);await assignCurrent(c.id,false,NOW+60_000,db);await reveal(false,NOW+60_000,db);
  await db.settings.update('settings',{listeningEnabled:false});
  await expect(submitReview(c,3,'disabled',NOW+60_000,db)).rejects.toThrow('听辨回忆已关闭');
  await beginSession('practice',[],NOW+60_000,db);await assignCurrent(c.id,false,NOW+60_000,db);await reveal(false,NOW+60_000,db);
  await expect(submitPractice(c,3,NOW+60_000,db)).rejects.toThrow('听辨回忆已关闭');
  expect(await db.cards.get(c.id)).toEqual(c);expect(await db.reviews.count()).toBe(0);expect(await db.practices.count()).toBe(0);
});
