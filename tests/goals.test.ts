import {afterEach,expect,it,vi} from 'vitest';
import {defaultWordOrder,plannedNewWords} from '../src/domain/planning';
import {StudyDB} from '../src/data/db';
import {introduceWord,recordExercise} from '../src/data/store';
import {exportBackup,restoreBackup,validateImport} from '../src/data/backup';
import {dailyStats,dayKey} from '../src/domain/statistics';
import type {Word} from '../src/types';
const w:Word={id:'w001',writing:'水',reading:'みず',meaning:'水',pos:'名詞',unit:1,collocation:'水を飲む',note:'',audioText:'みず',difficulty:1,frequency:'high',studyOrder:1};
it('目标相关性独立于总体频率，理解用角色词后置',()=>{const rows=[w,{...w,id:'w002',learningPriority:0,frequency:'context' as const,difficulty:2 as const},{...w,id:'w003',learningPriority:4}];expect(defaultWordOrder(rows).map(w=>w.id)).toEqual(['w002','w001','w003']);expect(rows[1].frequency).toBe('context');expect(plannedNewWords(rows,[],['w003']).map(w=>w.id)).toEqual(['w003','w002','w001']);});
it('对话练习保存分模式结果，往返备份且不污染词汇历史与 FSRS',async()=>{const db=new StudyDB(`goals-${crypto.randomUUID()}`);await db.open();try{await db.settings.put({id:'settings',listening:false,furigana:true,timezone:'Asia/Shanghai'});const now=Date.UTC(2026,9,10,4);await introduceWord(w,false,now,db);const before=await db.cards.toArray();await recordExercise('d01',false,'audio-0',db,now);await recordExercise('d01',true,'text-0',db,now+1);expect(await db.cards.toArray()).toEqual(before);expect(await db.reviews.count()).toBe(0);expect(await db.progress.get('w001')).toEqual({id:'w001',introducedAt:now});expect((await db.progress.get('d01'))?.results).toEqual({'audio-0':false,'text-0':true});const stat=dailyStats(dayKey(now),await db.progress.toArray(),[],await db.practices.toArray(),new Set(['w001']),'Asia/Shanghai');expect(stat.words).toEqual(['w001']);const backup=await validateImport(await exportBackup(db));await restoreBackup(backup,new Set(['w001']),db);expect((await db.progress.get('d01'))?.results).toEqual({'audio-0':false,'text-0':true});expect(await db.cards.toArray()).toEqual(before);}finally{await db.delete();}});

class FakeAudio extends EventTarget { playbackRate=1;currentTime=0;pause=vi.fn();play=vi.fn(async()=>{});constructor(public src:string){super();audioInstances.push(this);} }
let audioInstances:FakeAudio[]=[];
vi.mock('../src/content',()=>({audioPath:(id:string)=>`/audio/${id}.mp3`}));
import {playSequence,stopAudio} from '../src/audio';
afterEach(()=>{stopAudio();vi.unstubAllGlobals();audioInstances=[];});
it('整段播放等上一句结束才前进，中途停止不播放下一句',async()=>{vi.stubGlobal('Audio',FakeAudio);const turn=vi.fn();const pending=playSequence(['a','b','c'],.8,turn);expect(audioInstances).toHaveLength(1);expect(audioInstances[0].playbackRate).toBe(.8);audioInstances[0].dispatchEvent(new Event('ended'));await Promise.resolve();expect(audioInstances).toHaveLength(2);stopAudio();expect(await pending).toBe(false);expect(audioInstances).toHaveLength(2);expect(turn.mock.calls).toEqual([[0],[1]]);});
it('播放故障拒绝并停止序列，恢复后可完成',async()=>{vi.stubGlobal('Audio',FakeAudio);const pending=playSequence(['a','b']);const check=expect(pending).rejects.toThrow('播放失败');audioInstances[0].dispatchEvent(new Event('error'));await check;expect(audioInstances).toHaveLength(1);const next=playSequence(['c']);audioInstances[1].dispatchEvent(new Event('ended'));expect(await next).toBe(true);});
