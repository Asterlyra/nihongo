import { Select } from '../Controls';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Bookmark, RotateCcw, Pause, Eye, CircleCheck, CircleHelp } from 'lucide-react';
import { words, wordMap, grammarMap, kanaMap } from '../content';
import { useNow, useStudyData, useHistoryData } from '../hooks';
import { nextStudyItem, requiredReviews } from '../domain/queue';
import { countLabel } from '../domain/count-scheduler';
import { intervalLabel } from '../domain/scheduler';
import { advanceStudy, beginSession, beginToday, clearCurrent, continueDailyWords, deferCurrent, introduceWord, pauseCard, reveal, submitPractice, submitReview, toggleFavorite, undo } from '../data/store';
import { AudioButton, useAction } from '../components';
import { MODE_NAMES, SKILL_NAMES, type LearningCard, type Mode } from '../types';
import { plannedNewWords } from '../domain/planning';
import { dailyStats, dayKey, isRecap, shouldAutoPlay } from '../domain/statistics';
import { dailyGoal } from '../domain/daily-goal';
import {prepareStudyGroup,studyGroupProgress,DEFAULT_GROUP_SIZE} from '../domain/study-group';
import { stopAudio, playAudio } from '../audio';
import './study.css';
import StudyWord from '../StudyWord';

