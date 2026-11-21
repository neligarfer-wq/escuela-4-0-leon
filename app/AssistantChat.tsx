"use client";

import { useEffect, useRef, useState } from "react";
import { Bot, Send, X, MessageCircle, RotateCcw } from "lucide-react";
import styles from "./AssistantChat.module.css";

type Message = { role: "assistant" | "user"; text: string };
const welcome = "¡Hola! Soy el asistente de Escuela 4.0 León. ¿En qué puedo ayudarte con robótica, pensamiento computacional, impresión 3D o actividades de aula?";
const suggestions = ["¿Cómo empiezo con micro:bit?", "Actividad para 4.º de Primaria", "Ayuda con Creality K1C"];
export default function AssistantChat() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{role:"assistant",text:welcome}]);
  const bottom = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => { if (open) input.current?.focus(); }, [open]);
  useEffect(() => { if (open) bottom.current?.scrollIntoView({behavior:"smooth",block:"nearest"}); }, [messages,open]);
  async function send(text: string) {
    const clean = text.trim().slice(0,1000);
    if (!clean || loading) return;
    const updated: Message[] = [...messages, {role:"user",text:clean}];
    setMessages(updated);
    setDraft("");
    setLoading(true);
    try {
      const history = updated.filter((m,i)=>i>0).slice(-12).map(m=>({role:m.role,content:m.text.slice(0,1000)}));
      const response = await fetch("/api/chat",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({messages:history})});
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "No se pudo responder.");
      setMessages(old=>[...old,{role:"assistant",text:data.answer}]);
    } catch (err) {
      setMessages(old=>[...old,{role:"assistant",text:err instanceof Error?err.message:"No se pudo responder."}]);
    } finally {setLoading(false);}
  }
  return <div className={styles.root}>
    {open && <section className={styles.panel} role="dialog" aria-label="Asistente Escuela 4.0" aria-modal="false">
      <header className={styles.header}>
        <span className={styles.avatar}><Bot size={22}/></span>
        <span className={styles.heading}><strong>Asistente Escuela 4.0</strong><small>Pruebas · IA conectada</small></span>
        <button className={styles.iconButton} type="button" aria-label="Reiniciar conversación" title="Reiniciar conversación" onClick={()=>{if(!loading)setMessages([{role:"assistant",text:welcome}]);}}><RotateCcw size={18}/></button>
        <button className={styles.iconButton} type="button" aria-label="Cerrar asistente" onClick={()=>setOpen(false)}><X size={20}/></button>
      </header>
      <div className={styles.messages} role="log" aria-live="polite" aria-relevant="additions">
        {messages.map((m,i)=><p key={i} className={m.role==="user"?styles.user:styles.assistant}>{m.text}</p>)}
        {loading && <p className={styles.assistant}>Escribiendo respuesta…</p>}
        {messages.length===1 && <div className={styles.suggestions}>{suggestions.map(s=><button key={s} type="button" onClick={()=>send(s)}>{s}</button>)}</div>}
        <div ref={bottom}/>
      </div>
      <form className={styles.form} onSubmit={e=>{e.preventDefault();send(draft);}}>
        <label className={styles.srOnly} htmlFor="escuela40-question">Tu consulta</label>
        <input ref={input} id="escuela40-question" value={draft} onChange={e=>setDraft(e.target.value)} maxLength={1000} placeholder="Escribe tu consulta..." />
        <button type="submit" disabled={!draft.trim() || loading} aria-label="Enviar consulta"><Send size={19}/></button>
      </form>
      <p className={styles.notice}>Versión de pruebas. No introduzcas datos personales del alumnado. La IA puede equivocarse.</p>
    </section>}
    <button className={styles.launcher} type="button" aria-label={open?"Cerrar asistente Escuela 4.0":"Abrir asistente Escuela 4.0"} aria-expanded={open} onClick={()=>setOpen(!open)}>{open?<X size={24}/>:<><MessageCircle size={23}/><span>Asistente IA</span></>}</button>
  </div>;
}
