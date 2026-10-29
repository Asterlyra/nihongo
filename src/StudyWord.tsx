import { AudioButton, SentenceReading } from './components';
import { wordExamples } from './content';
import type { Skill, Word } from './types';
import { hasKanji } from './domain/reading-display';

const examples = new Map(wordExamples.map(example => [example.wordId, example]));

/** Keep every region in place; concealed answers are invisible, inert and out of the accessibility tree. */
export default function StudyWord({word, skill, answered, onHint, onSkip}: {word: Word; skill?: Skill; answered: boolean; onHint: () => Promise<unknown>; onSkip: () => void}) {
  const listening = skill === 'listening', reading = skill === 'reading';
  const example = examples.get(word.id);
  const wordHidden = listening && !answered;
  const readingHidden = !answered;
  return <div className="study-content study-reference" data-testid="study-word-layout">
    <div className="reference-summary">
      <div className="reference-title-row">
        <h2 className="study-word" data-concealed={wordHidden} aria-hidden={wordHidden || undefined} lang="ja" style={{'--word-length': String(word.writing.length)} as React.CSSProperties}>{word.writing}</h2>
        {listening && !answered && <div className="reference-listening-cue"><span>听音回忆</span><button className="text-btn" onClick={onSkip}>跳过</button></div>}
      </div>
      <div className="study-reading-line reference-reading-line">
        <AudioButton id={word.id} compact label={reading && !answered ? '听读音提示（本次记为忘记）' : '播放单词发音'} before={reading && !answered ? onHint : undefined}/>
        {hasKanji(word.writing) && <p className="study-pronunciation" data-concealed={readingHidden} aria-hidden={readingHidden || undefined} lang="ja">{word.reading}</p>}
      </div>
      <div className="reference-definition" data-concealed={!answered} aria-hidden={!answered || undefined} inert={!answered}>
        <span className="study-pos" lang="ja">{word.pos}</span><h3 className="study-meaning" lang="zh-CN">{word.meaning}</h3>
      </div>
    </div>
    {example && <div className="reference-example-slot">
      <section className="study-example" data-concealed={!answered} aria-hidden={!answered || undefined} inert={!answered}>
        <header><span>例句</span><AudioButton id={example.id} compact label="播放例句"/></header>
        <p className="study-example-japanese"><SentenceReading sentence={example}/></p>
        <p className="study-example-translation" lang="zh-CN">{example.translation}</p>
      </section>
    </div>}
  </div>;
}
