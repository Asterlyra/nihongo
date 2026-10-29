import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { foundationCourses,n5Course } from '../content';
import { N5Resources,N5Listening } from './N5';
import { AudioButton, Chip, Empty, PageHeading, useAction } from '../components';
import { useStudyData } from '../hooks';
import { recordExercise, recordRead } from '../data/store';
import type { FoundationExample } from '../types';

function PitchDiagram({ pitch }: {pitch: NonNullable<FoundationExample['pitch']>}) {
  const width = pitch.moras.length * 64;
  const height = (level: string) => level === 'H' ? 22 : 62;
  const points = pitch.levels.flatMap((level, index) => [[index * 64 + 8, height(level)], [(index + 1) * 64 - 8, height(level)]]).map(point => point.join(',')).join(' ');
  const label = pitch.moras.map((mora, i) => `${mora}：${pitch.levels[i] === 'H' ? '高' : '低'}${i >= (pitch.particleFrom ?? Infinity) ? '，助词' : ''}`).join('；');
  return <div className="pitch-diagram"><svg viewBox={`0 0 ${width} 112`} role="img" aria-label={label}>
    <polyline points={points} fill="none" stroke="currentColor" strokeWidth="3" strokeLinejoin="round"/>
    {pitch.moras.map((mora, i) => <g key={i}><circle cx={i * 64 + 32} cy={height(pitch.levels[i])} r="4" fill="currentColor"/><text x={i * 64 + 32} y="90" textAnchor="middle" lang="ja">{mora}</text><text x={i * 64 + 32} y="109" textAnchor="middle" className="pitch-label">{i >= (pitch.particleFrom ?? Infinity) ? '助词 · ' : ''}{pitch.levels[i] === 'H' ? '高' : '低'}</text></g>)}
  </svg><span className="micro">高低示意</span></div>;
}

export function FoundationList() {
  const {courseId} = useParams();
  const course = foundationCourses.find(item => item.id === courseId);
  const data = useStudyData();
  if (!course) return <Empty title="这组课程暂时不存在"><Link to="/courses">返回课程</Link></Empty>;
  const count = course.lessons.filter(lesson => data?.progress.some(item => item.id === lesson.id && item.readAt !== undefined)).length;
  return <div className={`foundation-page foundation-${course.id}`}><Link className="back-link" to="/courses"><ArrowLeft size={16}/>返回课程</Link>
    <PageHeading title={course.title} description={course.intent}/>
    <p className="foundation-summary">已读 {count} / {course.lessons.length} 节。可以按顺序学，也可以直接选择需要的章节。</p>
    <div className="lesson-list">{course.lessons.map((lesson, i) => {
      const progress = data?.progress.find(item => item.id === lesson.id);
      return <Link className="lesson-item" key={lesson.id} to={`/courses/${course.id}/${lesson.id}`}><span className="lesson-number">{String(i + 1).padStart(2, '0')}</span><div><h2>{lesson.title}</h2><p>{lesson.intent}</p><div className="chips">{progress?.readAt !== undefined && <Chip done>已阅读</Chip>}{progress?.practicedAt !== undefined && <Chip done>已练习</Chip>}</div></div><ArrowRight size={20}/></Link>;
    })}</div>
  </div>;
}

