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
    const payload = JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM }] },
      contents: messages.map(m => ({ role: m.role === "assistant" ? "model" : "user", parts: [{ text: m.content }] })),
      generationConfig: { temperature: 0.3, maxOutputTokens: 1200 }
    });
    const callModel = (model: string) => fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`,
      {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: payload,
        signal: AbortSignal.timeout(25000),
        cache: "no-store"
      }
    );
    // Choose a model actually available to this API key and project.
    // Avoid assuming that a particular Gemini version is enabled.
    const listing = await fetch("https://generativelanguage.googleapis.com/v1beta/models?pageSize=1000", {
      headers: { "x-goog-api-key": key },
      signal: AbortSignal.timeout(12000),
      cache: "no-store"
    });
    if (!listing.ok) {
      if (listing.status === 401 || listing.status === 403) return reply("Gemini ha rechazado la clave API o sus restricciones. Revisa Google AI Studio.", 502);
      return reply(`No se ha podido consultar los modelos de Gemini (HTTP ${listing.status}).`, 502);
    }
    const catalog = await listing.json();
    const available: string[] = (Array.isArray(catalog.models) ? catalog.models : [])
      .filter((m: { name?: string; supportedGenerationMethods?: string[] }) =>
        m.name?.startsWith("models/gemini-") && m.supportedGenerationMethods?.includes("generateContent"))
      .map((m: { name: string }) => m.name.replace("models/", ""));
    const preferred = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-2.0-flash"];
    const candidates = [...new Set([...preferred.filter(m => available.includes(m)),
      ...available.filter(m => m.includes("flash")), ...available])];
    if (!candidates.length) return reply("Esta clave API no tiene modelos Gemini disponibles para generar respuestas.", 502);
    let upstream = await callModel(candidates[0]);
    for (const model of candidates.slice(1, 5)) {
      if (upstream.status !== 404) break;
      upstream = await callModel(model);
    }
    if (upstream.status === 429) return reply("Se ha alcanzado el límite gratuito de Gemini. Inténtalo más tarde.", 429);
    if (upstream.status === 400) return reply("Gemini ha rechazado la solicitud (400). Comprueba el modelo y la configuración del proyecto.", 502);
    if (upstream.status === 401 || upstream.status === 403) return reply("Gemini ha rechazado la autenticación (401/403). Revisa la clave API y sus restricciones.", 502);
    if (upstream.status === 404) return reply("El modelo Gemini configurado no está disponible para este proyecto.", 502);
    if (!upstream.ok) {
      console.error("Gemini API response status:", upstream.status);
      return reply(`Gemini ha devuelto un error HTTP ${upstream.status}. Comprueba los registros de Vercel.`, 502);
    }
    const data = await upstream.json();
    const answer = data?.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text || "").join("").trim();
    if (!answer) return reply("Gemini no ha devuelto una respuesta. Prueba a reformular la pregunta.", 502);
    return NextResponse.json({ answer }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Gemini connection error:", error instanceof Error ? error.name : "unknown");
    return reply(error instanceof Error && error.name === "TimeoutError" ? "Gemini ha tardado demasiado en responder (25 segundos)." : "No se ha podido conectar con Gemini. Revisa los registros de Vercel.", 502);
  }
}
