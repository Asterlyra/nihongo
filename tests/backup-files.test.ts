import { beforeEach, afterEach, expect, it, vi } from 'vitest';
import { StudyDB } from '../src/data/db';
import { exportBackup, restoreWithSafetyBackup, validateImport } from '../src/data/backup';
import { saveJSONFile } from '../src/platform';

vi.mock('../src/platform', () => ({ saveJSONFile: vi.fn() }));
let database: StudyDB;
beforeEach(async () => {
  vi.mocked(saveJSONFile).mockReset();
  database = new StudyDB(`backup-files-${crypto.randomUUID()}`);
  await database.open();
  await database.settings.put({ id: 'settings', listening: false, furigana: true, timezone: 'Asia/Shanghai' });
});
afterEach(async () => { await database.delete(); });

it.each(['已取消保存', '文件写入失败'])('恢复前备份%s时保留全部现有数据', async message => {
  const incoming = await validateImport(await exportBackup(database));
  await database.notes.put({ id: 'w001', text: '不能丢失的笔记' });
  const original = await exportBackup(database);
  vi.mocked(saveJSONFile).mockRejectedValueOnce(new Error(message));
  await expect(restoreWithSafetyBackup(incoming, new Set(), database)).rejects.toThrow(message);
  expect((await exportBackup(database)).data).toEqual(original.data);
});

it('保存恢复前备份完成之后才替换数据库', async () => {
  const incoming = await validateImport(await exportBackup(database));
  await database.notes.put({ id: 'w001', text: '原有笔记' });
  let finishSave: () => void = () => {};
  vi.mocked(saveJSONFile).mockImplementationOnce(() => new Promise<void>(resolve => { finishSave = resolve; }));
  const restored = restoreWithSafetyBackup(incoming, new Set(), database);
  await vi.waitFor(() => expect(saveJSONFile).toHaveBeenCalledOnce());
  expect((await database.notes.get('w001'))?.text).toBe('原有笔记');
  finishSave();
  await restored;
  expect(await database.notes.count()).toBe(0);
  expect(vi.mocked(saveJSONFile).mock.calls[0][0]).toMatchObject({ data: { notes: [{ id: 'w001', text: '原有笔记' }] } });
});
