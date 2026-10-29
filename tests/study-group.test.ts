import {afterEach,beforeEach,expect,it} from 'vitest';
import {StudyDB} from '../src/data/db';
import {setStudyGroupSize,beginSession,advanceStudy,introduceWord,reveal,submitReview,undo,beginToday} from '../src/data/store';
import {exportBackup,restoreBackup,validateImport} from '../src/data/backup';
import {studyGroupProgress} from '../src/domain/study-group';
import {requiredReviews,nextStudyItem} from '../src/domain/queue';
import type {Word} from '../src/types';
const NOW=Date.UTC(2026,9,12,3);
const words:Word[]=Array.from({length:9},(_,i)=>({id:`w${i}`,writing:`词${i}`,reading:'ことば',meaning:'词',pos:'名詞',unit:1,collocation:'',note:'',audioText:'ことば'}));
const valid=new Set(words.map(w=>w.id));
let database:StudyDB;
beforeEach(async()=>{database=new StudyDB(`groups-${crypto.randomUUID()}`);await database.open();await database.settings.put({id:'settings',listening:false,furigana:true,timezone:'Asia/Shanghai',dailyWordTarget:30});});
afterEach(async()=>{await database.delete();});
it('每组词数与每日数量独立，修改不截断现有组或清除历史',async()=>{
 const session={id:'active' as const,mode:'recommended' as const,batch:[],revealed:false,hintUsed:false,updatedAt:100,revision:0,studyGroup:{wordIds:['w1','w2'],startedAt:100}};
 await database.sessions.put(session);await database.progress.put({id:'w1',introducedAt:100});
 await setStudyGroupSize(8,database);
 expect(await database.settings.get('settings')).toMatchObject({dailyWordTarget:30,studyGroupSize:8});expect(await database.sessions.get('active')).toEqual(session);expect(await database.progress.count()).toBe(1);
});
it.each([0,-1,1.5,101,NaN,Infinity])('非法组大小 %s 不保存',async size=>{
 await expect(setStudyGroupSize(size,database)).rejects.toThrow('整数');expect((await database.settings.get('settings'))?.studyGroupSize).toBeUndefined();
});
it('小组和最近词随备份恢复，旧备份缺省字段仍可恢复',async()=>{
 const old=await validateImport(await exportBackup(database));await setStudyGroupSize(3,database);
 await database.sessions.put({id:'active',mode:'recommended',batch:[],revealed:false,hintUsed:false,updatedAt:100,revision:0,lastTargetId:'w1',studyGroup:{wordIds:['w1','w2'],startedAt:100}});
 const backup=await validateImport(await exportBackup(database));await restoreBackup(backup,new Set(['w1','w2']),database);
 expect((await database.settings.get('settings'))?.studyGroupSize).toBe(3);expect((await database.sessions.get('active'))?.studyGroup?.wordIds).toEqual(['w1','w2']);expect((await database.sessions.get('active'))?.lastTargetId).toBe('w1');
 await restoreBackup(old,new Set(['w1','w2']),database);expect((await database.settings.get('settings'))?.studyGroupSize).toBeUndefined();expect(await database.sessions.count()).toBe(0);
});
it('介绍完整组后仍不能开下一组，必须每词独立回忆一次；忘记的旧词带入下一组',async()=>{
 await setStudyGroupSize(2,database);await beginSession('new',['w0','w1','w2','w3'],NOW,database);
 let at=NOW,initial:string[]|undefined,openedNext=false;
 for(let i=0;i<30;i++){
  const s=await advanceStudy(words,valid,0,++at,database);initial??=s.studyGroup?.wordIds;
  if(s.studyGroup?.startedAt!==NOW+1){
   const state=studyGroupProgress({wordIds:initial!,startedAt:NOW+1},await database.progress.toArray(),await database.reviews.toArray(),await database.cards.toArray(),valid);
   expect(state.done).toHaveLength(2);expect(s.studyGroup?.wordIds).toEqual(['w2','w3']);openedNext=true;break;
  }
  if(s.isIntroduction){expect(initial).toContain(s.activeId);await introduceWord(words.find(w=>w.id===s.activeId)!,false,at,database);}
  else{const c=(await database.cards.get(s.activeId!))!;expect(initial).toContain(c.targetId);await reveal(false,at,database);await submitReview(c,1,`initial-${i}`,at,database);}
 }
 expect(openedNext).toBe(true);expect(requiredReviews(await database.cards.toArray(),at)).not.toHaveLength(0);
 const oldTargets=new Set(initial);let sawOld=false,sawNew=false;
 for(let i=0;i<30&&!(sawOld&&sawNew);i++){
  const s=await advanceStudy(words,valid,0,++at,database);
  if(s.isIntroduction){sawNew=true;await introduceWord(words.find(w=>w.id===s.activeId)!,false,at,database);}
  else{const c=(await database.cards.get(s.activeId!))!;sawOld||=oldTargets.has(c.targetId);await reveal(false,at,database);await submitReview(c,3,`next-${i}`,at,database);}
 }
 expect(sawOld).toBe(true);expect(sawNew).toBe(true);
});
it('使用提示、查阅和被撤销的反馈不能冒充完成首次独立回忆',async()=>{
 await setStudyGroupSize(1,database);await beginSession('new',['w0','w1'],NOW,database);
 const initial=await advanceStudy(words,valid,0,NOW+1,database);await introduceWord(words[0],false,NOW+2,database);
 let s=await advanceStudy(words,valid,0,NOW+3,database),c=(await database.cards.get(s.activeId!))!;
 await reveal(true,NOW+4,database);await submitReview(c,1,'hint',NOW+5,database);
 const state=()=>studyGroupProgress(initial.studyGroup,[],[],[],valid);
 expect(state().done).toHaveLength(0);
 s=await advanceStudy(words,valid,0,NOW+6,database);expect(s.studyGroup?.wordIds).toEqual(['w0']);expect(s.isIntroduction).toBe(false);
 c=(await database.cards.get(s.activeId!))!;await reveal(false,NOW+7,database);await submitReview(c,1,'independent',NOW+8,database);
 s=await advanceStudy(words,valid,0,NOW+9,database);expect(s.studyGroup?.wordIds).toEqual(['w1']);expect(s.isIntroduction).toBe(true);
 await undo(NOW+10,database);expect((await database.sessions.get('active'))?.studyGroup?.wordIds).toEqual(['w0']);
 expect(studyGroupProgress(initial.studyGroup,await database.progress.toArray(),await database.reviews.toArray(),await database.cards.toArray(),valid).done).toHaveLength(0);
});
it('有其他可学词时不连续展示同词，包含关联能力和相同时间戳',async()=>{
 await setStudyGroupSize(3,database);await database.settings.update('settings',{dailyWordTarget:6});await beginSession('new',words.map(w=>w.id),NOW,database);
 let last:string|undefined,ended=false;
 for(let i=0;i<150;i++){
  const before=await database.sessions.get('active'),cards=await database.cards.toArray(),progress=await database.progress.toArray();
  const canAlternate=requiredReviews(cards,NOW).some(c=>c.targetId!==last)||before?.studyGroup?.wordIds.some(id=>id!==last&&!progress.some(p=>p.id===id&&p.introducedAt!==undefined));
  const s=await advanceStudy(words,valid,0,NOW,database);
  if(!s.activeId){ended=true;break;}
  const target=s.isIntroduction?s.activeId:(await database.cards.get(s.activeId))!.targetId;
  if(canAlternate)expect(target).not.toBe(last);last=target;
  if(s.isIntroduction)await introduceWord(words.find(w=>w.id===target)!,false,NOW,database);
  else{const c=(await database.cards.get(s.activeId))!;await reveal(false,NOW,database);await submitReview(c,3,`same-time-${i}`,NOW,database);}
 }
 expect(ended).toBe(true);expect((await database.progress.toArray()).filter(p=>p.introducedAt!==undefined)).toHaveLength(6);
 expect(requiredReviews(await database.cards.toArray(),NOW)).toHaveLength(0);
});
it('调整组大小、跨日、刷新和模式切换保留当前组；下一组使用新大小',async()=>{
 await setStudyGroupSize(2,database);await beginSession('new',words.map(w=>w.id),NOW,database);
 const initial=await advanceStudy(words,valid,0,NOW+1,database);await introduceWord(words[0],false,NOW+2,database);await setStudyGroupSize(3,database);
 await beginSession('practice',[],NOW+3,database);await beginToday(valid,'Asia/Shanghai',NOW+4,database);await beginSession('new',words.map(w=>w.id),NOW+5,database);
 database.close();await database.open();const s=await advanceStudy(words,valid,0,NOW+86400_000,database);expect(s.studyGroup).toEqual(initial.studyGroup);
 let opened=false;
 for(let i=0;i<20;i++){
  const at=NOW+86400_000+i,next=await advanceStudy(words,valid,0,at,database);
  if(next.studyGroup?.startedAt!==initial.studyGroup?.startedAt){expect(next.studyGroup?.wordIds).toHaveLength(3);opened=true;break;}
  if(next.isIntroduction)await introduceWord(words.find(w=>w.id===next.activeId)!,false,at,database);
  else{const c=(await database.cards.get(next.activeId!))!;await reveal(false,at,database);await submitReview(c,1,`resumed-${i}`,at,database);}
 }
 expect(opened).toBe(true);
});
it('完整性正确但组内重复词或非法组大小的备份仍拒绝',async()=>{
 await setStudyGroupSize(3,database);await beginSession('recommended',[],NOW,database);await advanceStudy(words,valid,0,NOW,database);
 const {checksum:_,...body}=await exportBackup(database);body.data.sessions[0].studyGroup!.wordIds=['w0','w0'];
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify(body)));
 const checksum=Array.from(new Uint8Array(hash)).map(v=>v.toString(16).padStart(2,'0')).join('');
 await expect(validateImport({...body,checksum})).rejects.toThrow('结构');expect((await database.sessions.get('active'))?.studyGroup?.wordIds).toHaveLength(3);
});
it('达到每日数量时不增加新词，已有巩固继续，已完成词当天不再出现',async()=>{
 await setStudyGroupSize(5,database);await database.settings.update('settings',{dailyWordTarget:1});await beginSession('recommended',[],NOW,database);
 let completedCard:string|undefined;
 for(let i=0;i<30;i++){
  const s=await advanceStudy(words,valid,0,NOW+i,database);
  if(!s.activeId)break;
  expect(s.studyGroup?.wordIds).toHaveLength(1);
  if(s.isIntroduction)await introduceWord(words.find(w=>w.id===s.activeId)!,false,NOW+i,database);
  else{const c=(await database.cards.get(s.activeId))!;expect(s.activeId).not.toBe(completedCard);await reveal(false,NOW+i,database);const result=await submitReview(c,3,`goal-${i}`,NOW+i,database);if(!result.count?.remaining)completedCard=result.id;}
 }
 expect(await database.progress.count()).toBe(1);expect(requiredReviews(await database.cards.toArray(),NOW+100)).toHaveLength(0);
 const s=(await database.sessions.get('active'))!;
 expect(nextStudyItem({cards:await database.cards.toArray(),guards:await database.guards.toArray(),session:s,now:NOW+100,allowNew:false})).toBeUndefined();
});