export function FoundationDetail() {
  const {courseId, id} = useParams();
  const course = courseId==='n5'?n5Course:foundationCourses.find(item => item.id === courseId);
  const n5Lesson=courseId==='n5'?n5Course.lessons.find(item=>item.id===id):undefined;
  const lesson = course?.lessons.find(item => item.id === id);
  const data = useStudyData();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const {run, busy} = useAction();
  if (!course || !lesson) return <Empty title="这一节暂时不存在"><Link to="/courses">返回课程</Link></Empty>;
  const index = course.lessons.indexOf(lesson), next = course.lessons[index + 1];
  const progress = data?.progress.find(item => item.id === lesson.id);
  return <article className={`foundation-page foundation-${course.id}`}><Link className="back-link" to={`/courses/${course.id}`}><ArrowLeft size={16}/>返回{course.title}</Link>
    <PageHeading eyebrow={`${course.title} · 第 ${index + 1} / ${course.lessons.length} ${n5Lesson?'单元':'节'}`} title={lesson.title} description={lesson.intent}/>
    {n5Lesson&&<N5Resources lesson={n5Lesson}/>}
    {lesson.sections.map(section => <section className="panel" key={section.title}><h2>{section.title}</h2>{section.paragraphs.map(text => <p key={text}>{text}</p>)}</section>)}
    <section className="panel"><h2>例子与跟读</h2>{lesson.examples.map((example, i) => <div className="foundation-example" key={i}><div className="foundation-example-heading"><div><strong lang="ja">{example.text}</strong><p lang="ja" className="foundation-reading">{example.reading}</p></div>{example.audioId && <AudioButton id={example.audioId} compact label={`播放${example.text}`}/>}</div><p>{example.translation}</p>{example.beats && <div className="mora-row" aria-label={`${example.beats.length} 拍：${example.beats.join('、')}`}>{example.beats.map((beat, n) => <span key={n}><b lang="ja">{beat}</b><small>{n + 1}</small></span>)}</div>}{example.pitch && <PitchDiagram pitch={example.pitch}/>}<p className="micro">{example.note || (!example.audioId ? '文字示例' : '')}</p></div>)}
      {lesson.examples.some(example => example.audioId) && <p className="micro foundation-audio-note">音频为本地合成语音，辅助听读；词音调以讲解和参考资料为准。</p>}
    </section>
    <section className="panel"><h2>怎么练</h2><ol>{lesson.practice.map(text => <li key={text}>{text}</li>)}</ol><div className="callout"><div><strong>容易混淆的地方</strong>{lesson.pitfalls.map(text => <p key={text}>{text}</p>)}</div></div></section>
    {n5Lesson&&<N5Listening lesson={n5Lesson}/>}
    {n5Lesson?.checklist&&<section className="panel n5-checkpoint"><h2>本阶段怎么检查</h2><ul>{n5Lesson.checklist.map(text=><li key={text}>{text}</li>)}</ul><p className="micro">下方阶段自测为原创文字理解题，输出和听读请自行再试，不自动标为掌握。</p></section>}
    <section className="panel foundation-questions"><h2>{n5Lesson?'文字自测':'小练习'}</h2><p className="micro">记录每题最近一次结果，不代表已掌握发音或听力。</p>{lesson.questions.map((question, i) => {
      const previous = progress?.results?.[String(i)];
      return <div className="reading-question" key={i}>{n5Lesson?.checkpointFrom===i&&<h2>第 {n5Lesson.phase} 阶段自测</h2>}<h3>{i + 1}. {question.prompt}</h3><div className="option-row">{question.options.map((option, choice) => <button className={`secondary ${answers[i] === choice ? 'chosen' : ''}`} aria-pressed={answers[i] === choice} disabled={busy} key={choice} onClick={() => run(async () => { await recordExercise(lesson.id, choice === question.answer, String(i)); setAnswers(current => ({...current, [i]: choice})); })}>{option}</button>)}</div>{i in answers ? <div className={`exercise-result ${answers[i] === question.answer ? 'correct' : ''}`} role="status"><strong>{answers[i] === question.answer ? '回答正确' : '再看一下讲解'}</strong><p>{question.explanation}</p></div> : previous !== undefined && <p className="micro">上次结果：{previous ? '答对' : '答错，可再练一次'}</p>}</div>;
    })}<div className="foundation-lesson-actions"><button className="primary" disabled={busy || progress?.readAt !== undefined} onClick={() => run(() => recordRead(lesson.id), '已保存阅读记录。')}><Check size={17}/>{progress?.readAt !== undefined ? '已阅读这一节' : '我已读过这一节'}</button>{next && <Link className="arrow-link" to={`/courses/${course.id}/${next.id}`}>{n5Lesson?'下一单元':'下一节'}：{next.title}<ArrowRight size={17}/></Link>}</div></section>
    {lesson.sources.length > 0 && <details className="foundation-sources"><summary>参考资料（联网打开）</summary><ul>{lesson.sources.map(source => <li key={source.url}><a href={source.url} target="_blank" rel="noreferrer">{source.title}</a></li>)}</ul></details>}
  </article>;
}
