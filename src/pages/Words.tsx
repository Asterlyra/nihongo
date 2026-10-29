import { Select } from '../Controls';
import { dayKey } from '../domain/statistics';
import { WordMemory } from '../Memory';
import { SentenceAnalysis } from '../SentenceAnalysis';
import { useEffect, useMemo, useRef, useState, type PointerEvent as ReactPointerEvent } from 'react';
import { Link, useParams,useSearchParams } from 'react-router-dom';
import { Search, Bookmark, Plus, ArrowLeft, Check, Headphones, ListChecks } from 'lucide-react';
import { words, wordMap, sentences, grammarMap, wordExamples } from '../content';
import { useNow, useStudyData, dateLabel } from '../hooks';
import { AudioButton, PageHeading, Modal, Empty, Chip, useAction, SentenceText, WordPreview } from '../components';
import { db } from '../data/db';
import { addCard, addToPlan, introduceWord, pauseCard, recordExposure, toggleFavorite } from '../data/store';
import { useLiveQuery } from 'dexie-react-hooks';
import { DIFFICULTY_LABELS,FREQUENCY_LABELS,defaultWordOrder,GOAL_LABELS } from '../domain/planning';
import { SKILL_NAMES, UNIT_NAMES, type Word, type LearningCard } from '../types';

const PAGE_SIZE=36;
const orderedWords=defaultWordOrder(words);
const validWordIds=new Set(words.map(w=>w.id));
const categories=[...new Set(words.map(w=>w.category).filter(Boolean))] as string[];
export function WordTags({word}:{word:Word}){return <div className="word-tags">{word.goals?.map(g=><span key={g}>{GOAL_LABELS[g]}</span>)}{word.usage==='comprehension'&&<span className="usage-warning">理解用 · 不作旅游默认说法</span>}<span>{word.group??UNIT_NAMES[word.unit-1]}</span><span>{DIFFICULTY_LABELS[word.difficulty??2]}</span><span title="日常使用频率为教学估计">{FREQUENCY_LABELS[word.frequency??'medium']}</span></div>;}

