import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
type ChatMessage = { role: "user" | "assistant"; content: string };
const SYSTEM = `Eres el asistente educativo de Escuela 4.0 León. Responde en español de España, con claridad, rigor y pasos prácticos. Ayuda al profesorado de Infantil, Primaria y Secundaria con pensamiento computacional, micro:bit y MakeCode, robótica, SAM Labs, LEGO SPIKE, impresión 3D Creality K1C y cortadora xTool. Ajusta las actividades a edad y materiales disponibles. Si faltan datos técnicos, pregunta. No inventes manuales, enlaces, plazos, especificaciones ni afirmes haber consultado la web. Para cortadoras láser e impresoras 3D, prioriza seguridad, supervisión adulta y recomendaciones del fabricante. No solicites datos personales del alumnado. No afirmes representar oficialmente a la administración educativa.`;
const reply = (error: string, status: number) => NextResponse.json({ error }, { status, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) return reply("Falta configurar GEMINI_API_KEY en Vercel.", 503);
  let body: unknown;
  try { body = await request.json(); } catch { return reply("Solicitud no válida.", 400); }
  if (!body || typeof body !== "object" || !("messages" in body) || !Array.isArray(body.messages)) return reply("Conversación no válida.", 400);
  const raw = body.messages as unknown[];
  if (raw.length === 0 || raw.length > 12 || !raw.every(m => !!m && typeof m === "object" && "role" in m && "content" in m && (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.length <= 1000)) return reply("Consulta demasiado larga o no válida.", 400);
  const messages = raw as ChatMessage[];
  if (messages[messages.length - 1].role !== "user") return reply("Falta la pregunta.", 400);
  try {
    const upstream = await fetch("https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent", {
      method: "POST",
      headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: { parts: [{ text: SYSTEM }] },
        contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
        generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
      }),
      signal: AbortSignal.timeout(25000),
      cache: "no-store"
    });
    if (upstream.status === 429) return reply("Se ha alcanzado el límite gratuito de Gemini. Inténtalo más tarde.", 429);
    if (upstream.status === 400 || upstream.status === 403) return reply("Gemini ha rechazado la solicitud. Comprueba la clave API y los permisos del proyecto.", 502);
    if (upstream.status === 404) return reply("El modelo Gemini configurado no está disponible para este proyecto.", 502);
    if (!upstream.ok) return reply("Gemini no está disponible en este momento.", 502);
    const data = await upstream.json();
    const answer = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();
    if (!answer) return reply("Gemini no ha devuelto una respuesta. Prueba a reformular la pregunta.", 502);
    return NextResponse.json({ answer }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    return reply("No se ha podido conectar con Gemini. Inténtalo de nuevo.", 502);
  }
}
