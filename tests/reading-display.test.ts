import { it, expect } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SentenceReading, SentenceText } from '../src/components';
import StudyWord from '../src/StudyWord';
import type { Sentence } from '../src/types';
import { wordMap } from '../src/content';

const sentence: Sentence = {id:'qa',text:'コーヒーを店で飲む。',reading:'こーひーをみせでのむ。',translation:'在店里喝咖啡。',grammarIds:[],unit:1,segments:[{text:'コーヒー',reading:'こーひー',wordId:'w123'},{text:'を'},{text:'店',reading:'みせ'},{text:'で'},{text:'飲む',reading:'のむ'},{text:'。'}]};
it('例句汉字用平假名注音，片假名不重复注音；查词与背词渲染一致',()=>{
  for (const Component of [SentenceReading, SentenceText]) {
    const html = renderToStaticMarkup(createElement(Component,{sentence}));
    expect(html).toContain('<ruby>店<rt>みせ</rt></ruby>');
    expect(html).toContain('<ruby>飲む<rt>のむ</rt></ruby>');
    expect(html).not.toContain('<ruby>コーヒー');
  }
});
it('片假名词不再另列重复读音，例句仍有独立播放按钮',()=>{
  const html=renderToStaticMarkup(createElement(StudyWord,{word:wordMap.get('w123')!,answered:true,onHint:async()=>{},onSkip:()=>{}}));
  expect(html).not.toContain('study-pronunciation');
  expect(html).toContain('aria-label="播放例句"');
});
it('读音和听辨回忆前答案区隐藏且不能操作；听辨连词头也隐藏',()=>{
  const props={word:wordMap.get('w006')!,answered:false,onHint:async()=>{},onSkip:()=>{}};
  const reading=renderToStaticMarkup(createElement(StudyWord,{...props,skill:'reading'}));
  expect(reading).toContain('aria-label="听读音提示（本次记为忘记）"');
  expect(reading).toContain('class="reference-definition" data-concealed="true" aria-hidden="true" inert=""');
  expect(reading).toContain('class="study-example" data-concealed="true" aria-hidden="true" inert=""');
  const listening=renderToStaticMarkup(createElement(StudyWord,{...props,skill:'listening'}));
  expect(listening).toMatch(/class="study-word" data-concealed="true" aria-hidden="true"/);
  const answer=renderToStaticMarkup(createElement(StudyWord,{...props,answered:true,skill:'reading'}));
  expect(answer).not.toContain('data-concealed="true"');
  expect(answer).not.toContain('inert=""');
});
