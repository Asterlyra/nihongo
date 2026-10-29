"""Verify local MP3 decoding; this does not assess Japanese pronunciation."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
import hashlib, json, subprocess
ROOT=Path(__file__).resolve().parents[1]
manifest=json.loads((ROOT/'content/audio-manifest.json').read_text())
def verify(asset):
    path=ROOT/'public/audio'/f"{asset['id']}.mp3"
    subprocess.run(['ffmpeg','-v','error','-i',str(path),'-f','null','-'],check=True,capture_output=True)
    return {'id':asset['id'],'sha256':hashlib.sha256(path.read_bytes()).hexdigest(),'decoded':True}
with ThreadPoolExecutor(max_workers=8) as pool:
    assets=list(pool.map(verify,manifest['assets']))
result={'checkedAt':datetime.now(timezone.utc).isoformat(),'count':len(assets),'check':'Full MP3 decoding succeeded; no human listening audit','assets':assets}
(ROOT/'content/audio-validation-report.json').write_text(json.dumps(result,ensure_ascii=False,indent=2)+'\n')
print(f"Decoded {len(assets)} complete MP3 files without errors.")
