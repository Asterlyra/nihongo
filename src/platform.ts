import { Capacitor, registerPlugin } from '@capacitor/core';

export const isAndroidApp = Capacitor.isNativePlatform() && Capacitor.getPlatform() === 'android';
export const localDataPlace = isAndroidApp ? '此手机 App' : '此浏览器';
export const MAX_BACKUP_BYTES = 30 * 1024 * 1024;

interface BackupFilesPlugin {
  save(options: { filename: string; content: string }): Promise<{ cancelled: boolean }>;
  open(): Promise<{ cancelled: boolean; content?: string }>;
}
const BackupFiles = registerPlugin<BackupFilesPlugin>('BackupFiles');

export async function saveJSONFile(value: unknown, filename: string): Promise<void> {
  const content = JSON.stringify(value, null, 2);
  if (isAndroidApp) {
    const result = await BackupFiles.save({ filename, content });
    if (result.cancelled) throw new Error('已取消保存，学习数据没有改变。');
    return;
  }
  const url = URL.createObjectURL(new Blob([content], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url; link.download = filename; link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
}

export async function openAndroidBackup(): Promise<unknown | undefined> {
  const result = await BackupFiles.open();
  if (result.cancelled) return undefined;
  if (typeof result.content !== 'string') throw new Error('没有读取到备份文件，请重试。');
  return JSON.parse(result.content);
}
