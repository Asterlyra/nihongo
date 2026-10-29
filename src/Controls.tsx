import { Children, isValidElement, useEffect, useId, useLayoutEffect, useMemo, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { CalendarDays, Check, ChevronDown, ChevronLeft, ChevronRight, Minus, Plus } from 'lucide-react';

// Popovers live outside clipped study cards. Measure the available viewport on both sides.
function usePopover(open:boolean, close:()=>void, preferredWidth?:number){
  const trigger=useRef<HTMLButtonElement>(null), panel=useRef<HTMLDivElement>(null);
  const closeRef=useRef(close);closeRef.current=close;
  const [position,setPosition]=useState<CSSProperties>({visibility:'hidden'});
  useLayoutEffect(()=>{
    if(!open)return;
    const place=()=>{const r=trigger.current?.getBoundingClientRect();if(!r)return;
      const below=window.innerHeight-r.bottom-16,above=r.top-16;
      const up=below<240&&above>below;
      const width=Math.min(preferredWidth??Math.max(r.width,220),window.innerWidth-24);
      setPosition({width,left:Math.max(12,Math.min(r.left,window.innerWidth-width-12)),maxHeight:Math.max(80,Math.min(352,up?above:below)),...(up?{bottom:window.innerHeight-r.top+8}:{top:r.bottom+8})});
    };
    const outside=(e:PointerEvent)=>{if(!trigger.current?.contains(e.target as Node)&&!panel.current?.contains(e.target as Node))closeRef.current();};
    const scroll=(e:Event)=>{if(!panel.current?.contains(e.target as Node))place();};
    place();document.addEventListener('pointerdown',outside);window.addEventListener('resize',place);window.addEventListener('scroll',scroll,true);
    return()=>{document.removeEventListener('pointerdown',outside);window.removeEventListener('resize',place);window.removeEventListener('scroll',scroll,true);};
  },[open,preferredWidth]);
  return {trigger,panel,position};
}

type Choice={value:string;label:string;disabled:boolean};
function optionText(node:ReactNode):string{return Children.toArray(node).map(c=>isValidElement<{children?:ReactNode}>(c)?optionText(c.props.children):String(c)).join('');}
function choicesFrom(children:ReactNode):Choice[]{return Children.toArray(children).flatMap(c=>{
  if(!isValidElement<{value?:string|number;children?:ReactNode;disabled?:boolean}>(c))return [];
  if(c.type!=='option')return choicesFrom(c.props.children);
  const label=optionText(c.props.children);return [{value:String(c.props.value??label),label,disabled:!!c.props.disabled}];
});}

export function Select({value,onValueChange,children,disabled=false,'aria-label':label}:{value:string|number;onValueChange:(value:string)=>void;children:ReactNode;disabled?:boolean;'aria-label':string}){
  const choices=useMemo(()=>choicesFrom(children),[children]),id=useId();
  const selected=choices.findIndex(c=>c.value===String(value));
  const [open,setOpen]=useState(false),[active,setActive]=useState(0);
  const {trigger,panel,position}=usePopover(open,()=>setOpen(false));
  const typed=useRef({text:'',time:0});
  useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
  useEffect(()=>{if(open)panel.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({block:'nearest'});},[open,active,panel]);
  const choose=(index:number)=>{const c=choices[index];if(!c||c.disabled)return;setOpen(false);onValueChange(c.value);trigger.current?.focus();};
  const available=choices.map((c,i)=>!c.disabled?i:-1).filter(i=>i>=0);
  const show=()=>{setActive(selected>=0&&!choices[selected].disabled?selected:available[0]??0);setOpen(true);};
  return <div className="select-control" data-open={open}>
    <button ref={trigger} className="select-trigger" type="button" role="combobox" aria-label={label} aria-describedby={`${id}-value`} aria-expanded={open} aria-haspopup="listbox" aria-controls={open?id:undefined} aria-activedescendant={open?`${id}-${active}`:undefined} disabled={disabled}
      onBlur={e=>{if(!panel.current?.contains(e.relatedTarget))setOpen(false);}} onClick={()=>open?setOpen(false):show()}
      onKeyDown={e=>{
        if(['ArrowDown','ArrowUp','Home','End'].includes(e.key)){e.preventDefault();if(!open){show();return;}const n=available.indexOf(active);setActive(e.key==='Home'?available[0]:e.key==='End'?available.at(-1)!:available[(n+(e.key==='ArrowDown'?1:-1)+available.length)%available.length]??0);}
        else if(e.key==='Enter'||e.key===' '){e.preventDefault();if(open)choose(active);else show();}
        else if(e.key==='Escape'){e.preventDefault();setOpen(false);}
        else if(e.key==='Tab')setOpen(false);
        else if(e.key.length===1&&!e.ctrlKey&&!e.metaKey&&!e.altKey){const now=Date.now();typed.current={text:(now-typed.current.time<700?typed.current.text:'')+e.key,time:now};const match=choices.findIndex(c=>!c.disabled&&c.label.toLocaleLowerCase().startsWith(typed.current.text.toLocaleLowerCase()));if(match>=0){setActive(match);setOpen(true);}}
      }}><span id={`${id}-value`}>{choices[selected]?.label??'请选择'}</span><ChevronDown size={16}/></button>
    {open&&createPortal(<div ref={panel} id={id} className="control-popover select-menu" role="listbox" aria-label={label} style={position} onPointerDown={e=>e.preventDefault()}>
      {choices.map((c,i)=><div key={c.value} id={`${id}-${i}`} role="option" aria-selected={i===selected} aria-disabled={c.disabled||undefined} data-index={i} className={`select-option ${active===i?'is-active':''} ${selected===i?'is-selected':''}`} onPointerMove={e=>e.pointerType==='mouse'&&!c.disabled&&setActive(i)} onClick={()=>choose(i)}><span>{c.label}</span>{i===selected&&<Check size={16}/>}</div>)}
    </div>,document.body)}
  </div>;
}

export function NumberField({value,onValueChange,min=0,max=50000,label,disabled=false}:{value:string;onValueChange:(v:string)=>void;min?:number;max?:number;label:string;disabled?:boolean}){
  const number=Number(value);const valid=value.trim()!==''&&Number.isFinite(number);
  const step=(n:number)=>onValueChange(String(Math.max(min,Math.min(max,(valid?number:min)+n))));
  return <span className="number-control"><button type="button" aria-label={`减少${label}`} disabled={disabled||(valid&&number<=min)} onClick={()=>step(-1)}><Minus size={14}/></button><input type="number" aria-label={label} min={min} max={max} step="1" value={value} disabled={disabled} onChange={e=>onValueChange(e.target.value)}/><button type="button" aria-label={`增加${label}`} disabled={disabled||(valid&&number>=max)} onClick={()=>step(1)}><Plus size={14}/></button></span>;
}

function keyOf(date:Date){return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;}
function dateOf(value:string){const [y,m,d]=value.split('-').map(Number);return new Date(y,m-1,d);}
export function DatePicker({value,max,onValueChange,'aria-label':label}:{value:string;max:string;onValueChange:(v:string)=>void;'aria-label':string}){
  const [open,setOpen]=useState(false),[month,setMonth]=useState(()=>dateOf(value)),[focusDay,setFocusDay]=useState(value);const id=useId();
  const {trigger,panel,position}=usePopover(open,()=>setOpen(false),304);
  const close=()=>{setOpen(false);trigger.current?.focus();};
  const choose=(day:string)=>{onValueChange(day);close();};
  useLayoutEffect(()=>{if(open)panel.current?.querySelector<HTMLButtonElement>(`[data-day="${focusDay}"]`)?.focus();},[open,focusDay,month,panel,position]);
  const start=new Date(month.getFullYear(),month.getMonth(),1);start.setDate(1-(start.getDay()+6)%7);
  const count=Math.ceil(((new Date(month.getFullYear(),month.getMonth(),1).getDay()+6)%7+new Date(month.getFullYear(),month.getMonth()+1,0).getDate())/7)*7;
  const days=Array.from({length:count},(_,i)=>{const d=new Date(start);d.setDate(d.getDate()+i);return d;});
  const maxDate=dateOf(max),currentMonth=new Date(maxDate.getFullYear(),maxDate.getMonth(),1);
  const moveMonth=(n:number)=>{const d=new Date(month.getFullYear(),month.getMonth()+n,1);setMonth(d);setFocusDay(keyOf(d));};
  return <span className="date-control"><button ref={trigger} className="select-trigger" type="button" aria-label={label} aria-haspopup="dialog" aria-expanded={open} aria-controls={open?id:undefined} onClick={()=>{if(open)close();else{setMonth(dateOf(value));setFocusDay(value);setOpen(true);}}}><CalendarDays size={16}/><span>{value.replaceAll('-',' / ')}</span><ChevronDown size={15}/></button>
    {open&&createPortal(<div ref={panel} className="control-popover calendar-panel" style={position} id={id} role="dialog" aria-label="选择背词日期" onBlur={e=>{if(!panel.current?.contains(e.relatedTarget)&&!trigger.current?.contains(e.relatedTarget))setOpen(false);}} onKeyDown={e=>{if(e.key==='Escape'){e.preventDefault();close();}}}>
      <div className="calendar-heading"><button type="button" aria-label="上个月" onClick={()=>moveMonth(-1)}><ChevronLeft size={18}/></button><strong aria-live="polite">{month.getFullYear()} 年 {month.getMonth()+1} 月</strong><button type="button" aria-label="下个月" disabled={new Date(month.getFullYear(),month.getMonth(),1)>=currentMonth} onClick={()=>moveMonth(1)}><ChevronRight size={18}/></button></div>
      <div className="calendar-week" aria-hidden="true">{['一','二','三','四','五','六','日'].map(d=><span key={d}>{d}</span>)}</div>
      <div className="calendar-days">{days.map(d=>{const key=keyOf(d);return <button type="button" key={key} data-day={key} aria-label={`${d.getFullYear()}年${d.getMonth()+1}月${d.getDate()}日`} aria-pressed={key===value} disabled={key>max} tabIndex={key===focusDay?0:-1} className={`${d.getMonth()!==month.getMonth()?'other-month':''} ${key===value?'is-selected':''} ${key===max?'is-today':''}`} onClick={()=>choose(key)} onKeyDown={e=>{const offsets:Record<string,number>={ArrowLeft:-1,ArrowRight:1,ArrowUp:-7,ArrowDown:7,Home:-(d.getDay()+6)%7,End:6-(d.getDay()+6)%7};if(e.key in offsets){e.preventDefault();const next=new Date(d);next.setDate(d.getDate()+offsets[e.key]);const key=keyOf(next);if(key>max)return;setFocusDay(key);setMonth(new Date(next.getFullYear(),next.getMonth(),1));}}}>{d.getDate()}</button>;})}</div>
      <button type="button" className="calendar-today" onClick={()=>choose(max)}>回到今天</button>
    </div>,document.body)}
  </span>;
}
