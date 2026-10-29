import { it, expect } from 'vitest';
import { StudyDB } from '../src/data/db';
import { recordExercise } from '../src/data/store';
import { exportBackup, validateImport, restoreBackup } from '../src/data/backup';
import { foundationCourses } from '../src/content';
import { dailyStats } from '../src/domain/statistics';

it('入门与发音题独立记录、备份恢复，不改变正式复习和每日背词计数', async () => {
  const database = new StudyDB(`foundation-qa-${crypto.randomUUID()}`);
  try {
    await database.open();
    await database.settings.add({id:'settings', listening:false, furigana:true, timezone:'Asia/Shanghai'});
    for (const course of foundationCourses) {
      const lesson = course.lessons[0];
      await database.progress.add({id:lesson.id, readAt:Date.UTC(2026,9,13)});
      await recordExercise(lesson.id, false, '0', database, Date.UTC(2026,9,13,1));
      await recordExercise(lesson.id, true, '0', database, Date.UTC(2026,9,13,2));
      expect(await database.progress.get(lesson.id)).toMatchObject({results:{'0':true}});
    }
    const progress = await database.progress.toArray(), practices = await database.practices.toArray();
    expect(dailyStats('2026-10-13', progress, [], practices, new Set(['w001']), 'Asia/Shanghai').words).toEqual([]);
    const backup = await validateImport(await exportBackup(database));
    await database.progress.clear();
    await database.practices.clear();
    await restoreBackup(backup, new Set(['w001']), database);
    expect(await database.progress.toArray()).toEqual(progress);
    expect(await database.practices.toArray()).toEqual(practices);
    expect(await database.cards.count()).toBe(0);
    expect(await database.reviews.count()).toBe(0);
  } finally { await database.delete(); }
});
