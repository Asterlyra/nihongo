import React, { Component, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './App';
import './styles.css';
import './ui.css';
import './warm-theme.css';
import './controls.css';
import './color-contrast.css';
import './layout.css';
import './material-theme.css';
import './refined-theme.css';
import './n5.css';

class Boundary extends Component<{children:ReactNode},{error:boolean}>{
  state={error:false};static getDerivedStateFromError(){return {error:true};}
  render(){return this.state.error?<main className="fatal"><h1>页面暂时没有打开</h1><p>请刷新重试。本地学习数据不会因刷新而重置。</p><button onClick={()=>location.reload()}>刷新页面</button></main>:this.props.children;}
}
createRoot(document.getElementById('root')!).render(<React.StrictMode><Boundary><BrowserRouter><App/></BrowserRouter></Boundary></React.StrictMode>);
