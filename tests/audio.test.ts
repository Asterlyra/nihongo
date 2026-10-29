import { afterEach, expect, it, vi } from 'vitest';
import { currentAudioId, playAudio, playSequence, stopAudio } from '../src/audio';

class FakeAudio extends EventTarget {
  static instances:FakeAudio[]=[];
  playbackRate=1;currentTime=0;
  reject?: (error:Error)=>void;
  resolve?: ()=>void;
  constructor(public src:string){super();FakeAudio.instances.push(this);}
  pause(){this.reject?.(new Error('aborted'));}
  play(){return new Promise<void>((resolve,reject)=>{this.resolve=resolve;this.reject=reject;});}
}
afterEach(()=>{stopAudio();FakeAudio.instances=[];vi.unstubAllGlobals();});
it('切页或另一发音中断加载时，不把取消当成播放失败',async()=>{
  vi.stubGlobal('Audio',FakeAudio);
  const dispatch=vi.fn();vi.stubGlobal('window',{dispatchEvent:dispatch});
  const first=playAudio('w001');const old=FakeAudio.instances[0];
  const second=playAudio('w002');stopAudio();
  await expect(first).resolves.toBeUndefined();await expect(second).resolves.toBeUndefined();
  old.dispatchEvent(new Event('error'));expect(dispatch).not.toHaveBeenCalled();
});
it('真实播放失败仍提示错误，停止整段播放不会继续下一句',async()=>{
  vi.stubGlobal('Audio',FakeAudio);vi.stubGlobal('window',{dispatchEvent:vi.fn()});
  const failed=playAudio('w001');FakeAudio.instances[0].reject?.(new Error('unavailable'));
  await expect(failed).rejects.toThrow('播放失败');
  const turn=vi.fn();const sequence=playSequence(['ds001','ds002'],1,turn);
  stopAudio();await expect(sequence).resolves.toBe(false);expect(turn.mock.calls).toEqual([[0]]);
});
it('播放指示跟随实际开始、结束和切换，旧声音的结束不清除新指示',async()=>{
  vi.stubGlobal('Audio',FakeAudio);const dispatch=vi.fn();vi.stubGlobal('window',{dispatchEvent:dispatch});
  const first=playAudio('w001');FakeAudio.instances[0].resolve?.();await first;
  expect(currentAudioId()).toBe('w001');
  const second=playAudio('w002');expect(currentAudioId()).toBeUndefined();
  FakeAudio.instances[1].resolve?.();await second;
  FakeAudio.instances[0].dispatchEvent(new Event('ended'));expect(currentAudioId()).toBe('w002');
  FakeAudio.instances[1].dispatchEvent(new Event('ended'));expect(currentAudioId()).toBeUndefined();
  expect(dispatch.mock.calls.map(([event])=>event.detail)).toEqual(['w001',null,'w002',null]);
});
