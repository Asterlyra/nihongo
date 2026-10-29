import { useMemo } from 'react';
import { words, grammars, readings, dialogues, foundationCourses } from '../content';
import { useStudyData, useNow, useHistoryData } from '../hooks';
import { PageHeading } from '../components';
import { requiredReviews } from '../domain/queue';
import { aggregateDays, dailyStats, dayKey, recentDays } from '../domain/statistics';
import { DEFAULT_DAILY_TARGET } from '../domain/daily-goal';
import { studyGroupProgress } from '../domain/study-group';

const wordIds = new Set(words.map(word => word.id));
export default function Home() {
  const data = useStudyData(), history = useHistoryData(), now = useNow();
  const timezone = data?.settings?.timezone ?? 'Asia/Shanghai';
  const days = useMemo(() => aggregateDays(data?.progress ?? [], history?.reviews ?? [], history?.practices ?? [], wordIds, timezone), [data?.progress, history?.reviews, history?.practices, timezone]);
  if (!data || !history) return <p className="loading">正在加载学习概览…</p>;
  const day = dayKey(now, timezone);
  const today = days.get(day) ?? dailyStats(day, [], [], [], wordIds, timezone);
  const target = data.settings?.dailyWordTarget ?? DEFAULT_DAILY_TARGET;
  const enabled = data.cards.filter(card => data.settings?.listeningEnabled !== false || card.skill !== 'listening');
  const due = requiredReviews(enabled, now, timezone);
  const group = studyGroupProgress(data.session?.studyGroup, data.progress, history.reviews, enabled, wordIds);
  const trend = recentDays(now, timezone, 7).map(date => ({ date, count: days.get(date)?.words.length ?? 0 }));
  const maximum = Math.max(1, ...trend.map(item => item.count));
  const readCount = (ids: string[]) => data.progress.filter(item => ids.includes(item.id) && item.readAt !== undefined).length;
  return <div className="overview-page">
    <PageHeading title="学习概览" description={new Intl.DateTimeFormat('zh-CN', { timeZone: timezone, year: 'numeric', month: 'long', day: 'numeric' }).format(now)}/>
    <section className="panel overview-today">
      <h2>今天背过的词</h2>
      <p className="overview-total"><strong>{today.words.length}</strong><span>{target === 0 ? '不限数量' : `/ ${target} 个词`}</span></p>
      {target > 0 && <progress aria-label="今日词汇进度" max={target} value={Math.min(today.words.length, target)}/>}
      <dl className="overview-today-details">
        <div><dt>新学</dt><dd>{today.introduced.length}<small>个词</small></dd></div>
        <div><dt>正式复习</dt><dd>{today.reviewed.length}<small>个词</small></dd></div>
        <div><dt>正式反馈</dt><dd>{today.formal.length}<small>次</small></dd></div>
        <div><dt>主动回顾</dt><dd>{today.recapWords.length}<small>个词</small></dd></div>
      </dl>
      <p className="micro">新学与正式复习按不同单词合计，同词重复回忆不重复计数。</p>
    </section>
    <section className="panel overview-current"><h2>当前学习状态</h2><dl>
      <div><dt>待复习卡片</dt><dd>{due.length}<small>张</small></dd></div>
      <div><dt>当前小组首遍回忆</dt><dd>{group.wordIds.length ? `${group.done.length} / ${group.wordIds.length}` : '尚未开始'}</dd></div>
    </dl></section>
    <section className="panel overview-course-progress"><h2>累计学习情况</h2><dl>
      <div><dt>开始学习的词</dt><dd>{data.progress.filter(item => wordIds.has(item.id) && item.introducedAt !== undefined).length}<small>/ {words.length}</small></dd></div>
      <div><dt>已读语法</dt><dd>{readCount(grammars.map(item => item.id))}<small>/ {grammars.length}</small></dd></div>
      <div><dt>已读短文</dt><dd>{readCount(readings.map(item => item.id))}<small>/ {readings.length}</small></dd></div>
      <div><dt>练习过的对话</dt><dd>{dialogues.filter(item => data.progress.some(progress => progress.id === item.id && progress.practicedAt !== undefined)).length}<small>/ {dialogues.length}</small></dd></div>
      {foundationCourses.map(course => <div key={course.id}><dt>已读{course.title}</dt><dd>{readCount(course.lessons.map(lesson => lesson.id))}<small>/ {course.lessons.length}</small></dd></div>)}
    </dl></section>
    <section className="panel overview-week"><h2>近 7 天背词数量</h2><ol>{trend.map(item => <li key={item.date} aria-label={`${item.date}，${item.count} 个不同单词`}>
      <strong>{item.count}</strong><div className="overview-bar-space" aria-hidden="true"><span style={{ height: `${item.count / maximum * 100}%` }}/></div><time dateTime={item.date}>{item.date.slice(5).replace('-', '/')}</time>
    </li>)}</ol></section>
  </div>;
}
