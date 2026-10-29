// Authoring helper for this fixed course, not a general Japanese parser.
// Every unmatched span is rejected by the preparation/check workflow.
export const functionEntries = [
 ['ではありませんでした','不是（过去）','过去的礼貌否定判断。','g02'],
 ['じゃありませんでした','不是（过去）','ではありませんでした的较口语形式。','g02'],
 ['ではありません','不是','名词或な形容词的礼貌否定。','g02'],
 ['じゃありません','不是','ではありません的较口语形式。','g02'],
 ['ではなかった','原先不是','普通形的过去否定判断。','g26'],
 ['じゃなかった','原先不是','ではなかった的口语形式。','g26'],
 ['ではない','不是','普通形的否定判断。','g25'],
 ['じゃない','不是','ではない的口语形式；句末也可能用于反问，要结合语调。','g25'],
 ['だった','原先是','名词或な形容词的普通形过去。','g26'],
 ['でした','原先是','名词或な形容词的礼貌过去。','g18'],
 ['なんです','是这样的','名词／な形容词＋なんです，用来解释情况。','g29'],
 ['んです','是这样的','普通形＋んです，用来解释情况，不单独译为“是”。','g29'],
 ['んだ','是这样的','んです的普通形，常见于熟人对话。','g29'],
 ['なんだ','原来是这样／是这样的','名词／な形容词＋なんだ；具体语气取决于上下文。','g29'],
 ['なの','是……吗','名词／な形容词后的说明或询问形式；本课程句末为询问。','g29'],
 ['でしょう','大概……吧／对吧','表示推测或请对方确认，含义与语调有关。','g31'],
 ['でしょ','……吧／对吧','でしょう的口语形式。','g31'],
 ['です','是／礼貌结尾','名词后构成判断句；形容词后主要表示礼貌，不必硬译“是”。','g01'],
 ['だ','是／普通形判断','名词或な形容词的普通形判断。','g25'],
 ['ことができます','能够……','接动词辞书形，表示能力或条件允许。','g24'],
 ['ことができる','能够……','ことができます的普通形。','g24'],
 ['もいいですか','可以……吗','接动词て形，请求许可。','g22'],
 ['はいけません','不可以……','接动词て形，表示禁止。','g22'],
 ['ください','请……','接て形表示请求；接名词＋を时表示“请给我……”。','g21'],
 ['なくていい','不必……','接否定词干，表示没有必要做某事。'],
 ['ので','因为……','连接原因和结果；名词／な形容词非过去肯定前接な。','g28'],
 ['から','从／因为','名词后可表示起点；句子后可说明原因。','g28'],
 ['まで','到……为止','表示时间或空间的终点。'],
 ['より','比……','表示比较的基准；也可用于表示起点。'],
 ['だけ','仅仅／只有','限定范围，不等于所有场合都带排斥或负面语气。'],
 ['しか','只有','与否定表达配合表示“只有……”。'],
 ['くらい','大约','接数量表示大致程度或数量。'],
 ['ぐらい','大约','与くらい同样可表示大致数量。'],
 ['って','引用／谈到……','口语中可作引用标记或引出话题；不能一律译为“说”。','g30'],
 ['では','在／关于（提示或对比）','で＋は，把场所、条件等作为话题或对比。'],
 ['へは','至于去……','へ＋は，把移动方向作为话题。','g15'],
 ['には','在／对……（提示或对比）','に＋は，在地点、对象等后添加提示或对比。'],
 ['とは','所谓／至于……','と＋は，用于提出定义或话题；结合句子理解。'],
 ['は','关于……','读わ，提示话题，也可表示对比；通常不直接译成一个中文词。','g01'],
 ['が','主语／对象标记','标记主语；好き、できる等表达前也可标记对象。','g16'],
 ['を','宾语标记','读お，标记动作对象；经过或离开的场所也可用を。','g12'],
 ['に','在／到／对','标记具体时间、存在地点、目的地或对象，按本句搭配理解。','g14'],
 ['で','在／用','标记动作发生的地点、手段或范围；不能与存在地点的に混用。','g13'],
 ['へ','向／往','作助词读え，标记移动方向。','g15'],
 ['と','和／引用','连接名词、标记同行者，或引出引用内容，按本句搭配理解。'],
 ['の','的／说明或询问','名词间连接修饰关系；句末的の可以解释情况或提问。','g04'],
 ['も','也','添加同类信息，作提示助词；可替换は、が或を。','g07'],
 ['か','吗／或','句末表示提问，名词之间可表示选择。','g03'],
 ['ね','啊／对吧','表达共感或确认，通常不必逐字翻译。','g31'],
 ['よ','呀／告诉你','向对方提供信息或加强提醒；不等于所有场合都强硬。','g31'],
 ['な','修饰连接','な形容词修饰名词时使用；原因表达なので也包含这个な。','g09'],
 ['お','礼貌前缀','接部分名词或动词表达礼貌，不单独译出。'],
 ['ご','礼貌前缀','接部分名词或动词表达礼貌，不单独译出。'],
 ['ば','如果','条件连接形式，具体活用要看前面的动词或形容词。'],
 ['たり','列举动作','与动词た形连接，举出若干动作，常与する一起使用。'],
 ['さん','先生／女士（敬称）','放在姓名等之后，通常不用于称呼自己。'],
 ['たち','们','表示复数群体，通常接人称或人的称呼。'],
 ['たい','想……','接ます词干表示愿望；たい自身按い形容词变化。','g23'],
 ['て','连接／て形','连接动作或后续表达；不是每个て形都表示时间上的先后。','g21'],
 ['ん','口语说明成分','の的口语缩约，和后面的だ／です一起解释情况。','g29'],
 ['ましょう','一起……吧','礼貌的建议或意向。','g20'],
 ['ませんか','要不要……','礼貌邀请，也可能是普通否定疑问，要看语境。','g20'],
 ['ます','礼貌非过去','表示习惯、将来或一般动作，不自动表示“正在”。','g10'],
 ['ません','不……','动词的礼貌非过去否定。','g11'],
 ['ました','……了','动词的礼貌过去，不单独作为新词背诵。','g18'],
 ['ませんでした','没有……','动词的礼貌过去否定。','g18'],
].map(([surface,meaning,note,grammarId])=>({surface,meaning,note,grammarId,kind:'grammar'}));

