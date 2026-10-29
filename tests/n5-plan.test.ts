import {expect,it} from 'vitest';
import {n5Course,words,orderedGrammars} from '../src/content';
import {defaultWordOrder,plannedNewWords} from '../src/domain/planning';
import {n5LessonProgress} from '../src/domain/n5';
import {StudyDB} from '../src/data/db';
import {recordExercise,beginSession} from '../src/data/store';
import {exportBackup,validateImport,restoreBackup} from '../src/data/backup';
import {dailyStats,dayKey} from '../src/domain/statistics';

it('默认新词按N5单元和单元内顺序推进，旅游动漫扩展在后且不修改输入',()=>{
 const source=[...words].reverse(),before=source.map(w=>w.id);const ordered=defaultWordOrder(source);
 expect(ordered.slice(0,5).map(w=>w.writing)).toEqual(['私','あなた','名前','人','学生']);
 expect(ordered.filter(w=>w.n5Unit!==undefined).map(w=>w.id)).toEqual(n5Course.lessons.flatMap(l=>l.wordIds));
 const count=n5Course.lessons.flatMap(l=>l.wordIds).length;
 expect(ordered.slice(count).every(w=>w.n5Unit===undefined)).toBe(true);
 expect(source.map(w=>w.id)).toEqual(before);
 expect(orderedGrammars.slice(-5).map(g=>g.id)).toEqual(['g24','g29','g30','g31','g32']);
});

it('手选扩展词优先，已介绍的N5词跳过，现有ID不复制',()=>{
 const ordered=plannedNewWords(words,[{id:'w001',introducedAt:0}],['w1050','w1050','missing']);
 expect(ordered[0].id).toBe('w1050');expect(ordered[1].id).toBe('w002');
 expect(ordered.some(w=>w.id==='w001')).toBe(false);expect(new Set(ordered.map(w=>w.id)).size).toBe(ordered.length);
});

it('阅读、自测、阶段题和听力状态分别显示，不把听力或已读计成全部答对',()=>{
 const l=n5Course.lessons[3],saved=[{id:l.id,readAt:0,results:{'0':true,'1':false,'2':false,'listen-audio':true,'listen-text':true}},{id:l.wordIds[0],introducedAt:0}];
 expect(n5LessonProgress(l,saved)).toMatchObject({read:true,introduced:1,answered:3,correct:1,checkpointAnswered:1});
 expect(n5LessonProgress(l,[])).toMatchObject({read:false,introduced:0,answered:0,correct:0});
});

it('新计划读题记录随旧备份格式往返，不增加正式卡片或每日词数，并保留原小组和自选规划',async()=>{
 const database=new StudyDB(`n5-${crypto.randomUUID()}`);await database.open();
 try{
  const now=Date.UTC(2026,9,20,4);const group={wordIds:['w001','w002'],startedAt:now-100};
  await database.settings.put({id:'settings',listening:false,furigana:true,timezone:'Asia/Shanghai',plannedWordIds:['w1050'],dailyWordTarget:30,studyGroupSize:5});
  await database.sessions.put({id:'active',mode:'recommended',revealed:false,hintUsed:false,revision:1,batch:[],updatedAt:now,studyGroup:group});
  await database.notes.put({id:'w001',text:'保留笔记'});
  await beginSession('new',n5Course.lessons[0].wordIds,now,database);
  expect((await database.sessions.get('active'))?.studyGroup).toEqual(group);
  expect((await database.settings.get('settings'))?.plannedWordIds).toEqual(['w1050']);
  await database.progress.put({id:'n5-04',readAt:now});
  await recordExercise('n5-04',false,'2',database,now+1);await recordExercise('n5-04',true,'2',database,now+2);
  await recordExercise('n5-04',false,'listen-audio',database,now+3);await recordExercise('n5-04',true,'listen-text',database,now+4);
  const progress=await database.progress.toArray(),practices=await database.practices.toArray();
  expect(dailyStats(dayKey(now),progress,[],practices,new Set(words.map(w=>w.id)),'Asia/Shanghai').words).toEqual([]);
  const backup=await validateImport(await exportBackup(database));
  await restoreBackup(backup,new Set(words.map(w=>w.id)),database);
  expect(await database.progress.toArray()).toEqual(progress);expect(await database.practices.toArray()).toEqual(practices);
  expect((await database.progress.get('n5-04'))?.results).toEqual({'2':true,'listen-audio':false,'listen-text':true});
  expect((await database.sessions.get('active'))?.studyGroup).toEqual(group);expect((await database.notes.get('w001'))?.text).toBe('保留笔记');
  expect(await database.cards.count()).toBe(0);expect(await database.reviews.count()).toBe(0);
 }finally{await database.delete();}
});
