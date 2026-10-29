import unitsData from '../content/units.json';
import type { Card as FSRSCard } from 'ts-fsrs';

export type LearningGoal = 'travel' | 'anime';
export interface Dialogue { id: string; title: string; goal: LearningGoal; intent: string; register: string; grammarIds: string[]; turns: {speaker: string; sentenceId: string}[]; questions: {prompt: string; options: string[]; answer: number; explanation: string}[]; note: string }
export interface Word { id: string; writing: string; reading: string; meaning: string; pos: string; unit: number; collocation: string; note: string; audioText: string; forms?: string[]; category?: string; group?: string; difficulty?: 1|2|3; frequency?: 'high'|'medium'|'context'; studyOrder?: number; goals?: LearningGoal[]; learningPriority?: number; usage?: 'neutral'|'polite'|'comprehension'; n5Unit?:number; n5Order?:number }
export interface Exercise { prompt: string; answer: string; accepted?: string[]; explanation: string }
export interface Grammar { id: string; title: string; intent: string; structure: string; explanation: string[]; pitfalls: string[]; prerequisites: string[]; unit: number; examples: string[]; exercises: Exercise[] }
export interface Segment { text: string; reading?: string; wordId?: string }
export interface Sentence { id: string; text: string; reading: string; translation: string; grammarIds: string[]; unit: number; segments?: Segment[]; wordIds?: string[] }
export interface SentenceExplanation { id:string; text:string; translation:string; literal:string; tokens:{surface:string;kind:string;meaning:string;reading?:string;wordId?:string;lemma?:string;note?:string;form?:string;grammarId?:string}[]; points:{label:string;explanation:string;grammarId?:string}[]; grammarIds:string[]; notes:string[] }
export interface Reading { id: string; title: string; titleJa: string; unit: number; sentenceIds: string[]; questions: {prompt: string; options: string[]; answer: number; explanation: string}[]; note: string }
export interface Kana { id: string; writing: string; reading: string; romaji: string; group: string; script: 'hira' | 'kata'; audioText: string }
export interface FoundationExample { text: string; reading: string; translation: string; audioId?: string; note?: string; beats?: string[]; pitch?: { moras: string[]; levels: ('L' | 'H')[]; particleFrom?: number } }
export interface FoundationLesson { id: string; title: string; intent: string; sections: {title: string; paragraphs: string[]}[]; examples: FoundationExample[]; practice: string[]; pitfalls: string[]; questions: {prompt: string; options: string[]; answer: number; explanation: string}[]; sources: {title: string; url: string}[] }
export interface FoundationCourse { id: string; title: string; intent: string; lessons: FoundationLesson[] }
export interface N5Lesson extends FoundationLesson {referenceWeek:number;phase:number;wordIds:string[];grammarIds:string[];readingIds:string[];kanji:string[];output:string;listening:{sentenceId:string;prompt:string;options:string[];answer:number;explanation:string};checkpointFrom?:number;checklist?:string[]}
export interface N5Course extends FoundationCourse {lessons:N5Lesson[];phases:string[];optional:{week:number;title:string;tasks:string[]}[];officialPracticeUrl:string;note:string}
export type Skill = 'meaning' | 'reading' | 'listening' | 'kana' | 'grammar';
export type Mode = 'recommended' | 'review' | 'new' | 'practice' | 'today';
export type SerializedFSRS = Omit<FSRSCard, 'due' | 'last_review'> & { due: number; last_review?: number };
export interface CountState { stage: number; remaining: number; rounds: number; queueOrder: number; lastCompletedDay?: string }
export interface LearningCard { count?: CountState; id: string; targetId: string; skill: Skill; paused: boolean; fsrs: SerializedFSRS; dueAt: number; createdAt: number; revision: number }
export interface Progress { id: string; introducedAt?: number; readAt?: number; practicedAt?: number; position?: number; results?: Record<string, boolean> }
export interface Guard { id: string; at: number; exceptCard?: string; gap?: number }
export interface StudyGroup { wordIds:string[]; startedAt:number }
export interface Session { id: 'active'; mode: Mode; activeId?: string; isIntroduction?: boolean; revealed: boolean; hintUsed: boolean; revealedAt?: number; updatedAt: number; revision: number; batch: string[]; completed?: string[]; day?: string; pendingRating?: number; lastEventId?: string; dailyExtra?: {day:string;target:number;limit:number}; studyGroup?:StudyGroup; lastTargetId?:string }
export interface ReviewEvent { id: string; cardId: string; at: number; rating: number; before: LearningCard; after: LearningCard; sessionBefore?: Session; guardBefore?: Guard; guardAfter?: Guard; sessionAfter?: Session; schedulerVersion: string; configId: string; rawLog: unknown; guardsBefore?: Guard[]; guardsAfter?: Guard[]; revertedAt?: number }
export interface Practice { id: string; targetId: string; skill: Skill | 'lookup' | 'exercise'; at: number; correct?: boolean; rating?: number; source?: 'practice' | 'today' }
export interface Deck { id: string; name: string; wordIds: string[] }
export interface Note { id: string; text: string }
export interface Settings { id: 'settings'; listening: boolean; autoPlay?: boolean; listeningEnabled?: boolean; furigana: boolean; timezone: string; lastBackupAt?: number; plannedWordIds?: string[]; planUpdatedAt?: number; dailyWordTarget?: number; studyGroupSize?:number }
export interface StoredMeta { id: string; value: string }
export const UNIT_NAMES: string[] = unitsData;
export const SKILL_NAMES: Record<Skill, string> = { meaning: '词义', reading: '读音', listening: '听力', kana: '假名', grammar: '句型' };
export const MODE_NAMES: Record<Mode, string> = { recommended: '混合学习', review: '只复习', new: '新词优先', practice: '自由练习', today: '复习今天的词' };