const row={う:['い','わ','って','った','え','お'],く:['き','か','いて','いた','け','こ'],ぐ:['ぎ','が','いで','いだ','げ','ご'],す:['し','さ','して','した','せ','そ'],つ:['ち','た','って','った','て','と'],ぬ:['に','な','んで','んだ','ね','の'],ぶ:['び','ば','んで','んだ','べ','ぼ'],む:['み','ま','んで','んだ','め','も'],る:['り','ら','って','った','れ','ろ']};
const labels={polite:'ます形：礼貌非过去',negativePolite:'ません：礼貌否定',pastPolite:'ました：礼貌过去',pastNegativePolite:'ませんでした：礼貌过去否定',invite:'ましょう：礼貌建议／意向',negative:'ない形：普通形否定',pastNegative:'なかった：普通形过去否定',te:'て形：连接后续表达',past:'た形：普通形过去',volitional:'意向形：表示提议或意愿',potential:'可能形：能力或条件允许',potentialPolite:'可能形＋ます：礼貌地表达能力或可行性',negativeRequest:'ない形＋で：句末可表示“不要……”',desire:'たい：想做……',desireNegative:'たくない：不想做……',progressive:'ている：进行或结果状态，按本句理解',progressivePolite:'ています：进行或结果状态的礼貌表达',progressiveNegative:'ていない：进行或结果状态的否定',progressivePast:'ていた：过去的进行或结果状态',contractedPast:'てた／でた：ていた／でいた的口语缩约',contractedProgressive:'てる／でる：ている／でいる的口语缩约',contractedNegative:'てない／でない：ていない／でいない的口语缩约',preparation:'とく／どく：ておく／でおく的口语缩约，预先做好',completion:'ちゃう／じゃう：てしまう／でしまう的口语缩约',completionPast:'ちゃった／じゃった：てしまった／でしまった的口语缩约',adjectiveNegative:'词干＋くない：い形容词否定',adjectivePast:'词干＋かった：い形容词过去',adjectivePastNegative:'词干＋くなかった：い形容词过去否定',adverbial:'词干＋く：い形容词的副词形式',naModifier:'な形容词＋な：修饰后面的名词'};
const grammarFor={polite:'g10',negativePolite:'g11',pastPolite:'g18',pastNegativePolite:'g18',invite:'g20',negative:'g25',pastNegative:'g26',te:'g21',past:'g26',volitional:'g31',potential:'g24',potentialPolite:'g24',negativeRequest:'g28',desire:'g23',desireNegative:'g23',progressive:'g27',progressivePolite:'g27',progressiveNegative:'g27',progressivePast:'g27',contractedPast:'g32',contractedProgressive:'g32',contractedNegative:'g32',preparation:'g32',completion:'g32',completionPast:'g32',adjectiveNegative:'g08',adjectivePast:'g26',adjectivePastNegative:'g26',adverbial:'g08',naModifier:'g09'};

