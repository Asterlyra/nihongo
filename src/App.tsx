import { useEffect, useState } from 'react';
import { Link, Route, Routes, useLocation } from 'react-router-dom';
import { ArrowUpRight, X, Menu } from 'lucide-react';
import { initialize } from './data/db';
import { validTargets } from './content';
import { NoticeContext, Modal } from './components';
import Home from './pages/Home';
import Courses from './pages/Courses';
import { FoundationList, FoundationDetail } from './pages/Foundation';
import Study from './pages/Study';
import Words, { WordDetail } from './pages/Words';
import { GrammarList, GrammarDetail, ReadingList, ReadingDetail } from './pages/Lessons';
import { DialogueList, DialogueDetail } from './pages/Dialogues';
import Kana from './pages/Kana';
import Progress from './pages/Progress';
import Plan from './pages/Plan';
import Settings from './pages/Settings';
import { stopAudio } from './audio';
import NativeLifecycle from './NativeLifecycle';
import N5Plan from './pages/N5';
import { primaryNavigation, moreNavigation, sectionActive } from './navigation';

export default function App() {
  const [notice, setNotice] = useState(''), [ready, setReady] = useState(false), [error, setError] = useState(''), [menuOpen, setMenuOpen] = useState(false);
  const location = useLocation();
  const moreActive = moreNavigation.some(item => sectionActive(item.to, location.pathname));
  useEffect(() => {
    void initialize(validTargets).then(() => setReady(true)).catch(() => setError('无法打开本地学习数据，请检查设备是否允许本地存储，再刷新重试。'));
    const listener = (event: Event) => setNotice((event as CustomEvent<string>).detail);
    window.addEventListener('audio-error', listener);
    return () => window.removeEventListener('audio-error', listener);
  }, []);
  useEffect(() => { stopAudio(); window.scrollTo(0, 0); setMenuOpen(false); }, [location.pathname]);
  useEffect(() => { if (!notice) return; const timer = setTimeout(() => setNotice(''), 6500); return () => clearTimeout(timer); }, [notice]);
  return <NoticeContext.Provider value={setNotice}><NativeLifecycle/><div className={`app-shell ${location.pathname === '/study' ? 'study-layout' : ''}`}>
    <aside className="sidebar"><Link to="/" className="brand"><span className="brand-mark">日</span><strong>日语学习</strong></Link>
      <nav aria-label="主导航">{primaryNavigation.map(({ to, title, icon: Icon }) => <Link to={to} key={to} className={sectionActive(to, location.pathname) ? 'active' : ''} aria-current={sectionActive(to, location.pathname) ? 'page' : undefined}><Icon size={19}/>{title}</Link>)}</nav>
      <div className="sidebar-secondary">{moreNavigation.map(({ to, title, icon: Icon }) => <Link to={to} key={to} className={sectionActive(to, location.pathname) ? 'active' : ''} aria-current={sectionActive(to, location.pathname) ? 'page' : undefined}><Icon size={18}/>{title}</Link>)}</div>
    </aside>
    <div className="main-shell"><main className="main-content">{error ? <div className="empty-state"><h1>学习数据暂时不可用</h1><p>{error}</p><button className="primary" onClick={() => window.location.reload()}>刷新重试</button></div> : !ready ? <p className="loading">正在加载学习数据…</p> : <Routes>
      <Route path="/" element={<Home/>}/><Route path="/courses" element={<Courses/>}/><Route path="/courses/n5" element={<N5Plan/>}/><Route path="/courses/:courseId" element={<FoundationList/>}/><Route path="/courses/:courseId/:id" element={<FoundationDetail key={location.pathname}/>}/><Route path="/study" element={<Study/>}/><Route path="/words" element={<Words/>}/><Route path="/plan" element={<Plan/>}/><Route path="/words/:id" element={<WordDetail key={location.pathname}/>}/><Route path="/grammar" element={<GrammarList/>}/><Route path="/grammar/:id" element={<GrammarDetail key={location.pathname}/>}/><Route path="/reading" element={<ReadingList/>}/><Route path="/reading/:id" element={<ReadingDetail key={location.pathname}/>}/><Route path="/dialogues" element={<DialogueList/>}/><Route path="/dialogues/:id" element={<DialogueDetail key={location.pathname}/>}/><Route path="/kana" element={<Kana/>}/><Route path="/progress" element={<Progress/>}/><Route path="/settings" element={<Settings/>}/><Route path="*" element={<div className="empty-state"><h1>页面不存在</h1><Link to="/">返回概览</Link></div>}/>
    </Routes>}</main></div>
    <nav className="mobile-nav" aria-label="手机导航">{primaryNavigation.map(({ to, shortTitle, icon: Icon }) => <Link key={to} to={to} className={sectionActive(to, location.pathname) ? 'active' : ''} aria-current={sectionActive(to, location.pathname) ? 'page' : undefined}><Icon size={20}/><span>{shortTitle}</span></Link>)}<button className={moreActive ? 'active' : ''} aria-label="更多导航" aria-expanded={menuOpen} onClick={() => setMenuOpen(true)}><Menu size={20}/><span>更多</span></button></nav>
    {menuOpen && <Modal title="更多功能" onClose={() => setMenuOpen(false)}><nav className="all-navigation" aria-label="更多功能导航">{moreNavigation.map(({ to, title, icon: Icon }) => <Link key={to} to={to} className={sectionActive(to, location.pathname) ? 'active' : ''} onClick={() => setMenuOpen(false)}><Icon size={21}/><span>{title}</span><ArrowUpRight size={16}/></Link>)}</nav></Modal>}
    {notice && <div className="toast" role="status"><span>{notice}</span><button aria-label="关闭提示" onClick={() => setNotice('')}><X size={17}/></button></div>}
  </div></NoticeContext.Provider>;
}
