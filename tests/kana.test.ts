import { expect, it } from 'vitest';
import kanaData from '../content/kana.json';
import type { Kana } from '../src/types';
import { kanaListeningOptions } from '../src/domain/kana';

const kana=kanaData as Kana[];

it('混合听音题不能把另一种字形或同音假名当作错误选项',()=>{
  for(const writing of ['あ','ア','お','を','じ','ぢ','ず','づ']){
    const current=kana.find(k=>k.writing===writing)!;
    const options=kanaListeningOptions(current,kana.filter(k=>k.group===current.group),0);
    expect(options.filter(k=>k.romaji===current.romaji).map(k=>k.id)).toEqual([current.id]);
  }
});

it('全课程的单字形和混合题均保留正确ID，给出四个不同读音的选项',()=>{
  for(const current of kana){
    for(const mixed of [false,true]){
      const pool=kana.filter(k=>k.group===current.group&&(mixed||k.script===current.script));
      for(let index=0;index<12;index++){
        const options=kanaListeningOptions(current,pool,index);
        expect(options).toHaveLength(4);
        expect(options.map(k=>k.id)).toContain(current.id);
        expect(new Set(options.map(k=>k.romaji)).size).toBe(4);
        expect(options.every(k=>pool.some(p=>p.id===k.id))).toBe(true);
      }
    }
  }
});