export function wordForms(w){
 const out=[{surface:w.writing,reading:w.reading,wordId:w.id,lemma:w.writing,meaning:w.meaning,kind:'word'}];
 let lemma=w.writing;
 const add=(surface,reading,form)=>{const tags=[/negative|Negative/.test(form)&&'否定',/Past|past/.test(form)&&'过去',/potential/.test(form)&&'能够',/desire/.test(form)&&'愿望'].filter(Boolean);out.push({surface,reading,wordId:w.id,lemma,meaning:w.meaning+(tags.length?`（${tags.join('、')}）`:''),kind:'word',form,grammarId:grammarFor[form],note:labels[form]});};
 const append=(stem,r,suffix,form)=>add(stem+suffix,r+suffix,form);
 let stem,rs,te,rte,past,rpast,neg,rneg,pot,rpot,vol,rvol;
 const suru=w.writing==='する'||w.writing.endsWith('する')||/する動詞/.test(w.pos)||w.forms?.some(f=>f===w.writing+'する');
 const kuru=w.writing==='来る'||/来る/.test(w.pos);
 if(suru){const base=w.writing.endsWith('する')?w.writing.slice(0,-2):w.writing,rbase=w.reading.endsWith('する')?w.reading.slice(0,-2):w.reading;lemma=base+'する';stem=base+'し';rs=rbase+'し';te=base+'して';rte=rbase+'して';past=base+'した';rpast=rbase+'した';neg=base+'しない';rneg=rbase+'しない';pot=base+'できる';rpot=rbase+'できる';vol=base+'しよう';rvol=rbase+'しよう';}
 else if(kuru){const base=w.writing==='来る'?'来':w.writing.slice(0,-2),rbase=w.reading.slice(0,-2);stem=base;rs=rbase+'き';te=base+(w.writing==='来る'?'て':'きて');rte=rbase+'きて';past=base+(w.writing==='来る'?'た':'きた');rpast=rbase+'きた';neg=base+(w.writing==='来る'?'ない':'こない');rneg=rbase+'こない';pot=base+(w.writing==='来る'?'られる':'こられる');rpot=rbase+'こられる';vol=base+(w.writing==='来る'?'よう':'こよう');rvol=rbase+'こよう';if(w.writing!=='来る')stem=base+'き';}
 else if(/動詞|動詞句/.test(w.pos)&&/一段/.test(w.pos)){stem=w.writing.slice(0,-1);rs=w.reading.slice(0,-1);te=stem+'て';rte=rs+'て';past=stem+'た';rpast=rs+'た';neg=stem+'ない';rneg=rs+'ない';pot=stem+'られる';rpot=rs+'られる';vol=stem+'よう';rvol=rs+'よう';}
 else if(/動詞|動詞句/.test(w.pos)&&row[w.writing.at(-1)]){const a=row[w.writing.at(-1)],base=w.writing.slice(0,-1),rbase=w.reading.slice(0,-1);stem=base+a[0];rs=rbase+a[0];const iku=w.writing==='行く'||w.writing.endsWith('いく');te=base+(iku?'って':a[2]);rte=rbase+(iku?'って':a[2]);past=base+(iku?'った':a[3]);rpast=rbase+(iku?'った':a[3]);neg=w.writing==='ある'?'ない':base+a[1]+'ない';rneg=w.writing==='ある'?'ない':rbase+a[1]+'ない';pot=base+a[4]+'る';rpot=rbase+a[4]+'る';vol=base+a[5]+'う';rvol=rbase+a[5]+'う';}
 if(stem!==undefined){
  for(const [s,f] of [['ます','polite'],['ません','negativePolite'],['ました','pastPolite'],['ませんでした','pastNegativePolite'],['ましょう','invite'],['たい','desire'],['たくない','desireNegative']])append(stem,rs,s,f);
  add(te,rte,'te');add(past,rpast,'past');add(neg,rneg,'negative');add(neg.slice(0,-1)+'かった',rneg.slice(0,-1)+'かった','pastNegative');add(neg+'で',rneg+'で','negativeRequest');add(pot,rpot,'potential');add(pot.slice(0,-1)+'ます',rpot.slice(0,-1)+'ます','potentialPolite');add(vol,rvol,'volitional');
  for(const [s,f] of [['いる','progressive'],['います','progressivePolite'],['いない','progressiveNegative'],['いた','progressivePast']])append(te,rte,s,f);
  for(const [s,f] of [['る','contractedProgressive'],['ない','contractedNegative'],['た','contractedPast']])append(te,rte,s,f);
  const root=te.slice(0,-1),rr=rte.slice(0,-1),voiced=te.endsWith('で');
  for(const [s,f] of [[voiced?'どく':'とく','preparation'],[voiced?'じゃう':'ちゃう','completion'],[voiced?'じゃった':'ちゃった','completionPast']])append(root,rr,s,f);
 }
 if(/い形容詞/.test(w.pos)&&w.writing.endsWith('い')){const stem=w.writing.endsWith('いい')?w.writing.slice(0,-2)+'よ':w.writing.slice(0,-1),r=w.reading.endsWith('いい')?w.reading.slice(0,-2)+'よ':w.reading.slice(0,-1);for(const [s,f] of [['くない','adjectiveNegative'],['かった','adjectivePast'],['くなかった','adjectivePastNegative'],['く','adverbial']])append(stem,r,s,f);}
 if(/な形容詞/.test(w.pos))append(w.writing,w.reading,'な','naModifier');
 // Kana spellings are accepted as surface variants of the same lexeme.
 for(const item of [...out])if(item.reading!==item.surface)out.push({...item,surface:item.reading});
 return out;
}

