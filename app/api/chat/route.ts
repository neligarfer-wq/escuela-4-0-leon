import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
type ChatMessage = { role: "user" | "assistant"; content: string };
const SYSTEM = `Eres el asistente educativo de Escuela 4.0 León. Responde en español de España, con claridad, rigor y pasos prácticos. Ayuda al profesorado de Infantil, Primaria y Secundaria con pensamiento computacional, micro:bit y MakeCode, robótica, SAM Labs, LEGO SPIKE, impresión 3D Creality K1C y cortadora xTool. Ajusta las actividades a edad y materiales disponibles. Si faltan datos técnicos, pregunta. No inventes manuales, enlaces, plazos, especificaciones ni afirmes haber consultado la web. Para cortadoras láser e impresoras 3D, prioriza seguridad, supervisión adulta y recomendaciones del fabricante. No solicites datos personales del alumnado. No afirmes representar oficialmente a la administración educativa.`;
export async function POST(request: NextRequest) {
  const key = process.env.GROQ_API_KEY;
  if (!key) return NextResponse.json({ error: "El servicio de IA aún no está configurado." }, { status: 503 });
  let body: unknown;
  try { body = await request.json(); } catch { return NextResponse.json({error:"Solicitud no válida."},{status:400}); }
  if (!body || typeof body !== "object" || !("messages" in body) || !Array.isArray(body.messages)) return NextResponse.json({error:"Conversación no válida."},{status:400});
  const raw = body.messages as unknown[];
  if (raw.length === 0 || raw.length > 12 || !raw.every(m => !!m && typeof m === "object" && "role" in m && "content" in m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length <= 1000)) return NextResponse.json({error:"Consulta demasiado larga o no válida."},{status:400});
  const messages = raw as ChatMessage[];
  if (messages[messages.length-1].role !== "user") return NextResponse.json({error:"Falta la pregunta."},{status:400});
  try {
    const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST", headers:{"Authorization":`Bearer ${key}`,"Content-Type":"application/json"},
      body:JSON.stringify({model:"llama-3.1-8b-instant",messages:[{role:"system",content:SYSTEM},...messages],temperature:0.3,max_completion_tokens:650}),
      signal:AbortSignal.timeout(20000),cache:"no-store"
    });
    if (upstream.status === 429) return NextResponse.json({error:"Se ha alcanzado temporalmente el límite gratuito. Inténtalo más tarde."},{status:429});
    if (!upstream.ok) return NextResponse.json({error:"El servicio de IA no está disponible en este momento."},{status:502});
    const data = await upstream.json();
    const answer = data?.choices?.[0]?.message?.content;
    if (typeof answer !== "string" || !answer.trim()) throw new Error("Respuesta vacía");
    return NextResponse.json({answer},{headers:{"Cache-Control":"no-store"}});
  } catch { return NextResponse.json({error:"No se ha podido obtener respuesta. Inténtalo de nuevo."},{status:502}); }
}
