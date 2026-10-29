import dialoguesData from '../content/dialogues.json';
import dialogueSentencesData from '../content/dialogue-sentences.prepared.json';
import wordsData from '../content/words.json';
import grammarData from '../content/grammar.json';
import sentencesData from '../content/sentences.prepared.json';
import readingsData from '../content/readings.json';
import kanaData from '../content/kana.json';
import examplesData from '../content/word-examples.prepared.json';
import beginnerData from '../content/beginner.json';
import pronunciationData from '../content/pronunciation.json';
import n5Data from '../content/n5-plan.json';
import type { N5Course } from './types';
import type { Word, Grammar, Sentence, Reading, Kana, Progress, Dialogue } from './types';
import type { FoundationCourse } from './types';

export const foundationCourses = [beginnerData, pronunciationData] as FoundationCourse[];
export const foundationLessons = foundationCourses.flatMap(course => course.lessons);
export const n5Course = n5Data as N5Course;

export const dialogues = dialoguesData as Dialogue[];
export const dialogueSentenceMap = new Map((dialogueSentencesData as Sentence[]).map(s=>[s.id,s]));
export const words = wordsData as Word[];
export const grammars = grammarData as Grammar[];
export const sentences = sentencesData as Sentence[];
export const wordExamples = examplesData as (Sentence & { wordId: string })[];
export const readings = readingsData as Reading[];
export const kana = kanaData as Kana[];
export const wordMap = new Map(words.map(w=>[w.id,w]));
export const grammarMap = new Map(grammars.map(g=>[g.id,g]));
export const sentenceMap = new Map(sentences.map(s=>[s.id,s]));
export const kanaMap = new Map(kana.map(k=>[k.id,k]));
export const validTargets = new Set([...wordMap.keys(),...grammarMap.keys(),...kanaMap.keys()]);
export const audioPath = (id:string) => `/audio/${encodeURIComponent(id)}.mp3`;
export function readingCoverage(r:Reading, progress:Progress[]) {
  const ss=r.sentenceIds.map(id=>sentenceMap.get(id)).filter((s):s is Sentence=>!!s);
  const wordIds=[...new Set(ss.flatMap(s=>s.wordIds??[]))]; const grammarIds=[...new Set(ss.flatMap(s=>s.grammarIds))];
  return { wordIds, grammarIds, known:wordIds.filter(id=>progress.some(p=>p.id===id&&p.introducedAt)).length, grammarKnown:grammarIds.filter(id=>progress.some(p=>p.id===id&&p.readAt)).length };
}

const n5GrammarIds=[...new Set(n5Course.lessons.flatMap(l=>l.grammarIds))];
export const orderedGrammars=[...n5GrammarIds.map(id=>grammarMap.get(id)!).filter(Boolean),...grammars.filter(g=>!n5GrammarIds.includes(g.id))];
