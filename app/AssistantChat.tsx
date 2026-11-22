"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, MessageCircle, RotateCcw } from "lucide-react";
import resources from "./search-index.json";
import kit1 from "./kit-index-01.json";
import kit2 from "./kit-index-11.json";
import kit3 from "./kit-index-21.json";
import kit4 from "./kit-index-31.json";
import kit5 from "./kit-index-41.json";
import kit6 from "./kit-index-51.json";
import kit7 from "./kit-index-61.json";
import kit8 from "./kit-index-71.json";
import kit9 from "./kit-index-81.json";
import styles from "./AssistantChat.module.css";

type Message = { role: "assistant" | "user"; text: string; links?: {title:string;url:string}[] };
const welcome = "¡Hola! Pregúntame por cualquier actividad, material o contenido educativo. Buscaré automáticamente en los recursos de Escuela 4.0 León y en los documentos incorporados, sin que tengas que indicar dónde buscar.";
const kitPages = [...kit1,...kit2,...kit3,...kit4,...kit5,...kit6,...kit7,...kit8,...kit9];
const kitUrl = "https://neligarfer-wq.github.io/escuela-4-0-leon/kit-bienvenida-codigo-escuela-4-0-intef.pdf";
const suggestions = ["Algoritmos en Matemáticas de Primaria", "Actividades desconectadas", "Sensores y robótica educativa"];
const normalize = (s:string) => s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/micro\s*:\s*bit/g,"microbit").replace(/[^a-z0-9]+/g," ").trim();
const stop = new Set(["como","puedo","quiero","para","con","una","uno","unos","unas","los","las","del","que","por","donde","cual","hacer","empezar","ayuda","actividad","actividades","recurso","recursos","material","materiales","escuela","aula","leon","sobre","tengo","necesito","usar","uso","de","en","el","la","y","a","un","mi","es","se","me","al","primero"]);
function searchKit(question:string) {
  const q=normalize(question);
  const words=q.split(" ").filter(w=>w.length>3&&!stop.has(w));
  if(!words.length)return [];
  return kitPages.map(p=>{
    const text=normalize(p.text);
    const matches=words.filter(w=>text.includes(w));
    const score=matches.length*5 + (matches.length===words.length?10:0) + (text.includes(q)?12:0);
    const first=matches.length?text.indexOf(matches[0]):-1;
    const excerpt=first>=0?p.text.slice(Math.max(0,first-100),Math.min(p.text.length,first+250)).trim():"";
    return {page:p.page,score,excerpt};
  }).filter(p=>p.score>=5).sort((a,b)=>b.score-a.score).slice(0,3);
}
function linkedSearch(question:string, found:typeof resources) {
  const direct = [
    {title:"Buscar en fichas oficiales Escuela 4.0 (Educacyl)",url:"https://www.google.com/search?q="+encodeURIComponent("site:educa.jcyl.es/profesorado/es/fichasescuela40 "+question)},
    {title:"Buscar fichas y recursos destacados de Escuela 4.0 (Educacyl)",url:"https://www.google.com/search?q="+encodeURIComponent("site:educa.jcyl.es \"Escuela 4.0\" \"recursos destacados\" "+question)},
    {title:"Buscar actividades y fichas Escuela 4.0 en Educacyl",url:"https://www.google.com/search?q="+encodeURIComponent("site:educa.jcyl.es \"Escuela 4.0\" "+question)}
  ];
  const links = (found.length ? found : resources).flatMap(r=>r.links.map(l=>({...l,resource:r.name})));
  const seen = new Set<string>();
  const external = links.filter(l=>{try {
    const u=new URL(l.url);
    if(u.protocol!=="https:" || /\\.(pdf|zip|stl|svg)$/i.test(u.pathname))return false;
    const scope=u.hostname+u.pathname.replace(/\\/$/,"");
    if(seen.has(scope) || u.hostname==="www.educa.jcyl.es")return false;
    seen.add(scope);
    return true;
  }catch{return false;}}).slice(0,3).map(l=>{
    const u=new URL(l.url);
    return {title:"Buscar en "+l.title+" ("+l.resource+")",url:"https://www.google.com/search?q="+encodeURIComponent("site:"+u.hostname+u.pathname.replace(/\\/$/,"")+" "+question)};
  });
  return [...direct,...external];
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
    const kitFound=searchKit(clean);
    const kitLinks=kitFound.map(p=>({title:"Kit INTEF · Página "+p.page,url:kitUrl+"#page="+p.page}));
    const kitSummary=kitFound.length?"\n\nTambién he encontrado información en documentos de la web:\n"+kitFound.map(p=>"• Kit de bienvenida INTEF, página "+p.page+": …"+p.excerpt+"…").join("\n\n"):"";
    let answer:Message;
    if(!found.length)answer={role:"assistant",text:(kitFound.length?"He encontrado información en el documento del INTEF.":"No encuentro una coincidencia clara en el índice de esta web.")+kitSummary+"\\n\\nPuedes consultar también las fichas oficiales y recursos destacados.",links:[...kitLinks,...linkedSearch(clean,found)]};
    else {
      answer={role:"assistant",text:"He encontrado estos recursos en Escuela 4.0 León:\n\n"+found.map((r,i)=>(i+1)+". "+r.name+" ("+r.stage+"): "+(r.start||r.learns)).join("\n\n")+kitSummary+"\n\nAbre las guías o busca también en las fichas oficiales y los recursos destacados de Educacyl.",links:[...kitLinks,...found.flatMap(r=>r.links.slice(0,3).map(l=>({title:r.name+" · "+l.title,url:l.url}))),...linkedSearch(clean,found)]};
    }
    setMessages(old=>[...old,{role:"user",text:clean},answer]);
    setDraft("");
  }
  return <div className={styles.root}>
    {open&&<section className={styles.panel} role="dialog" aria-label="Buscador Escuela 4.0" aria-modal="false">
      <header className={styles.header}>
        <span className={styles.avatar}><Bot size={22}/></span>
        <span className={styles.heading}><strong>Asistente Escuela 4.0</strong><small>Busca en recursos y documentos automáticamente</small></span>
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
      <p className={styles.notice}>Busca automáticamente en los recursos y en el texto del Kit INTEF, con enlaces a las páginas encontradas, sin servidores ni IA. Para consultar el contenido de fichas y páginas externas se abre una búsqueda en Google; los resultados dependen de lo que tenga indexado.</p>
    </section>}
    <button className={styles.launcher} type="button" aria-label={open?"Cerrar asistente Escuela 4.0":"Abrir asistente Escuela 4.0"} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={24}/>:<><MessageCircle size={23}/><span>Buscar recursos</span></>}</button>
  </div>;
}
