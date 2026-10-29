import type { N5Lesson, Progress } from '../types';

export function n5LessonProgress(lesson:N5Lesson, progress:Progress[]) {
  const saved=progress.find(p=>p.id===lesson.id);
  const introduced=new Set(progress.filter(p=>p.introducedAt!==undefined).map(p=>p.id));
  const answers=lesson.questions.map((_,i)=>saved?.results?.[String(i)]);
  return {read:saved?.readAt!==undefined,introduced:lesson.wordIds.filter(id=>introduced.has(id)).length,answered:answers.filter(a=>a!==undefined).length,correct:answers.filter(a=>a===true).length,checkpointAnswered:answers.slice(lesson.checkpointFrom??answers.length).filter(a=>a!==undefined).length};
}