export default function Words(){
  const [searchParams,setSearchParams]=useSearchParams();
  const n5Filter=searchParams.get('n5')??'all';
  const data=useStudyData(),now=useNow();const [search,setSearch]=useState(''),[unit,setUnit]=useState('all'),[filter,setFilter]=useState('all'),[deck,setDeck]=useState('all');
  const [category,setCategory]=useState('all'),[group,setGroup]=useState('all'),[difficulty,setDifficulty]=useState('all'),[frequency,setFrequency]=useState('all'),[page,setPage]=useState(1),[goal,setGoal]=useState('all');
  const [creating,setCreating]=useState(false),[name,setName]=useState(''),[selecting,setSelecting]=useState(false),[selected,setSelected]=useState<Set<string>>(new Set());
  const [rectangle,setRectangle]=useState<{left:number;top:number;width:number;height:number}>();
  const grid=useRef<HTMLDivElement>(null);const drag=useRef<{x:number;y:number;initial:Set<string>}|undefined>(undefined);const exposed=useRef(new Set<string>());const {run,busy,notify}=useAction();
  useEffect(()=>{
    if(!data)return;
    const known=new Set(data.cards.map(c=>c.targetId));
    const observer=new IntersectionObserver(entries=>{for(const entry of entries){const id=(entry.target as HTMLElement).dataset.wordId;if(entry.isIntersecting&&id&&known.has(id)&&!exposed.current.has(id)){exposed.current.add(id);void recordExposure(id).catch(e=>{exposed.current.delete(id);notify(e instanceof Error?e.message:'查阅状态未保存，请重试。');});}}});
    grid.current?.querySelectorAll('.word-card[data-word-id]').forEach(el=>observer.observe(el));return()=>observer.disconnect();
  },[search,unit,filter,deck,category,group,difficulty,frequency,goal,n5Filter,page,data?.cards.length]);
  const cardsByWord=useMemo(()=>{const grouped=new Map<string,LearningCard[]>();for(const c of data?.cards??[]){const items=grouped.get(c.targetId)??[];items.push(c);grouped.set(c.targetId,items);}return grouped;},[data?.cards]);
  if(!data)return <p className="loading">正在打开词库…</p>;
  const known=new Set(data.progress.filter(p=>p.introducedAt!==undefined).map(p=>p.id)),planned=new Set(data.settings?.plannedWordIds??[]);
  const query=search.normalize('NFKC').trim().toLowerCase();
  const groups=[...new Set(words.filter(w=>category==='all'||w.category===category).map(w=>w.group).filter(Boolean))] as string[];
  const visible=orderedWords.filter(w=>{
    if(n5Filter==='extra'&&w.n5Unit!==undefined||/^([1-9]|1[0-6])$/.test(n5Filter)&&w.n5Unit!==Number(n5Filter))return false;
    if(query&&![w.writing,w.reading,w.meaning,w.category??'',w.group??''].some(t=>t.normalize('NFKC').toLowerCase().includes(query)))return false;
    if(unit!=='all'&&w.unit!==Number(unit)||category!=='all'&&w.category!==category||group!=='all'&&w.group!==group||difficulty!=='all'&&w.difficulty!==Number(difficulty)||frequency!=='all'&&w.frequency!==frequency)return false;
    if(goal!=='all'&&!w.goals?.includes(goal as 'travel'|'anime'))return false;
    if(deck!=='all'&&!data.decks.find(d=>d.id===deck)?.wordIds.includes(w.id))return false;
    const cards=cardsByWord.get(w.id)??[];
    return filter==='all'||(filter==='planned'&&planned.has(w.id))||(filter==='new'&&!known.has(w.id))||(filter==='introduced'&&known.has(w.id))||(filter==='due'&&cards.some(c=>!c.paused&&(c.count?dayKey(c.dueAt,data?.settings?.timezone)<=dayKey(now,data?.settings?.timezone):c.dueAt<=now)))||(filter==='reading'&&cards.some(c=>c.skill==='reading'&&c.fsrs.state!==2))||(filter==='meaning'&&cards.some(c=>c.skill==='meaning'&&c.fsrs.state!==2));
  });
  const pages=Math.max(1,Math.ceil(visible.length/PAGE_SIZE)),currentPage=Math.min(page,pages),pageWords=visible.slice((currentPage-1)*PAGE_SIZE,currentPage*PAGE_SIZE);
  const eligible=(id:string)=>!known.has(id)&&!planned.has(id);
  const toggle=(id:string)=>setSelected(old=>{const next=new Set(old);if(next.has(id))next.delete(id);else next.add(id);return next;});
  const pointerDown=(e:ReactPointerEvent<HTMLDivElement>)=>{if(!selecting||e.button!==0||e.pointerType!=='mouse'||(e.target as HTMLElement).closest('a,button,input'))return;drag.current={x:e.clientX,y:e.clientY,initial:new Set(selected)};e.currentTarget.setPointerCapture(e.pointerId);e.preventDefault();};
  const pointerMove=(e:ReactPointerEvent<HTMLDivElement>)=>{const start=drag.current;if(!start||Math.hypot(e.clientX-start.x,e.clientY-start.y)<6)return;const box={left:Math.min(start.x,e.clientX),top:Math.min(start.y,e.clientY),width:Math.abs(start.x-e.clientX),height:Math.abs(start.y-e.clientY)};setRectangle(box);const next=new Set(start.initial);grid.current?.querySelectorAll<HTMLElement>('[data-word-id]').forEach(node=>{const id=node.dataset.wordId!,r=node.getBoundingClientRect();if(eligible(id)&&r.right>=box.left&&r.left<=box.left+box.width&&r.bottom>=box.top&&r.top<=box.top+box.height)next.add(id);});setSelected(next);};
  const pointerEnd=()=>{drag.current=undefined;setRectangle(undefined);};
  const addSelected=()=>run(async()=>{const added=await addToPlan([...selected],validWordIds);setSelected(new Set());notify(added?`已将 ${added} 个词加入待学规划。`:'这些词已经在规划中或已认识，无需重复加入。');});
  return <><PageHeading title="单词库" description={`${words.length} 个基础词，按旅游、动漫通用口语、主题与难度挑选。频率为教学估计，读音与词义分别学习。`} action={<div className="button-row"><Link className="secondary" to="/plan">待学清单 · {planned.size}</Link><button className="secondary" onClick={()=>setCreating(true)}><Plus size={17}/>新建词本</button></div>}/>
    <div className="library-toolbar"><label className="search-field"><Search size={18}/><input placeholder="搜索日语、假名、中文或主题" aria-label="搜索单词" value={search} onChange={e=>{setSearch(e.target.value);setPage(1);}}/></label><Select aria-label="筛选单元" value={unit} onValueChange={value=>{setUnit(value);setPage(1);}}><option value="all">全部单元</option>{UNIT_NAMES.map((n,i)=><option value={i+1} key={n}>{String(i+1).padStart(2,'0')} · {n}</option>)}</Select><Select aria-label="筛选学习状态" value={filter} onValueChange={value=>{setFilter(value);setPage(1);}}>{[['all','全部状态'],['new','尚未接触'],['planned','已加入待学'],['introduced','已接触'],['due','当前到期'],['reading','读音尚未巩固'],['meaning','词义尚未巩固']].map(([v,t])=><option value={v} key={v}>{t}</option>)}</Select></div>
    <div className="classification-filters"><Select aria-label="筛选N5单元" value={n5Filter} onValueChange={value=>{const next=new URLSearchParams(searchParams);if(value==='all')next.delete('n5');else next.set('n5',value);setSearchParams(next);setPage(1);}}><option value="all">全部 N5 主线与扩展</option>{Array.from({length:16},(_,i)=><option value={String(i+1)} key={i}>N5 第 {i+1} 单元</option>)}<option value="extra">主线后的扩展词</option></Select><Select aria-label="筛选学习用途" value={goal} onValueChange={value=>{setGoal(value);setPage(1);}}><option value="all">全部学习用途</option><option value="travel">旅游交流</option><option value="anime">动漫通用口语</option></Select><Select aria-label="筛选词汇分类" value={category} onValueChange={value=>{setCategory(value);setGroup('all');setPage(1);}}><option value="all">全部分类</option>{categories.map(c=><option key={c}>{c}</option>)}</Select><Select aria-label="筛选词汇分组" value={group} onValueChange={value=>{setGroup(value);setPage(1);}}><option value="all">全部分组</option>{groups.map(g=><option key={g}>{g}</option>)}</Select><Select aria-label="筛选词汇难度" value={difficulty} onValueChange={value=>{setDifficulty(value);setPage(1);}}><option value="all">全部难度</option>{[1,2,3].map(n=><option value={n} key={n}>{DIFFICULTY_LABELS[n]}</option>)}</Select><Select aria-label="筛选日常频率" value={frequency} onValueChange={value=>{setFrequency(value);setPage(1);}}><option value="all">全部日常频率（估计）</option>{Object.entries(FREQUENCY_LABELS).map(([v,t])=><option value={v} key={v}>{t}</option>)}</Select></div>
    <div className="deck-tabs"><button className={deck==='all'?'selected':''} onClick={()=>{setDeck('all');setPage(1);}}>全部词库</button>{data.decks.map(d=><button className={deck===d.id?'selected':''} key={d.id} onClick={()=>{setDeck(d.id);setPage(1);}}><Bookmark size={14}/>{d.name}<span>{d.wordIds.length}</span></button>)}</div>
    <div className="selection-toolbar"><button className="secondary" aria-pressed={selecting} onClick={()=>setSelecting(v=>!v)}><ListChecks size={17}/>{selecting?'结束选择':'批量选择 / 框选'}</button>{selecting&&<><button className="text-btn" onClick={()=>setSelected(old=>new Set([...old,...pageWords.filter(w=>eligible(w.id)).map(w=>w.id)]))}>勾选本页未学词</button><button className="text-btn" disabled={!selected.size} onClick={()=>setSelected(new Set())}>取消选择</button><span>已选 {selected.size} 个</span><button className="primary" disabled={busy||!selected.size} onClick={addSelected}>加入待学规划</button></>}</div>
    {selecting&&<p className="micro">勾选单词，或在电脑上从卡片空白处拖动框选；跨页选择会保留。已认识和已规划的词不重复加入。</p>}
    <div className="result-heading"><span>{visible.length} 个词条 · 第 {currentPage} / {pages} 页</span><p>默认按 N5 单元推进，旅游与动漫扩展在后。</p></div>
    {visible.length?<div className={`word-grid ${selecting?'selecting':''}`} ref={grid} onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerEnd} onPointerCancel={pointerEnd}>{pageWords.map(w=>{const introduced=known.has(w.id),fav=data.decks.find(d=>d.id==='favorites')?.wordIds.includes(w.id);return <article className={`word-card ${selected.has(w.id)?'is-selected':''}`} data-word-id={w.id} key={w.id}><div className="word-card-top"><span>{w.n5Unit?`N5 第${w.n5Unit}单元`:'扩展'} / {w.category??UNIT_NAMES[w.unit-1]}</span>{selecting?<input type="checkbox" aria-label={`选择待学 ${w.writing}`} checked={selected.has(w.id)} disabled={!eligible(w.id)} onChange={()=>toggle(w.id)}/>:<button className={`icon-btn ${fav?'is-favorite':''}`} aria-label={`${fav?'取消收藏':'收藏'}${w.writing}`} onClick={()=>run(()=>toggleFavorite(w.id))}><Bookmark size={16}/></button>}</div><Link to={`/words/${w.id}${n5Filter==='all'?'':`?n5=${encodeURIComponent(n5Filter)}`}`}><h2 lang="ja">{w.writing}</h2><p className="kana-text" lang="ja">{w.reading}</p><p className="word-meaning">{w.meaning}</p></Link><WordTags word={w}/><footer><span className={`word-status ${introduced?'learned':''}`}>{introduced?<><Check size={12}/>已接触</>:planned.has(w.id)?'已加入待学':'尚未接触'}</span><AudioButton id={w.id} compact label={`播放${w.writing}的读音`}/></footer></article>;})}</div>:<Empty title="没有找到符合条件的单词"><p>试试更短的关键词，或切换筛选条件。</p></Empty>}
    {pages>1&&<nav className="pagination" aria-label="词库分页"><button className="secondary" disabled={currentPage===1} onClick={()=>setPage(currentPage-1)}>上一页</button><span>{currentPage} / {pages}</span><button className="secondary" disabled={currentPage===pages} onClick={()=>setPage(currentPage+1)}>下一页</button></nav>}
    {rectangle&&<div className="selection-marquee" style={rectangle}/>}
    {creating&&<Modal title="新建自己的词本" onClose={()=>setCreating(false)}><p>词本用来整理词汇。想安排先学哪些词，请使用待学规划。</p><label className="field-label">词本名称<input autoFocus value={name} maxLength={40} onChange={e=>setName(e.target.value)} placeholder="例如：我想记住的词"/></label><button className="primary" disabled={busy||!name.trim()} onClick={()=>run(async()=>{const id=crypto.randomUUID();await db.decks.add({id,name:name.trim(),wordIds:[]});setDeck(id);setPage(1);setName('');setCreating(false);})}>创建词本</button></Modal>}
  </>;
}
export function WordDetail(){
  const [wordParams]=useSearchParams();const n5Back=wordParams.get('n5')??'';const wordBack=/^(?:[1-9]|1[0-6]|extra)$/.test(n5Back)?`/words?n5=${n5Back}`:'/words';
  const now=useNow();const {id=''}=useParams();const w=wordMap.get(id);const data=useStudyData();const {run,busy}=useAction();const savedNote=useLiveQuery(()=>db.notes.get(id),[id]);const [note,setNote]=useState('');const [lookup,setLookup]=useState('');
  useEffect(()=>setNote(savedNote?.text??''),[id,savedNote?.text]);
  useEffect(()=>{void run(()=>recordExposure(id));},[id]);
  if(!w)return <Empty title="这个词条暂时不存在"><Link to="/words">返回词库</Link></Empty>;
  const planned=data?.settings?.plannedWordIds?.includes(id);
  const introduced=data?.progress.some(p=>p.id===id&&p.introducedAt),cards=data?.cards.filter(c=>c.targetId===id)??[];
  const examples=[...sentences.filter(s=>s.wordIds?.includes(id)).slice(0,4),...wordExamples.filter(s=>s.wordId===id)].filter((s,i,all)=>all.findIndex(x=>x.text===s.text)===i);
  return <><Link className="back-link" to={wordBack}><ArrowLeft size={16}/>返回单词库</Link><section className="word-detail"><div className="word-detail-title"><div><span className="eyebrow">{w.n5Unit?`N5 第 ${w.n5Unit} 单元`:'扩展词汇'} · {w.category??UNIT_NAMES[w.unit-1]}</span><h1 lang="ja">{w.writing}</h1><p className="study-pronunciation" lang="ja">{w.reading}</p></div><AudioButton id={w.id}/></div><WordTags word={w}/><div className="definition"><span className="pos">{w.pos}</span><h2>{w.meaning}</h2><p lang="ja">{w.collocation}</p>{w.note&&<p className="muted">{w.note}</p>}</div><div className="button-row"><button className="primary" disabled={busy||introduced} onClick={()=>run(()=>introduceWord(w,!!data?.settings?.listening),'已加入学习，稍后检验记忆。')}>{introduced?<><Check size={16}/>已加入学习</>:<><Plus size={16}/>加入学习</>}</button><button className="secondary" disabled={busy||introduced||planned} onClick={()=>run(()=>addToPlan([id],new Set(words.map(w=>w.id))),'已加入待学规划。')}>{planned?'已在待学清单':'加入待学规划'}</button><button className="secondary" disabled={busy} onClick={()=>run(()=>addCard(id,'listening'),'听力卡已加入；读音、词义分别记录。')}><Headphones size={16}/>添加听力练习</button></div><div className="word-decks">{data?.decks.map(d=><button className={`chip-btn ${d.wordIds.includes(id)?'active':''}`} key={d.id} onClick={()=>run(()=>toggleFavorite(id,d.id))}><Bookmark size={13}/>{d.name}{d.wordIds.includes(id)&&<Check size={13}/>}</button>)}</div></section>
    <section className="panel"><div className="section-heading"><h2>各项复习状态</h2><Link to="/study">继续学习 ↗</Link></div>{cards.length?cards.map(c=><div className="memory-row" key={c.id}><Chip>{SKILL_NAMES[c.skill]}</Chip><span>{c.paused?'已暂停':c.count?.remaining?`本轮还需 ${c.count.remaining} 次`:c.fsrs.reps?`下次安排：${dateLabel(c.dueAt,data?.settings?.timezone)}`:'已加入，等待首次回忆'}</span><button className="text-btn" onClick={()=>run(()=>pauseCard(c.id,!c.paused))}>{c.paused?'恢复复习':'暂停本卡'}</button></div>):<p className="muted">还没有学习卡片。加入学习后会开始记录。</p>}</section>
    <WordMemory key={id} id={id} cards={cards} timezone={data?.settings?.timezone??'Asia/Shanghai'} now={now}/>
    <section className="panel"><h2>单词例句</h2>{examples.length?examples.map(s=><div className="example" key={s.id}><div className="sentence-line"><SentenceText sentence={s} onWord={other=>{if(other!==id)setLookup(other);}}/><AudioButton id={s.id} compact label="播放例句"/></div><p>{s.translation}</p><SentenceAnalysis sentence={s} onWord={other=>{if(other!==id)setLookup(other);}}/><div className="chips">{s.grammarIds.map(gid=><Link className="chip" to={`/grammar/${gid}`} key={gid}>{grammarMap.get(gid)?.title}</Link>)}</div></div>):<p lang="ja">{w.collocation}</p>}</section>
    {lookup&&<WordPreview id={lookup} onClose={()=>setLookup('')} onAdd={()=>{const other=wordMap.get(lookup);if(other)void run(()=>introduceWord(other,!!data?.settings?.listening),'已加入学习。');}} onFavorite={()=>run(()=>toggleFavorite(lookup),'已更新收藏。')}/>}
    <section className="panel"><h2>单词笔记</h2><label className="sr-only" htmlFor="word-note">单词笔记</label><textarea id="word-note" value={note} maxLength={10000} onChange={e=>setNote(e.target.value)} placeholder="写下容易混淆的地方，或者你喜欢的记忆方式。"/><button className="secondary" disabled={busy} onClick={()=>run(()=>db.notes.put({id,text:note}),'笔记已保存。')}>保存笔记</button></section>
  </>;
}
