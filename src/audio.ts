import { audioPath } from './content';

let player: HTMLAudioElement | undefined;
let cancelPlayback: (()=>void) | undefined;
let generation=0;
let playingId:string|undefined;
export const currentAudioId=()=>playingId;
function markPlaying(id?:string){
  if(playingId===id)return;
  playingId=id;
  if(typeof window!=='undefined')window.dispatchEvent(new CustomEvent('audio-playback-state',{detail:id??null}));
}
export function stopAudio() {
  generation++;
  markPlaying();
  cancelPlayback?.(); cancelPlayback=undefined;
  if(player){player.pause();player.currentTime=0;player=undefined;}
}
function createPlayer(id:string,rate:number) {
  const a=new Audio(audioPath(id));a.playbackRate=rate;player=a;
  const clear=()=>{if(player===a)markPlaying();};
  a.addEventListener('ended',clear,{once:true});a.addEventListener('error',clear,{once:true});
  return a;
}
export async function playAudio(id:string) {
  stopAudio();const token=generation,a=createPlayer(id,1);
  a.addEventListener('error',()=>{if(token===generation)window.dispatchEvent(new CustomEvent('audio-error',{detail:'音频暂时无法播放，请重试。听辨可以跳过，不会记错。'}));},{once:true});
  try{await a.play();if(token===generation)markPlaying(id);}catch{if(token===generation)throw new Error('播放失败，请点击重试或检查音频资源。');}
}
// Completion, cancellation and failure are separate outcomes. A stopped sequence never advances.
export async function playSequence(ids:string[],rate=1,onTurn?:(index:number)=>void):Promise<boolean> {
  stopAudio();const token=generation;
  for(const [i,id] of ids.entries()) {
    if(token!==generation)return false;
    onTurn?.(i);const a=createPlayer(id,rate);
    const completed=await new Promise<boolean>((resolve,reject)=>{
      let settled=false;
      const finish=(done:boolean,error?:Error)=>{
        if(settled)return;settled=true;
        a.removeEventListener('ended',ended);a.removeEventListener('error',failed);
        if(cancelPlayback===cancel)cancelPlayback=undefined;
        if(error)reject(error);else resolve(done);
      };
      const ended=()=>finish(true),failed=()=>finish(false,new Error('对话音频播放失败，请重试；不会计作答错。'));
      const cancel=()=>finish(false);cancelPlayback=cancel;
      a.addEventListener('ended',ended,{once:true});a.addEventListener('error',failed,{once:true});
      void a.play().then(()=>{if(!settled&&token===generation)markPlaying(id);}).catch(()=>failed());
    });
    if(!completed||token!==generation)return false;
  }
  player=undefined;return true;
}
