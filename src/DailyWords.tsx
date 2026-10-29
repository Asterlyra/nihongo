import { Link } from 'react-router-dom';
import { wordMap } from './content';
import { fullDate, RATING_LABELS, type dailyStats } from './domain/statistics';

export default function DailyWords({records,timezone}:{records:ReturnType<typeof dailyStats>['records'];timezone:string}){
  if(!records.length)return <p className="muted">这一天还没有背词记录。</p>;
  const time=(at:number)=>new Intl.DateTimeFormat('zh-CN',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(at);
  return <ul className="daily-word-list">{records.map(r=>{const word=wordMap.get(r.id);return <li key={r.id}>
    <Link to={`/words/${r.id}`}><strong lang="ja">{word?.writing??r.id}</strong><span lang="ja">{word?.reading}</span><small>{word?.meaning}</small></Link>
    <div className="daily-word-events"><span>{r.introduced?'新学':r.reviewCount?'正式复习':'主动练习'}</span><span>{r.reviewCount} 次正式反馈 · {r.practiceCount} 次主动练习</span>{r.lastRating!==undefined&&<span>最近正式反馈：{RATING_LABELS[r.lastRating]}</span>}</div>
    <div className="daily-word-time"><time dateTime={new Date(r.firstAt).toISOString()} title={fullDate(r.firstAt,timezone)}>首次 {time(r.firstAt)}</time><time dateTime={new Date(r.lastAt).toISOString()} title={fullDate(r.lastAt,timezone)}>最近 {time(r.lastAt)}</time><Link to={`/words/${r.id}`}>记忆历史 ↗</Link></div>
  </li>;})}</ul>;
}
