import { normalizeSchedule } from './store'
import type { Session } from './types'

const CODE_KEY = 'ausencias:code'
const MAX_EDGE = 2000 // px: suficiente para leer un horario y ligero de subir

export type DetectedSubject = { name: string; schedule: Session[] }
export type TimetableResult = { subjects: DetectedSubject[]; warnings: string }

export class ApiError extends Error {
  code: string
  constructor(code: string, message: string) {
    super(message)
    this.code = code
  }
}

export function getAccessCode() {
  try {
    return localStorage.getItem(CODE_KEY) ?? ''
  } catch {
    return ''
  }
}

export function setAccessCode(code: string) {
  try {
    if (code.trim()) localStorage.setItem(CODE_KEY, code.trim())
    else localStorage.removeItem(CODE_KEY)
  } catch {
    /* sin almacenamiento */
  }
}

/** Reduce la foto y la pasa a JPEG en base64. */
export async function prepareImage(file: File) {
  const url = URL.createObjectURL(file)
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const scale = Math.min(1, MAX_EDGE / Math.max(img.naturalWidth, img.naturalHeight))
    const canvas = document.createElement('canvas')
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#fff' // fondo blanco para PNG con transparencia
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
    return { dataUrl, base64: dataUrl.slice(dataUrl.indexOf(',') + 1) }
  } finally {
    URL.revokeObjectURL(url)
  }
}

function padTime(t: unknown) {
  const m = String(t ?? '').trim().match(/^(\d{1,2})[:.h](\d{2})$/)
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : ''
}

export async function readTimetable(imageBase64: string, signal?: AbortSignal): Promise<TimetableResult> {
  let res: Response
  try {
    res = await fetch('/api/horario', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ image: imageBase64, code: getAccessCode() }),
      signal,
    })
  } catch (err) {
    if ((err as Error).name === 'AbortError') throw err
    throw new ApiError('offline', 'No hay conexión. Necesitas internet para leer el horario.')
  }

  const data = await res.json().catch(() => null)
  if (!res.ok) throw new ApiError(data?.error ?? 'unknown', data?.message ?? 'Algo ha fallado al leer el horario.')

  const subjects: DetectedSubject[] = (Array.isArray(data?.subjects) ? data.subjects : [])
    .map((s: any) => ({
      name: String(s?.name ?? '').trim().slice(0, 60),
      schedule: normalizeSchedule(
        (Array.isArray(s?.sessions) ? s.sessions : []).map((x: any) => ({ weekday: x?.weekday, start: padTime(x?.start), end: padTime(x?.end) })),
      ).sort((a, b) => a.weekday - b.weekday || a.start.localeCompare(b.start)),
    }))
    .filter((s: DetectedSubject) => s.name && s.schedule.length)

  return { subjects, warnings: String(data?.warnings ?? '') }
}
