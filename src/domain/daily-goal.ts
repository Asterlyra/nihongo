import type { Session } from '../types';

export const DEFAULT_DAILY_TARGET=30;
export const validDailyTarget=(target:number)=>Number.isInteger(target)&&target>=0&&target<=50000;
export function dailyGoal(target:number|undefined,done:number,day:string,session?:Session){
  const goal=target??DEFAULT_DAILY_TARGET;
  const extra=session?.dailyExtra;
  const limit=extra?.day===day&&extra.target===goal?Math.max(goal,extra.limit):goal;
  return {target:goal,done,limit,remaining:goal===0?undefined:Math.max(0,limit-done),reached:goal!==0&&done>=limit,completed:goal!==0&&done>=goal};
}
