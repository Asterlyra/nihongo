import { Link } from 'react-router-dom';
import { Languages, Library, BookOpen, Headphones, ArrowRight, GraduationCap, AudioLines } from 'lucide-react';
import { PageHeading } from '../components';
import { words, grammars, readings, dialogues, foundationCourses,n5Course } from '../content';
import { useStudyData } from '../hooks';

const applications = [
  { to: '/words', title: '单词库', description: '查词、选词、词本和待学清单', count: `${words.length} 个词`, icon: Languages, kind: 'words' },
  { to: '/grammar', title: '语法学习', description: '句型讲解、例句和练习', count: `${grammars.length} 节`, icon: Library, kind: 'grammar' },
  { to: '/reading', title: '例句与阅读', description: '短文、翻译和逐词解释', count: `${readings.length} 篇短文`, icon: BookOpen, kind: 'reading' },
  { to: '/dialogues', title: '对话与听力', description: '旅游交流和通用口语练习', count: `${dialogues.length} 个场景`, icon: Headphones, kind: 'listening' },
];
export default function Courses() {
  const data = useStudyData();
  const foundations = foundationCourses.map(course => ({to: `/courses/${course.id}`, title: course.title, description: course.id === 'beginner' ? '文字、五十音、基本句子和礼貌交流' : '长音、促音、拨音、高低音调与语调', count: `${course.lessons.length} 节 · 已读 ${course.lessons.filter(lesson => data?.progress.some(item => item.id === lesson.id && item.readAt !== undefined)).length} 节`, icon: course.id === 'beginner' ? GraduationCap : AudioLines, kind: course.id}));
  const main=[{to:'/courses/n5',title:'N5 学习计划',description:'按顺序学词汇、汉字、语法、阅读和听力',count:`16 个单元 · 已读 ${n5Course.lessons.filter(l=>data?.progress.some(p=>p.id===l.id&&p.readAt!==undefined)).length} 个`,icon:GraduationCap,kind:'n5'}];
  return <><PageHeading title="课程" description="默认按 N5 学习计划推进，也可自由查阅课程。"/>{[{title:'N5 主线',entries:main},{title: '入门与发音', entries: foundations}, {title: '单独学习与扩展', entries: applications}].map(group => <section className="course-group" key={group.title}><h2>{group.title}</h2><div className="course-hub">{group.entries.map(({ to, title, description, count, icon: Icon, kind }) =>
    <Link className={`course-entry course-${kind}`} to={to} key={to}><span className="course-entry-icon"><Icon size={25}/></span><div><h3>{title}</h3><p>{description}</p><span className="course-entry-count">{count}</span></div><ArrowRight size={20}/></Link>
  )}</div></section>)}</>;
}
