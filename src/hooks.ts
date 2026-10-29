import { useEffect, useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from './data/db';

export function useStudyData(){
  return useLiveQuery(async()=>({cards:await db.cards.toArray(), progress:await db.progress.toArray(), guards:await db.guards.toArray(), session:await db.sessions.get('active'), settings:await db.settings.get('settings'), decks:await db.decks.toArray()}),[]);
}
export function useNow(){
  const [now,setNow]=useState(Date.now());
  useEffect(()=>{const refresh=()=>setNow(Date.now());const timer=setInterval(refresh,1000);window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);return()=>{clearInterval(timer);window.removeEventListener('focus',refresh);document.removeEventListener('visibilitychange',refresh);};},[]);
  return now;
}
export const dateLabel=(at:number,timezone='Asia/Shanghai')=>new Intl.DateTimeFormat('zh-CN',{timeZone:timezone,month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}).format(at);

export function useHistoryData(){
  return useLiveQuery(async()=>({reviews:await db.reviews.toArray(),practices:await db.practices.toArray()}),[]);
}