const wordIds=new Set(words.map(w=>w.id));
const validTargets=new Set([...wordIds,...grammarMap.keys(),...kanaMap.keys()]);
export default function Study(){
  const data=useStudyData();const history=useHistoryData();const [audioStatus,setAudioStatus]=useState('');const now=useNow();const {run,busy,notify}=useAction();const assigning=useRef(false);const [practiceIndex,setPracticeIndex]=useState(0);const [advancing,setAdvancing]=useState(false);
  const session=data?.session;
  const day=dayKey(now,data?.settings?.timezone);
  const today=useMemo(()=>history&&data?dailyStats(day,data.progress,history.reviews,history.practices,wordIds,data.settings?.timezone??'Asia/Shanghai'):undefined,[day,data?.progress,data?.settings?.timezone,history]);
  const goal=dailyGoal(data?.settings?.dailyWordTarget,today?.words.length??0,dayKey(now,data?.settings?.timezone),session);
  const active=session?.activeId;
  const card=data?.cards.find(c=>c.id===active);
  const w=wordMap.get(card?.targetId??active??'');const k=kanaMap.get(card?.targetId??'');const g=grammarMap.get(card?.targetId??'');
  const enabledCards=data?.cards.filter(c=>data.settings?.listeningEnabled!==false||c.skill!=='listening')??[];
  const required=data?requiredReviews(enabledCards,now,data.settings?.timezone):[];
  const requiredWords=new Set(required.map(c=>c.targetId)).size;
  const newWords=data?plannedNewWords(words,data.progress,data.settings?.plannedWordIds).filter(x=>session?.mode!=='new'||!session.batch.length||session.batch.includes(x.id)||data.settings?.plannedWordIds?.includes(x.id)):[];
  const grouped=data&&session&&history?prepareStudyGroup({session,size:data.settings?.studyGroupSize,newIds:newWords.map(w=>w.id),progress:data.progress,reviews:history.reviews,cards:enabledCards.filter(c=>validTargets.has(c.targetId)),validWords:wordIds,now,remaining:goal.remaining,allowNew:!goal.reached}):undefined;
  const groupState=studyGroupProgress(session?.studyGroup,data?.progress??[],history?.reviews??[],enabledCards,wordIds);
  const nextItem=data&&session&&grouped?nextStudyItem({cards:enabledCards.filter(c=>validTargets.has(c.targetId)),guards:data.guards,now,session:grouped.session,newIds:grouped.newIds,pendingRecallIds:grouped.state.pending,allowNew:!goal.reached,orderedNew:grouped.newIds.some(id=>data.settings?.plannedWordIds?.includes(id))||session.mode==='new',practiceIndex,timezone:data.settings?.timezone}):undefined;
  useEffect(()=>()=>stopAudio(),[active]);
  const autoAllowed=shouldAutoPlay(card?.skill,!!session?.isIntroduction,!!session?.revealed,data?.settings?.autoPlay!==false);
  const audioTarget=w?.id??k?.id;
  useEffect(()=>{
    let cancelled=false;setAudioStatus('');
    if(!active||!audioTarget||!autoAllowed){stopAudio();return;}
    void playAudio(audioTarget).catch(()=>{if(!cancelled)setAudioStatus('自动播放未开始，请点击听发音。');});
    return()=>{cancelled=true;stopAudio();};
  },[active,audioTarget,autoAllowed]);
  useEffect(()=>{
    if(!data||assigning.current)return;
    if(!session){assigning.current=true;setAdvancing(true);void beginSession('recommended').catch(e=>notify(e instanceof Error?e.message:'无法恢复学习，请刷新重试。')).finally(()=>{assigning.current=false;setAdvancing(false);});return;}
    if(active){
      if(session.isIntroduction&&goal.reached){void run(()=>clearCurrent());return;}
      if(card?.paused||(card&&!w&&!k&&!g)||(card?.skill==='listening'&&data.settings?.listeningEnabled===false)){void run(()=>clearCurrent());}
      return;
    }
    if(history&&nextItem){assigning.current=true;setAdvancing(true);void advanceStudy(words,validTargets,practiceIndex).catch(e=>notify(String(e))).finally(()=>{assigning.current=false;setAdvancing(false);});}
  },[data,history,active,session,nextItem?.id,nextItem?.isIntroduction,practiceIndex,now,goal.reached,advancing]);

  useEffect(()=>{
    if(!data)return;
    const key=(e:KeyboardEvent)=>{if(e.repeat||e.ctrlKey||e.metaKey||e.altKey||(e.target instanceof HTMLElement&&['INPUT','TEXTAREA','SELECT','BUTTON','A'].includes(e.target.tagName)))return;
      if(e.code==='Space'&&card&&!session?.revealed){e.preventDefault();void run(()=>reveal());}
      if(['1','2','3'].includes(e.key)&&card&&session?.revealed){e.preventDefault();grade(card,Number(e.key));}
      if(e.key.toLowerCase()==='z'){e.preventDefault();void run(()=>undo(),'已撤销上一次反馈。');}
    };window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);
  });
  const grade=(c:LearningCard,rating:number)=>run(async()=>{if(isRecap(session?.mode)){await submitPractice(c,rating);setPracticeIndex(i=>i+1);}else await submitReview(c,rating);stopAudio();});
  const switchMode=(mode:Mode)=>run(async()=>{await clearCurrent();if(mode==='today'){await beginToday(new Set(words.map(w=>w.id)),data?.settings?.timezone??'Asia/Shanghai');return;}await beginSession(mode);});
  const more=(count:number)=>run(async()=>{const batch=plannedNewWords(words,data?.progress??[],data?.settings?.plannedWordIds).slice(0,count).map(x=>x.id);await clearCurrent();await beginSession('new',batch);if(goal.reached)await continueDailyWords(count,wordIds);});
  if(!data)return <p className="loading">正在恢复学习进度…</p>;
  const favorite=w&&data.decks.find(d=>d.id==='favorites')?.wordIds.includes(w.id);
  const staleAnswer=!!(session?.revealedAt&&now-session.revealedAt>10*60_000&&!isRecap(session.mode));
  const title=card?`复习${SKILL_NAMES[card.skill]}`:'学习新词';
  const ratings=[{value:3,label:'记得',icon:CircleCheck},{value:2,label:'模糊',icon:CircleHelp},{value:1,label:'忘记',icon:RotateCcw}];
  const emptyTitle=session?.mode==='today'?'今天的词已复习完':session?.mode==='practice'?'还没有可练习的卡片':goal.reached?'今日词汇量已完成':'复习已完成';
  return <>
    <header className="study-heading">
      <Link className="study-exit" to="/"><ArrowLeft size={17}/><span>结束本次</span></Link>
      <h1>背单词</h1>
      <span className="study-daily" aria-label="今日背词进度"><span>今日 <strong>{goal.done}</strong><small>/ {goal.target||'不限'}</small></span></span>
    </header>
    <div className="study-toolbar">
      <div className="study-flow"><span className="study-flow-dot"/><div className="study-flow-details"><span>待复习 <b>{requiredWords}</b> 个词</span>{!isRecap(session?.mode)&&<span className="study-group-link" aria-label="当前学习小组">{session?.studyGroup?`本组 ${groupState.done.length} / ${groupState.wordIds.length}`:`每组 ${data.settings?.studyGroupSize??DEFAULT_GROUP_SIZE} 词`}</span>}</div></div>
      <Select aria-label="学习模式" value={session?.mode??'recommended'} disabled={busy} onValueChange={value=>void switchMode(value as Mode)}>{(Object.keys(MODE_NAMES) as Mode[]).map(mode=><option key={mode} value={mode}>{MODE_NAMES[mode]}</option>)}</Select>
    </div>
    {session?.mode==='today'&&<p className="study-round-status">今日回顾 {session.completed?.length??0} / {session.batch.length} 个词</p>}
    {active&&(w||k||g)?<section className="study-card">
      <header><div className="study-context"><span className="study-context-dot"/>{title}{w?.n5Unit&&<span className="n5-study-tag">第{w.n5Unit}单元</span>}</div><div className="study-tools">
        {w&&<button className={`icon-btn ${favorite?'is-favorite':''}`} aria-label={favorite?'取消收藏':'收藏单词'} onClick={()=>run(()=>toggleFavorite(w.id))}><Bookmark size={18}/></button>}
        {card&&<button className="icon-btn" aria-label="暂停这张卡片" onClick={()=>run(()=>pauseCard(card.id,true),'本卡片已暂停，历史保留。')}><Pause size={17}/></button>}
      </div></header>
      <div className={`study-main ${session?.isIntroduction?'is-introduction':'is-recall'} ${session?.revealed?'is-revealed':''}`}>
        {w?<StudyWord key={active} word={w} skill={session?.isIntroduction?undefined:card?.skill} answered={!!(session?.isIntroduction||session?.revealed)} onHint={()=>reveal(true)} onSkip={()=>void run(()=>deferCurrent())}/>:<div className="study-content study-reference-fallback">
          <div className="study-prompt">{g?<h2 className="grammar-cue" lang="ja">{g.exercises[0]?.prompt}</h2>:<h2 className="study-word" lang="ja">{k?.writing}</h2>}</div>
          <div className="revealed-answer" data-concealed={!session?.revealed} aria-hidden={!session?.revealed||undefined} inert={!session?.revealed}>
            {g?<><h3 lang="ja">{g.exercises[0]?.answer}</h3><p>{g.exercises[0]?.explanation}</p></>:card&&<div className="study-reading-line"><p className="study-pronunciation" lang="ja">{k?.reading}</p><AudioButton id={card.targetId} compact/></div>}
          </div>
        </div>}
        <p className="hint-warning study-hint-slot" data-concealed={!session?.hintUsed} aria-hidden={!session?.hintUsed||undefined}>已用提示，记为忘记</p>
        <p className="audio-status" role="status">{audioStatus||'　'}</p>
        <div className="study-actions study-fixed-actions">
          {session?.isIntroduction&&w?<button className="primary study-start" disabled={busy} onClick={()=>run(()=>introduceWord(w,!!data.settings?.listening))}>开始学习<ArrowRight size={18}/></button>:<>
            <div className="study-reveal-row" data-concealed={!!session?.revealed&&!staleAnswer} aria-hidden={!!session?.revealed&&!staleAnswer||undefined} inert={!!session?.revealed&&!staleAnswer}>
              <button className="secondary reveal-btn" disabled={busy} onClick={()=>run(()=>staleAnswer?clearCurrent():reveal())}><Eye size={16}/>{staleAnswer?'重新回忆':'显示答案'}<kbd>Space</kbd></button>
              {!w&&card?.skill==='kana'&&<AudioButton id={card.targetId} label="听读音提示（本次记为忘记）" before={()=>reveal(true)} compact/>}
            </div>
            {card&&<div className="rating-row" data-concealed={!session?.revealed||staleAnswer} aria-hidden={!session?.revealed||staleAnswer||undefined} inert={!session?.revealed||staleAnswer}>{ratings.map(({value,label,icon:Icon})=><button className={`rating rating-${value}`} key={value} disabled={busy||!session?.revealed||staleAnswer||(session?.hintUsed&&value!==1)} onClick={()=>grade(card,value)}>
              <span><Icon size={19}/>{label}<kbd>{value}</kbd></span>
              {!isRecap(session?.mode)&&<small>{card.count?countLabel(card,value,Date.now(),data.settings?.timezone,session?.hintUsed):intervalLabel(card,value,now)}</small>}
            </button>)}</div>}
          </>}
        </div>
      </div>
    </section>:(!session||!history||advancing||nextItem)?<section className="study-card study-loading" aria-busy="true" aria-label="正在读取下一词"><span className="study-loading-dot"/></section>:<section className="study-card study-empty"><div className="study-empty-symbol"><CircleCheck size={32}/></div><h2>{emptyTitle}</h2><div className="button-row"><button className="primary" disabled={busy||!newWords.length} onClick={()=>more(5)}>继续加学 5 个<ArrowRight size={17}/></button><button className="secondary" disabled={busy||!newWords.length} onClick={()=>more(10)}>继续加学 10 个</button>{!newWords.length&&<span className="micro">没有待学新词</span>}</div></section>}
    <div className="study-foot"><button className="text-btn" disabled={busy||!session?.lastEventId} onClick={()=>run(()=>undo())}><RotateCcw size={14}/>撤销</button>{w&&<Link to={`/words/${w.id}`} onClick={()=>{if(card&&!session?.revealed)void reveal(true);}}>详情与历史<ArrowRight size={13}/></Link>}</div>
  </>;
}
