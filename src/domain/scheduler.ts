import { countSchedule, COUNT_VERSION, COUNT_CONFIG } from './count-scheduler';
import { createEmptyCard, fsrs, generatorParameters, Rating } from 'ts-fsrs';
import type { Card, Grade } from 'ts-fsrs';
import type { LearningCard, SerializedFSRS, Skill } from '../types';

export const SCHEDULER_VERSION = 'ts-fsrs@5.4.2';
export const CONFIG_ID = 'fsrs-v1-retention90';
export const PARAMETERS = generatorParameters({ request_retention: 0.9, enable_fuzz: false, learning_steps: ['1m', '10m'], relearning_steps: ['10m'] });
const scheduler = fsrs(PARAMETERS);
export const serialize = (c: Card): SerializedFSRS => ({ ...c, due: c.due.getTime(), last_review: c.last_review?.getTime() });
export const deserialize = (c: SerializedFSRS): Card => ({ ...c, due: new Date(c.due), last_review: c.last_review === undefined ? undefined : new Date(c.last_review) });
export const cardId = (targetId: string, skill: Skill) => `${targetId}:${skill}:v1`;
export function newCard(targetId: string, skill: Skill, now: number): LearningCard {
  const c = createEmptyCard(new Date(now + 60_000));
  return { id: cardId(targetId, skill), targetId, skill, paused: false, fsrs: serialize(c), dueAt: c.due.getTime(), createdAt: now, revision: 0 };
}
export function newCountCard(targetId:string,skill:Skill,now:number):LearningCard {
  const c=newCard(targetId,skill,now);return {...c,count:{stage:0,remaining:2,rounds:0,queueOrder:now},dueAt:now,fsrs:{...c.fsrs,due:now}};
}
export const schedulerIdentity=(card:LearningCard)=>card.count?{schedulerVersion:COUNT_VERSION,configId:COUNT_CONFIG}:{schedulerVersion:SCHEDULER_VERSION,configId:CONFIG_ID};
export function schedule(card: LearningCard, rating: number, now: number, hintUsed = false, timezone='Asia/Shanghai') {
  if(card.count)return countSchedule(card,rating,now,hintUsed,timezone);
  if (card.fsrs.last_review !== undefined && now < card.fsrs.last_review) throw new Error('系统时间早于上次复习，请检查设备时间。');
  if (![Rating.Again, Rating.Hard, Rating.Good].includes(rating)) throw new Error('反馈类型无效。');
  const appliedRating = hintUsed ? Rating.Again : rating;
  const result = scheduler.next(deserialize(card.fsrs), new Date(now), appliedRating as Grade);
  return { rating: appliedRating, after: { ...card, fsrs: serialize(result.card), dueAt: result.card.due.getTime(), revision: card.revision + 1 }, rawLog: result.log };
}
export function intervalLabel(card: LearningCard, rating: number, now: number): string {
  if (card.fsrs.last_review !== undefined && now < card.fsrs.last_review) return '请检查设备时间';
  const ms = schedule(card, rating, now).after.dueAt - now;
  if (ms < 3600_000) return `${Math.max(1, Math.round(ms / 60_000))} 分钟后`;
  if (ms < 86400_000) return `${Math.round(ms / 3600_000)} 小时后`;
  return `${Math.max(1, Math.round(ms / 86400_000))} 天后`;
}

// Hypothetical branches use the very same scheduler and parameters as real reviews.
export function memoryBranches(card: LearningCard, now: number, days = 30) {
  if (card.count || (card.fsrs.last_review ?? 0) > now) return [];
  return [3,2,1].map(rating=>{
    const after=schedule(card,rating,now).after;
    return {rating,dueAt:after.dueAt,stability:after.fsrs.stability,points:Array.from({length:61},(_,i)=>({day:i*days/60,probability:scheduler.forgetting_curve(i*days/60,after.fsrs.stability)}))};
  });
}

export const memoryProbability = (stability:number, days:number) => scheduler.forgetting_curve(days,stability);
