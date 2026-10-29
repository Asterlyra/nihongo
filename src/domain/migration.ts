import type { LearningCard, ReviewEvent } from '../types';
import { dayKey } from './statistics';
export function migrateCountCard(card:LearningCard,reviews:ReviewEvent[],timezone:string):LearningCard{
  if(card.count)return card;
  const days=new Set(reviews.filter(e=>e.cardId===card.id&&!e.revertedAt&&e.rating===3).map(e=>dayKey(e.at,timezone)));
  const graduated=card.fsrs.state===2;
  return {...card,revision:card.revision+1,count:{stage:graduated?Math.min(5,Math.max(1,days.size)):0,remaining:graduated?0:2,rounds:days.size,queueOrder:card.dueAt}};
}
