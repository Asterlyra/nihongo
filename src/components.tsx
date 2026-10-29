import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ArrowRight, Volume2, X, Check } from 'lucide-react';
import { Link } from 'react-router-dom';
import { currentAudioId, playAudio } from './audio';
import { wordMap } from './content';
import type { Sentence } from './types';
import { recordExposure } from './data/store';
import { hasKanji } from './domain/reading-display';

export const NoticeContext=createContext<(text:string)=>void>(()=>{});
export function useAction(){
  const notify=useContext(NoticeContext);const [busy,setBusy]=useState(false);const locked=useRef(false);
  const run=async(action:()=>Promise<unknown>,success?:string)=>{if(locked.current)return;locked.current=true;setBusy(true);try{await action();if(success)notify(success);}catch(e){notify(e instanceof Error?e.message:'操作未保存，请重试。');}finally{locked.current=false;setBusy(false);}};
  return {busy,run,notify};
}
export function AudioButton({id,label='播放发音',before,compact=false}:{id:string;label?:string;before?:()=>Promise<unknown>;compact?:boolean}){
  const {busy,run}=useAction();
  const [playing,setPlaying]=useState(currentAudioId()===id);
  useEffect(()=>{setPlaying(currentAudioId()===id);const listener=(e:Event)=>setPlaying((e as CustomEvent<string|null>).detail===id);window.addEventListener('audio-playback-state',listener);return()=>window.removeEventListener('audio-playback-state',listener);},[id]);
  return <button className={`audio-btn ${compact?'compact':''} ${playing?'is-playing':''}`} disabled={busy} aria-busy={busy} aria-label={label} title={label} onClick={()=>run(async()=>{await before?.();await playAudio(id);})}><Volume2 size={18}/>{!compact&&<span>听发音</span>}</button>;
}
export function PageHeading({eyebrow,title,description,action}:{eyebrow?:string;title:string;description:string;action?:ReactNode}){
  return <header className="page-heading"><div>{eyebrow&&<span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{description}</p></div>{action}</header>;
}
export function Empty({title,children}:{title:string;children:ReactNode}){return <div className="empty-state"><h2>{title}</h2><div>{children}</div></div>;}
export function Modal({title,children,onClose}:{title:string;children:ReactNode;onClose:()=>void}){
  const ref=useRef<HTMLDialogElement>(null);
  useEffect(()=>{const focus=document.activeElement as HTMLElement;ref.current?.showModal();return()=>{focus?.focus();};},[]);
  return <dialog ref={ref} className="modal" aria-label={title} onCancel={onClose}><header><h2>{title}</h2><button className="icon-btn" aria-label="关闭窗口" onClick={onClose}><X size={22}/></button></header>{children}</dialog>;
}
export function SentenceText({sentence,furigana=true,onWord}:{sentence:Sentence;furigana?:boolean;onWord?:(id:string)=>void}){
  return <span lang="ja">{sentence.segments?.map((s,i)=>s.wordId&&wordMap.has(s.wordId)?<button className="word-token" key={i} onClick={()=>onWord?.(s.wordId!)} aria-label={`查看单词 ${s.text}`}>{furigana&&s.reading&&hasKanji(s.text)?<ruby>{s.text}<rt>{s.reading}</rt></ruby>:s.text}</button>:<span key={i}>{furigana&&s.reading&&hasKanji(s.text)?<ruby>{s.text}<rt>{s.reading}</rt></ruby>:s.text}</span>)??sentence.text}</span>;
}
export function SentenceReading({sentence}:{sentence:Sentence}){
  return <span lang="ja">{sentence.segments?.map((segment,index)=><span key={index}>{segment.reading&&hasKanji(segment.text)?<ruby>{segment.text}<rt>{segment.reading}</rt></ruby>:segment.text}</span>)??sentence.text}</span>;
}
export function ArrowLink({to,children}:{to:string;children:ReactNode}){return <Link className="arrow-link" to={to}>{children}<ArrowRight size={17}/></Link>;}
export function Chip({children,done=false}:{children:ReactNode;done?:boolean}){return <span className={`chip ${done?'done':''}`}>{done&&<Check size={12}/>} {children}</span>;}
export function WordPreview({id,onClose,onAdd,onFavorite}:{id:string;onClose:()=>void;onAdd:()=>void;onFavorite:()=>void}){
  const {run}=useAction();
  useEffect(()=>{void run(()=>recordExposure(id));},[id]);
  const w=wordMap.get(id);if(!w)return null;
  return <Modal title="单词速查" onClose={onClose}><div className="word-preview"><span className="pos">{w.pos}</span><h3 lang="ja">{w.writing}</h3><p lang="ja">{w.reading}</p><AudioButton id={w.id}/><h4>{w.meaning}</h4><p lang="ja">{w.collocation}</p>{w.note&&<p className="muted">{w.note}</p>}<div className="button-row"><button className="primary" onClick={onAdd}>加入学习</button><button className="secondary" onClick={onFavorite}>加入收藏</button><Link to={`/words/${w.id}`} onClick={onClose}>完整词条</Link></div><p className="micro">查阅不会被计作记住这个词。</p></div></Modal>;
}