it('没有指定批次的新词优先不会在介绍首词后锁死，支持超过五词的组和下一组',async()=>{
 await setStudyGroupSize(8,database);await beginSession('new',[],NOW,database);
 const first=await advanceStudy(words,valid,0,NOW+1,database);expect(first.studyGroup?.wordIds).toHaveLength(8);
 let sawNext=false;
 for(let i=0;i<100;i++){
  const at=NOW+2+i,s=await advanceStudy(words,valid,0,at,database);
  expect(s.batch).toEqual([]);
  if(s.studyGroup?.wordIds.includes('w8')){sawNext=true;break;}
  expect(s.activeId).toBeDefined();
  if(s.isIntroduction)await introduceWord(words.find(w=>w.id===s.activeId)!,false,at,database);
  else{const c=(await database.cards.get(s.activeId!))!;await reveal(false,at,database);await submitReview(c,3,`large-${i}`,at,database);}
 }
 expect(sawNext).toBe(true);
});

it('暂停所有启用能力可退出小组要求，但不制造成功或清除历史',async()=>{
 await setStudyGroupSize(1,database);await beginSession('new',[],NOW,database);
 const initial=await advanceStudy(words,valid,0,NOW+1,database);await introduceWord(words[0],false,NOW+2,database);
 const cards=await database.cards.toArray(),c=cards[0];await database.cards.bulkPut(cards.map(card=>({...card,paused:true})));
 const state=studyGroupProgress(initial.studyGroup,await database.progress.toArray(),await database.reviews.toArray(),await database.cards.toArray(),valid);
 expect(state.done).toHaveLength(0);expect(state.excluded).toEqual(['w0']);expect(state.complete).toBe(true);
 expect(await database.progress.count()).toBe(1);expect(await database.reviews.count()).toBe(0);
 const next=await advanceStudy(words,valid,0,NOW+3,database);expect(next.studyGroup?.wordIds).toEqual(['w1']);expect((await database.cards.get(c.id))?.count?.remaining).toBe(2);
});
