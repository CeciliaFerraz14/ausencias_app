import Anthropic from '@anthropic-ai/sdk'
import type { VercelRequest, VercelResponse } from '@vercel/node'

/* =========================================================
   POST /api/horario  { image: <JPEG en base64>, code?: string }
   Lee la foto de un horario con Claude y devuelve las clases
   semanales de cada asignatura. La clave de Anthropic vive solo
   aquí (variable de entorno ANTHROPIC_API_KEY).
   ========================================================= */

const MODEL = 'claude-opus-5-5'
const MAX_IMAGE_BASE64 = 4_000_000 // ~3 MB; Vercel limita el cuerpo a 4,5 MB
const RATE_LIMIT = 8 // lecturas por IP…
const RATE_WINDOW_MS = 60 * 60 * 1000 // …cada hora

const TIMETABLE_PROMPT = `Lees fotos de horarios de Formación Profesional (ciclos de Grado Medio y Superior en España) y extraes las clases semanales de cada módulo.

- Devuelve una entrada por módulo profesional. Si un módulo aparece con desdobles o con teoría y prácticas por separado, júntalo en una sola entrada, salvo que el horario los trate claramente como módulos distintos.
- En los horarios de FP es habitual usar siglas (p. ej. «PRO», «BBDD», «SSII», «LMSGI», «ED», «FOL», «IPE», «EIE»). Si la imagen incluye una leyenda con los nombres completos, usa el nombre completo; si no, deja la sigla tal como aparece.
- Cada bloque continuo de un módulo en un día es una sesión. Si un módulo ocupa varias franjas seguidas (aunque cada franja sea de 50 o 55 minutos), devuélvelo como una sola sesión, desde el inicio de la primera franja hasta el fin de la última. No unas franjas separadas por un recreo.
- weekday: 1 = lunes, 2 = martes, … 7 = domingo. Horas en formato 24 h "HH:MM".
- Ignora recreos, guardias, huecos libres y cualquier cosa que no sea una clase de un módulo. La tutoría solo inclúyela si aparece como una hora lectiva más del horario.
- Si hay varios grupos o desdobles y no puedes saber cuál corresponde al estudiante, inclúyelo todo y explícalo en warnings.
- Si algo no se lee bien, da tu mejor estimación y menciónalo en warnings. Si la imagen no es un horario, devuelve subjects vacío y explícalo en warnings.
- warnings: texto breve en español dirigido al estudiante, o cadena vacía si todo está claro.`

const TIMETABLE_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['subjects', 'warnings'],
  properties: {
    subjects: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['name', 'sessions'],
        properties: {
          name: { type: 'string' },
          sessions: {
            type: 'array',
            items: {
              type: 'object',
              additionalProperties: false,
              required: ['weekday', 'start', 'end'],
              properties: {
                weekday: { type: 'integer', enum: [1, 2, 3, 4, 5, 6, 7] },
                start: { type: 'string', description: 'Hora de inicio, HH:MM (24 h)' },
                end: { type: 'string', description: 'Hora de fin, HH:MM (24 h)' },
              },
            },
          },
        },
      },
    },
    warnings: { type: 'string' },
  },
} as const

type Result = { status: number; body: unknown }

const fail = (status: number, error: string, message: string): Result => ({ status, body: { error, message } })

// Límite por IP en memoria: es aproximado (cada instancia lleva su cuenta),
// pero frena el abuso más obvio. El tope real de gasto se pone en la consola de Anthropic.
const hits = new Map<string, number[]>()
function rateLimited(ip: string) {
  const now = Date.now()
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_WINDOW_MS)
  if (recent.length >= RATE_LIMIT) return true
  recent.push(now)
  hits.set(ip, recent)
  return false
}

export async function handleTimetable(method: string, body: unknown, ip: string): Promise<Result> {
  if (method !== 'POST') return fail(405, 'method', 'Método no permitido.')

  const { image, code } = (body ?? {}) as { image?: unknown; code?: unknown }

  const accessCode = process.env.ACCESS_CODE?.trim()
  if (accessCode && String(code ?? '').trim().toLowerCase() !== accessCode.toLowerCase()) {
    return fail(401, 'access_code', code ? 'El código de clase no es correcto.' : 'Escribe el código de clase para leer horarios.')
  }

  if (typeof image !== 'string' || !/^[A-Za-z0-9+/=]+$/.test(image.slice(0, 200))) {
    return fail(400, 'image', 'No se ha recibido ninguna imagen.')
  }
  if (image.length > MAX_IMAGE_BASE64) return fail(413, 'image', 'La foto es demasiado grande.')

  if (!process.env.ANTHROPIC_API_KEY) {
    return fail(500, 'config', 'El servidor no tiene configurada la clave de Anthropic.')
  }
  if (rateLimited(ip)) return fail(429, 'rate_limit', 'Has leído muchas fotos seguidas. Prueba otra vez dentro de un rato.')

  const client = new Anthropic()

  let response
  try {
    response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
      output_config: {
        effort: 'medium',
        format: { type: 'json_schema', schema: TIMETABLE_SCHEMA },
      },
      system: TIMETABLE_PROMPT,
      messages: [
        {
          role: 'user',
          content: [
            { type: 'image', source: { type: 'base64', media_type: 'image/jpeg', data: image } },
            { type: 'text', text: 'Extrae las asignaturas y sus clases semanales de este horario.' },
          ],
        },
      ],
    } as Anthropic.Beta.MessageCreateParamsNonStreaming)
  } catch (err) {
    console.error('Anthropic API error', err)
    if (err instanceof Anthropic.AuthenticationError || err instanceof Anthropic.PermissionDeniedError) {
      return fail(500, 'config', 'La clave de Anthropic del servidor no es válida.')
    }
    if (err instanceof Anthropic.RateLimitError) {
      return fail(429, 'rate_limit', 'Hay mucha gente leyendo horarios ahora mismo. Prueba en un minuto.')
    }
    if (err instanceof Anthropic.BadRequestError) {
      return fail(502, 'upstream', 'No se ha podido procesar la foto. Prueba con otra imagen.')
    }
    if (err instanceof Anthropic.APIConnectionError) {
      return fail(502, 'upstream', 'No se ha podido contactar con el servicio. Inténtalo de nuevo.')
    }
    if (err instanceof Anthropic.APIError) {
      return fail(502, 'upstream', 'El servicio no está disponible ahora mismo. Inténtalo en un rato.')
    }
    return fail(500, 'unknown', 'Algo ha fallado al leer el horario.')
  }

  if (response.stop_reason === 'refusal') {
    return fail(422, 'refusal', 'No se ha podido procesar esta imagen. Prueba con otra foto.')
  }
  if (response.stop_reason === 'max_tokens') {
    return fail(422, 'too_long', 'El horario es demasiado largo. Prueba con una foto de una parte.')
  }

  const text = response.content.find((b) => b.type === 'text')?.text
  try {
    return { status: 200, body: JSON.parse(text ?? '') }
  } catch {
    return fail(502, 'parse', 'La respuesta no se ha podido interpretar. Vuelve a intentarlo.')
  }
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const forwarded = req.headers['x-forwarded-for']
  const ip = (Array.isArray(forwarded) ? forwarded[0] : forwarded)?.split(',')[0]?.trim() || 'unknown'
  const result = await handleTimetable(req.method ?? 'GET', req.body, ip)
  res.status(result.status).json(result.body)
}
