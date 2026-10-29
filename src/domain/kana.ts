import type { Kana } from '../types';

export function kanaListeningOptions(current:Kana,pool:Kana[],index:number):Kana[]{
  // A second script (or a homophone such as じ/ぢ) must not be a wrong answer.
  const unique=new Map<string,Kana>();
  for(const item of pool){
    if(item.romaji!==current.romaji&&!unique.has(item.romaji))unique.set(item.romaji,item);
  }
  const alternatives=[...unique.values()];
  const offset=index%Math.max(1,alternatives.length-2);
  return [current,...alternatives.slice(offset,offset+3)].sort((a,b)=>a.writing.localeCompare(b.writing));
}
