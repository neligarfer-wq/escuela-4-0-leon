"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, MessageCircle, RotateCcw } from "lucide-react";
import resources from "./search-index.json";
import styles from "./AssistantChat.module.css";

type Message = { role: "assistant" | "user"; text: string; links?: {title:string;url:string}[] };
const welcome = "¡Hola! Soy el buscador de Escuela 4.0 León. Puedo encontrar recursos de esta web y ayudarte a buscar también dentro de las páginas enlazadas.";
const suggestions = ["¿Cómo empiezo con micro:bit?", "Actividad para 4.º de Primaria", "Ayuda con Creality K1C"];
const normalize = (s:string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/micro\s*:\s*bit/g,"microbit").replace(/[^a-z0-9]+/g," ").trim();
const stop = new Set(["como","puedo","quiero","para","con","una","uno","unos","unas","los","las","del","que","por","donde","cual","hacer","empezar","ayuda","actividad","actividades","recurso","recursos","material","materiales","escuela","aula","leon","sobre","tengo","necesito","usar","uso","de","en","el","la","y","a","un","mi","es","se","me","al","primero"]);
function linkedSearch(question:string, found:typeof resources) {
  const links = (found.length ? found : resources).flatMap(r=>r.links.map(l=>({...l,resource:r.name})));
  const seen = new Set<string>();
  return links.filter(l=>{try {
    const u=new URL(l.url);
    if(u.protocol!=="https:" || /\\.(pdf|zip|stl|svg)$/i.test(u.pathname))return false;
    const scope=u.hostname+u.pathname.replace(/\\/$/,"");
    if(seen.has(scope))return false;
    seen.add(scope);
    return true;
  }catch{return false;}}).slice(0,4).map(l=>{
    const u=new URL(l.url);
    const scope=u.hostname+u.pathname.replace(/\\/$/,"");
    return {title:"Buscar en "+l.title+" ("+l.resource+")",url:"https://www.google.com/search?q="+encodeURIComponent("site:"+scope+" "+question)};
  });
}
function search(question:string) {
  const q=normalize(question);
  const words=q.split(" ").filter(w=>w.length>2&&!stop.has(w));
  const stage=/infantil|primaria|secundaria|eso/.exec(q)?.[0];
  const results=resources.map(item=>{
    const name=normalize(item.name), body=normalize([item.name,item.stage,item.lot,item.start,item.learns,item.subjects,...item.links.map(l=>l.title)].join(" "));
    let score=0;
    for(const w of words){if(name.includes(w))score+=9;else if(body.includes(w))score+=2;}
    if(stage && normalize(item.stage).includes(stage))score+=3;
    if(q.includes("4 primaria") && item.stage.includes("Primaria"))score+=2;
    return {...item,score};
  }).filter(item=>item.score>0).sort((a,b)=>b.score-a.score).slice(0,3);
  return results;
}
export default function AssistantChat() {
  const [open,setOpen]=useState(false);
  const [draft,setDraft]=useState("");
  const [messages,setMessages]=useState<Message[]>([{role:"assistant",text:welcome}]);
  const bottom=useRef<HTMLDivElement>(null);
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{if(open)input.current?.focus();},[open]);
  useEffect(()=>{if(open)bottom.current?.scrollIntoView({behavior:"smooth",block:"nearest"});},[messages,open]);
  function send(text:string){
    const clean=text.trim().slice(0,1000);
    if(!clean)return;
    const found=search(clean);
    let answer:Message;
    if(!found.length)answer={role:"assistant",text:"No encuentro una coincidencia clara en el índice de esta web. También puedes buscar tu consulta dentro de las páginas externas enlazadas mediante las búsquedas siguientes.",links:linkedSearch(clean,found)};
    else {
      answer={role:"assistant",text:"He encontrado estos recursos en Escuela 4.0 León:\n\n"+found.map((r,i)=>(i+1)+". "+r.name+" ("+r.stage+"): "+(r.start||r.learns)).join("\n\n")+"\n\nAbre los enlaces de abajo para consultar las guías y materiales.",links:found.flatMap(r=>r.links.slice(0,3).map(l=>({title:r.name+" · "+l.title,url:l.url})))};
    }
    setMessages(old=>[...old,{role:"user",text:clean},answer]);
    setDraft("");
  }
  return <div className={styles.root}>
    {open&&<section className={styles.panel} role="dialog" aria-label="Buscador Escuela 4.0" aria-modal="false">
      <header className={styles.header}>
        <span className={styles.avatar}><Bot size={22}/></span>
        <span className={styles.heading}><strong>Asistente Escuela 4.0</strong><small>Recursos propios y búsqueda en páginas enlazadas</small></span>
        <button className={styles.iconButton} type="button" aria-label="Reiniciar conversación" title="Reiniciar conversación" onClick={()=>setMessages([{role:"assistant",text:welcome}])}><RotateCcw size={18}/></button>
        <button className={styles.iconButton} type="button" aria-label="Cerrar asistente" onClick={()=>setOpen(false)}><X size={20}/></button>
      </header>
      <div className={styles.messages} role="log" aria-live="polite" aria-relevant="additions">
        {messages.map((m,i)=><div key={i} className={m.role==="user"?styles.user:styles.assistant}><span style={{whiteSpace:"pre-wrap"}}>{m.text}</span>{m.links&&<div style={{display:"grid",gap:7,marginTop:10}}>{m.links.map((l,j)=><a key={j} href={l.url} target="_blank" rel="noopener noreferrer" style={{textDecoration:"underline",overflowWrap:"anywhere"}}>{l.title} ↗</a>)}</div>}</div>)}
        {messages.length===1&&<div className={styles.suggestions}>{suggestions.map(s=><button key={s} type="button" onClick={()=>send(s)}>{s}</button>)}</div>}
        <div ref={bottom}/>
      </div>
      <form className={styles.form} onSubmit={e=>{e.preventDefault();send(draft);}}>
        <label className={styles.srOnly} htmlFor="escuela40-question">Tu consulta</label>
        <input ref={input} id="escuela40-question" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1000} placeholder="Busca un recurso o actividad..." />
        <button type="submit" disabled={!draft.trim()} aria-label="Buscar recursos"><Send size={19}/></button>
      </form>
      <p className={styles.notice}>La búsqueda en esta web funciona sin servidores ni IA. Para buscar dentro de páginas externas se abre Google, sujeto a la indexación de cada sitio.</p>
    </section>}
    <button className={styles.launcher} type="button" aria-label={open?"Cerrar asistente Escuela 4.0":"Abrir asistente Escuela 4.0"} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={24}/>:<><MessageCircle size={23}/><span>Buscar recursos</span></>}</button>
  </div>;
}
