import { lazy, Suspense, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import type { Sentence } from './types';
import './sentence-analysis.css';

const AnalysisBody=lazy(()=>import('./SentenceAnalysisBody'));

export function SentenceAnalysis({sentence,onWord}:{sentence:Sentence;onWord?:(id:string)=>void}){
 const [open,setOpen]=useState(false);
 return <details className="sentence-analysis" onToggle={e=>setOpen(e.currentTarget.open)}>
  <summary><span>逐词解释与语法</span><ChevronDown size={16}/></summary>
  {open&&<Suspense fallback={<p className="micro">正在打开解释…</p>}><AnalysisBody sentence={sentence} onWord={onWord}/></Suspense>}
 </details>;
}
