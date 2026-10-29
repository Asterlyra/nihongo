import {afterEach,beforeEach,expect,it} from 'vitest';
import {StudyDB} from '../src/data/db';
import {newCountCard} from '../src/domain/scheduler';
import {nextStudyItem,requiredReviews} from '../src/domain/queue';
import {advanceStudy,assignCurrent,beginSession,introduceWord,reveal,submitReview,undo} from '../src/data/store';
import {dayKey,dailyStats} from '../src/domain/statistics';
import type {Session,Word} from '../src/types';
const NOW=Date.UTC(2026,9,12,3),zone='Asia/Shanghai';
const catalog:Word[]=Array.from({length:8},(_,i)=>({id:`w${i}`,writing:`词${i}`,reading:'ことば',meaning:'词',pos:'名詞',unit:1,collocation:'',note:'',audioText:'ことば'}));
const valid=new Set(catalog.map(w=>w.id));
const session:Session={id:'active',mode:'recommended',revealed:false,hintUsed:false,updatedAt:NOW,revision:0,batch:[]};
let db:StudyDB;
beforeEach(async()=>{db=new StudyDB(`mixed-${crypto.randomUUID()}`);await db.open();await db.settings.put({id:'settings',listening:false,autoPlay:false,furigana:true,timezone:zone,dailyWordTarget:30});});
afterEach(async()=>{await db.delete();});

it('同一会话状态顺序稳定，新旧词都可被选中，旧词顺序不固定为ID顺序',()=>{
 const cards=catalog.slice(0,3).map(w=>newCountCard(w.id,'meaning',NOW));
 const options={cards,guards:[],now:NOW,session,newIds:['w3','w4','w5']};
 expect(nextStudyItem(options)).toEqual(nextStudyItem({...options,now:NOW+1000}));
 const picks=Array.from({length:100},(_,revision)=>nextStudyItem({...options,session:{...session,revision}})!);
 expect(picks.some(p=>p.isIntroduction)).toBe(true);expect(picks.some(p=>!p.isIntroduction)).toBe(true);
 expect(new Set(picks.filter(p=>!p.isIntroduction).map(p=>p.id)).size).toBe(3);
 expect(new Set(picks.filter(p=>p.isIntroduction).map(p=>p.id)).size).toBe(3);
});
it('有其他词时避开刚看过的词及其全部能力，手工清单优先顺序保留',()=>{
 const cards=['meaning','reading'].map(skill=>newCountCard('w0',skill as 'meaning'|'reading',NOW));
 for(let revision=0;revision<20;revision++){
  expect(nextStudyItem({cards,guards:[{id:'w0',at:NOW,gap:1}],now:NOW,session:{...session,revision},newIds:['w1','w2'],orderedNew:true})).toEqual({id:'w1',isIntroduction:true});
 }
});
it('多个词同时被展示暂缓时先选另一词，不重复最近词，也不改次数',()=>{
 const cards=['w0','w1','w2'].map(id=>newCountCard(id,'meaning',NOW));
 const guards=cards.map((c,i)=>({id:c.targetId,at:NOW+i,gap:1}));
 for(let revision=0;revision<50;revision++){
  const item=nextStudyItem({cards,guards,now:NOW+3,session:{...session,mode:'review',revision},allowNew:false});
  expect(item?.id).not.toBe(cards[2].id);expect(item).toBeDefined();
 }
 expect(cards.every(c=>c.count?.remaining===2)).toBe(true);expect(guards.every(g=>g.gap===1)).toBe(true);
});
it('只剩一个暂缓词自动回到隐藏答案的回忆，未增加成功次数，且还能撤销',async()=>{
 const c=newCountCard('w0','meaning',NOW);await db.cards.add(c);await beginSession('review',[],NOW,db);await assignCurrent(c.id,false,NOW,db);await reveal(false,NOW,db);await submitReview(c,3,'one',NOW,db);
 const before=await db.cards.get(c.id),guards=await db.guards.toArray();
 const next=await advanceStudy(catalog,valid,0,NOW+1,db);
 expect(next).toMatchObject({activeId:c.id,isIntroduction:false,revealed:false});expect(await db.cards.get(c.id)).toEqual(before);expect(await db.guards.toArray()).toEqual(guards);expect(await db.reviews.count()).toBe(1);
 await undo(NOW+2,db);expect(await db.cards.get(c.id)).toEqual(c);expect(await db.sessions.get('active')).toMatchObject({activeId:c.id,revealed:true});
});
it('连续流程在目标以内混排，达到目标后继续巩固，只有全部完成才停止',async()=>{
 await db.settings.update('settings',{dailyWordTarget:3});await beginSession('recommended',[],NOW,db);
 const kinds=new Set<boolean>();let ended=false;
 for(let i=0;i<120;i++){
  const at=NOW+i+1,next=await advanceStudy(catalog,valid,0,at,db);
  if(!next.activeId){ended=true;break;}
  kinds.add(!!next.isIntroduction);
  if(next.isIntroduction)await introduceWord(catalog.find(w=>w.id===next.activeId)!,false,at,db);
  else{const card=(await db.cards.get(next.activeId))!;await reveal(false,at,db);await submitReview(card,3,`grade-${i}`,at,db);}
 }
 expect(ended).toBe(true);expect(kinds.size).toBe(2);
 const stats=dailyStats(dayKey(NOW,zone),await db.progress.toArray(),await db.reviews.toArray(),[],valid,zone);
 expect(stats.words).toHaveLength(3);expect(requiredReviews(await db.cards.toArray(),NOW,zone)).toHaveLength(0);
 expect((await db.cards.toArray()).every(c=>c.count?.remaining===0&&c.count.stage===1)).toBe(true);
});
it('并发自动取词不会覆盖已展示项，刷新会恢复同一项',async()=>{
 await beginSession('recommended',[],NOW,db);
 const [a,b]=await Promise.all([advanceStudy(catalog,valid,0,NOW,db),advanceStudy(catalog,valid,0,NOW+1,db)]);
 expect(a.activeId).toBe(b.activeId);db.close();await db.open();expect((await advanceStudy(catalog,valid,0,NOW+2,db)).activeId).toBe(a.activeId);
});
it('新词优先仍可选旧词；今日回顾和自由练习不混入新词或未来正式复习',()=>{
 const c=newCountCard('w0','meaning',NOW),future={...newCountCard('w1','meaning',NOW),dueAt:NOW+86400_000};
 const picks=Array.from({length:50},(_,revision)=>nextStudyItem({cards:[c,future],guards:[],now:NOW,session:{...session,mode:'new',revision,batch:['w2']},newIds:['w2']}));
 expect(picks.some(p=>p?.id===c.id)).toBe(true);expect(picks.some(p=>p?.isIntroduction)).toBe(true);expect(picks.some(p=>p?.id===future.id)).toBe(false);
 expect(nextStudyItem({cards:[c],guards:[],now:NOW,session:{...session,mode:'today',batch:['w0']},newIds:['w2']})).toEqual({id:c.id,isIntroduction:false});
 expect(nextStudyItem({cards:[c],guards:[],now:NOW,session:{...session,mode:'today',batch:['w0'],completed:[c.id]},newIds:['w2']})).toBeUndefined();
});
