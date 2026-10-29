import { beforeEach, afterEach, expect, it } from 'vitest';
import { StudyDB } from '../src/data/db';
import { beginSession, continueDailyWords, introduceWord, setDailyWordTarget, assignCurrent, reveal, submitReview } from '../src/data/store';
import { dailyGoal } from '../src/domain/daily-goal';
import { dailyStats, dayKey } from '../src/domain/statistics';
import { newCountCard } from '../src/domain/scheduler';
import { exportBackup, validateImport, restoreBackup } from '../src/data/backup';
import type { Word } from '../src/types';

const NOW=Date.UTC(2026,9,11,4),zone='Asia/Shanghai',ids=new Set(['w001','w002']);
const word:Word={id:'w001',writing:'水',reading:'みず',meaning:'水',pos:'名詞',unit:1,collocation:'水を飲む',note:'',audioText:'みず'};
let db:StudyDB;
beforeEach(async()=>{db=new StudyDB(`daily-${crypto.randomUUID()}`);await db.open();await db.settings.put({id:'settings',listening:false,furigana:true,timezone:zone});});
afterEach(async()=>{await db.delete();});

it('默认30词，零不限；超额显示达到目标而非负剩余',()=>{
  expect(dailyGoal(undefined,29,dayKey(NOW))).toMatchObject({target:30,remaining:1,reached:false});
  expect(dailyGoal(30,35,dayKey(NOW))).toMatchObject({remaining:0,reached:true,completed:true});
  expect(dailyGoal(0,99,dayKey(NOW))).toMatchObject({remaining:undefined,reached:false,completed:false});
});
it('调整数量只更新设置，保留今日词汇、卡片、规划与历史',async()=>{
  await introduceWord(word,false,NOW,db);await db.settings.update('settings',{plannedWordIds:['w002']});
  const cards=await db.cards.toArray(),progress=await db.progress.toArray();
  await setDailyWordTarget(10,db);await setDailyWordTarget(50,db);
  expect(await db.cards.toArray()).toEqual(cards);expect(await db.progress.toArray()).toEqual(progress);expect(await db.reviews.count()).toBe(0);
  expect(await db.settings.get('settings')).toMatchObject({dailyWordTarget:50,plannedWordIds:['w002']});
});
it.each([-1,1.5,50001,NaN,Infinity])('无效数量 %s 不覆盖设置',async target=>{
  await setDailyWordTarget(30,db);await expect(setDailyWordTarget(target,db)).rejects.toThrow('整数');expect((await db.settings.get('settings'))?.dailyWordTarget).toBe(30);
});
it('达到目标仍能完成旧词复习，多个能力的反馈不会重复计词',async()=>{
  await setDailyWordTarget(1,db);await introduceWord(word,false,NOW,db);await db.cards.add(newCountCard('w002','meaning',NOW));
  await beginSession('review',[],NOW,db);
  for(const id of ['w001:meaning:v1','w002:meaning:v1','w001:reading:v1']){
    const card=(await db.cards.get(id))!;await assignCurrent(id,false,NOW+1,db);await reveal(false,NOW+1,db);await submitReview(card,3,crypto.randomUUID(),NOW+1,db);
  }
  const stats=dailyStats(dayKey(NOW,zone),await db.progress.toArray(),await db.reviews.toArray(),[],ids,zone);
  expect(stats.words).toEqual(['w001','w002']);expect(stats.formal).toHaveLength(3);expect(dailyGoal(1,stats.words.length,dayKey(NOW))).toMatchObject({done:2,reached:true});
});
it('继续加词在当天刷新和切换模式后保留，次日失效；调小目标不会清空记录',async()=>{
  await introduceWord(word,false,NOW,db);await setDailyWordTarget(1,db);await beginSession('new',[word.id],NOW,db);
  await continueDailyWords(5,ids,NOW,db);await beginSession('review',[],NOW,db);db.close();await db.open();
  const session=(await db.sessions.get('active'))!;
  expect(dailyGoal(1,1,dayKey(NOW),session)).toMatchObject({target:1,limit:6,reached:false,completed:true});
  expect(dailyGoal(1,1,dayKey(NOW+86400_000),session).reached).toBe(true);
  await setDailyWordTarget(0,db);expect((await db.sessions.get('active'))?.dailyExtra).toBeUndefined();expect(await db.progress.get(word.id)).toMatchObject({introducedAt:NOW});
});
it('备份保留数量与当天继续额度，旧备份无新字段仍可恢复',async()=>{
  const old=await validateImport(await exportBackup(db));await setDailyWordTarget(30,db);await continueDailyWords(5,ids,NOW,db);
  const backup=await validateImport(await exportBackup(db));await restoreBackup(backup,ids,db);
  expect((await db.settings.get('settings'))?.dailyWordTarget).toBe(30);expect((await db.sessions.get('active'))?.dailyExtra).toEqual({day:dayKey(NOW),target:30,limit:5});
  await restoreBackup(old,ids,db);expect((await db.settings.get('settings'))?.dailyWordTarget).toBeUndefined();expect(dailyGoal(undefined,0,dayKey(NOW)).target).toBe(30);
});
it('完整性校验通过但目标为小数的备份仍被拒绝',async()=>{
  await setDailyWordTarget(30,db);const {checksum:_,...body}=await exportBackup(db);body.data.settings[0].dailyWordTarget=1.5;
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body)));
  const checksum=Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,'0')).join('');
  await expect(validateImport({...body,checksum})).rejects.toThrow('结构');expect((await db.settings.get('settings'))?.dailyWordTarget).toBe(30);
});
