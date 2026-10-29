"""Generate private local Japanese audio. Audio files are excluded from source distribution."""
from pathlib import Path
import json, subprocess, concurrent.futures, tempfile, hashlib, os

ROOT = Path(__file__).resolve().parents[1]
manifest = json.loads((ROOT/'content/audio-manifest.json').read_text())
dest = ROOT/'public/audio'
dest.mkdir(parents=True,exist_ok=True)
report_path = ROOT/'content/audio-local-report.json'
old = json.loads(report_path.read_text()) if report_path.exists() else {}
previous = {a['id']:a for a in old.get('assets',[])}

def generate(asset):
    path=dest/f"{asset['id']}.mp3"
    digest=hashlib.sha256(asset['text'].encode()).hexdigest()
    if path.exists() and path.stat().st_size>400 and previous.get(asset['id'],{}).get('textHash')==digest:
        return previous[asset['id']]
    with tempfile.TemporaryDirectory(prefix='nihongo-audio-') as temp:
        source=Path(temp)/'source.aiff'
        subprocess.run(['say','-v','Kyoko','-r','150','-o',str(source),asset['text']],check=True,capture_output=True)
        result=subprocess.run(['ffmpeg','-loglevel','error','-y','-i',str(source),'-ac','1','-ar','24000','-codec:a','libmp3lame','-b:a','64k',str(path)],check=True,capture_output=True)
        probe=subprocess.run(['ffprobe','-v','error','-show_entries','format=duration','-of','json',str(path)],check=True,capture_output=True,text=True)
        duration=float(json.loads(probe.stdout)['format']['duration'])
        if duration<=0.05: raise ValueError(f"Empty audio: {asset['id']}")
        return {'id':asset['id'],'text':asset['text'],'textHash':digest,'duration':duration,'bytes':path.stat().st_size,'source':'macOS Kyoko','check':'input text reviewed; decoded duration checked; no human listening audit'}

if __name__=='__main__':
    assets=[]
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        for i,a in enumerate(pool.map(generate,manifest['assets']),1):
            assets.append(a)
            if i%50==0: print(f"Audio {i}/{len(manifest['assets'])}",flush=True)
    report_path.write_text(json.dumps({'source':'macOS Kyoko','usage':'local personal noncommercial; do not redistribute generated files','assets':assets},ensure_ascii=False,indent=2)+'\n')
    print(f"Generated/verified {len(assets)} local audio files",flush=True)
