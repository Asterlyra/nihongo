import { Link } from 'react-router-dom';
import analysisData from '../content/sentence-analysis.prepared.json';
import { grammarMap } from './content';
import type { Sentence, SentenceExplanation } from './types';

const explanationMap=new Map((analysisData as SentenceExplanation[]).map(s=>[s.id,s]));

export default function SentenceAnalysisBody({sentence,onWord}:{sentence:Sentence;onWord?:(id:string)=>void}){
 const explanation=explanationMap.get(sentence.id);
 if(!explanation)return <p>这句的解释暂未提供。</p>;
 const tokens=explanation.tokens.filter(t=>t.kind!=='punctuation');
 return <div className="analysis-body">
  <div className="analysis-tokens">{tokens.map((t,i)=><div className={`analysis-token token-${t.kind}`} key={i}>
   <div>{t.wordId?<button type="button" className="text-btn" onClick={()=>onWord?.(t.wordId!)} aria-label={`查看单词 ${t.surface}`} lang="ja">{t.surface}</button>:<strong lang="ja">{t.surface}</strong>}{t.reading&&t.reading!==t.surface&&<small lang="ja">{t.reading}</small>}</div>
   <p>{t.meaning}</p>{t.lemma&&t.lemma!==t.surface&&<small>原形：<span lang="ja">{t.lemma}</span></small>}
  </div>)}</div>
  <div className="analysis-translations"><h3>逐词直译</h3><p>{explanation.literal}</p><h3>自然译文</h3><p>{explanation.translation}</p></div>
  {explanation.points.length>0&&<div className="analysis-points"><h3>句子怎么组成</h3><dl>{explanation.points.map((point,i)=><div key={i}><dt lang="ja">{point.label}</dt><dd>{point.explanation}</dd></div>)}</dl></div>}
  {explanation.notes.map((note,i)=><p className="analysis-note" key={i}>{note}</p>)}
  {explanation.grammarIds.length>0&&<div className="analysis-grammar"><h3>相关语法</h3><div className="chips">{explanation.grammarIds.map(id=><Link className="chip" key={id} to={`/grammar/${id}`}>{grammarMap.get(id)?.title}</Link>)}</div></div>}
 </div>;
}