export function createAnalyzer(words,extraEntries=[],overrides={}){
 const wordMap=new Map(words.map(w=>[w.id,w]));
 const candidates=[...extraEntries.map(e=>{const w=e.wordId?wordMap.get(e.wordId):words.find(w=>w.writing===e.surface&&(!e.reading||w.reading===e.reading));return {...(w?{wordId:w.id,lemma:w.writing}:{}),...e,kind:e.kind??(w?'word':'expression'),priority:3};}),...functionEntries.map(e=>{const w=words.find(w=>w.writing===e.surface);return {...(w?{wordId:w.id,lemma:w.writing}:{}),...e,priority:2};}),...words.flatMap(wordForms).map(e=>({...e,priority:1}))].sort((a,b)=>b.surface.length-a.surface.length||b.priority-a.priority);
 const byFirst=new Map();for(const e of candidates){const list=byFirst.get(e.surface[0])??[];list.push(e);byFirst.set(e.surface[0],list);}
 return function analyze(s){
  const tokens=[];
  const custom=overrides[s.id];
  if(custom?.tokens){tokens.push(...custom.tokens.map(t=>({...t,...(t.wordId?{lemma:t.lemma??wordMap.get(t.wordId)?.writing}:{} )})));}
  else{
   // Choose a fully covered path before longest-match preference. Greedy matching
   // mistakes は＋ここ for 箱(はこ), and は＋いくら for はい.
   const paths=new Map([[s.text.length,{cost:0,tokens:[]}]]);
   for(let pos=s.text.length-1;pos>=0;pos--){
    const punctuation=/^[\s。、？！!?「」『』（）()・：:〜～—―…]+/u.exec(s.text.slice(pos));
    const choices=punctuation?[{surface:punctuation[0],kind:'punctuation',meaning:'',priority:3}]:(byFirst.get(s.text[pos])??[]).filter(e=>s.text.startsWith(e.surface,pos));
    let best={cost:1000+paths.get(pos+1).cost,tokens:[{surface:s.text[pos],kind:'unknown',meaning:''},...paths.get(pos+1).tokens]};
    for(const entry of choices){const tail=paths.get(pos+entry.surface.length);const cost=tail.cost+(entry.kind==='punctuation'?0:1)+(3-entry.priority)*0.001-(s.wordId&&entry.wordId===s.wordId?0.5:0);if(cost<best.cost){const {priority,...token}=entry;best={cost,tokens:[token,...tail.tokens]};}}
    paths.set(pos,best);
   }
   for(const token of paths.get(0).tokens){if(token.kind==='unknown'&&tokens.at(-1)?.kind==='unknown')tokens.at(-1).surface+=token.surface;else tokens.push(token);}
  }
  // Function words are explained in context, rather than pretending they have a fixed Chinese translation.
  for(let i=0;i<tokens.length;i++){const t=tokens[i],next=tokens.slice(i+1).find(x=>x.kind!=='punctuation');
   if(t.surface==='何'){t.reading=next&&['です','だ','って','と','曜日'].includes(next.surface)?'なん':'なに';t.wordId='w028';t.lemma='何';t.note=t.reading==='なん'?'这里的何读なん；何的读音要按后面的搭配区分。':'这里的何读なに，表示“什么”。';}
   if(t.surface==='の'){if(!next||next.surface==='か'){t.meaning='句末说明／提问';t.note='这里的の用于解释或询问情况，不是名词之间的“的”。';t.grammarId='g29';}else{t.meaning='的／修饰连接';t.note='连接前后的名词；中文有时不需要译出“的”。';}}
   if(t.surface==='から'){const previous=tokens[i-1];if(previous?.form||previous?.surface==='だ'){t.meaning='因为';t.note='接在句子后说明原因，后面是结果或建议。';}else{t.meaning='从';t.note='表示时间、地点或顺序的起点。';delete t.grammarId;}}
   if(t.surface==='か'&&!next){t.meaning='吗（提问）';t.note='句末疑问助词。';}
   if(t.surface==='って'&&next?.lemma==='言う'){t.meaning='引用标记';t.note='前面的内容是说话或听说的内容，后面接言う等动词。';}
   if(t.surface==='と'&&next?.lemma==='言う'){t.meaning='引用标记';t.note='标记言う等动词引用的内容。';}
  }
  const points=[];
  for(const t of tokens)if(t.note)points.push({label:t.form?`${t.surface} ← ${t.lemma}`:t.surface,explanation:t.note,...(t.grammarId?{grammarId:t.grammarId}:{})});
  const seen=new Set();const uniquePoints=points.filter(p=>{const key=p.label+'|'+p.explanation;if(seen.has(key))return false;seen.add(key);return true;});
  const grammarIds=[...new Set([...s.grammarIds,...tokens.map(t=>t.grammarId).filter(Boolean)])];
  const literal=tokens.filter(t=>t.kind!=='punctuation').map(t=>`${t.surface}：${t.meaning}`).join(' → ');
  const notes=['逐词直译保留日语词序，是理解结构的辅助；助词和礼貌结尾通常不按字面译成中文。自然译文按中文习惯调整语序。',...(tokens.some(t=>t.form)&&!tokens.some(t=>t.surface==='私'||t.surface==='僕'||t.surface==='俺')?['日语常省略语境中明确的主语。中文译文中的“我／你”等需要结合本句或对话理解，不由动词词形决定。']:[])];
  return {id:s.id,text:s.text,translation:s.translation,tokens,literal,points:uniquePoints,grammarIds,notes,...custom,...(custom?.tokens?{tokens}:{})};
 };
}
