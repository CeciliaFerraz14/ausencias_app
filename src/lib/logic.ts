import type { AppState, Period, Semester, Session, Stats, Status, Subject } from './types'

/* =========================================================
   Reglas del DECRETO 91/2024 (Aragón), Formación Profesional:
   - Art. 19: se pierde la evaluación continua al llegar al 15 %
     (o el % que fije el centro) de la duración total del módulo.
   - Art. 18: 5 días lectivos seguidos sin asistir, o 10 en un
     periodo de 30, dan lugar al requerimiento y posible anulación
     de matrícula.
   ========================================================= */

export const LIMIT_PERCENT = 15
export const STREAK_LIMIT = 5
export const WINDOW_LIMIT = 10
export const WINDOW_DAYS = 30

export const COLORS = ['#7c3aed', '#2563eb', '#0891b2', '#059669', '#ca8a04', '#ea580c', '#e11d48', '#db2777', '#9333ea', '#475569']

export const WEEKDAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']

export const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
export const HHMM = /^([01]\d|2[0-3]):[0-5]\d$/

export function uid() {
  return crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)
}

/** Umbral del Art. 19: nº de faltas (horas) con el que se pierde la evaluación continua. */
export function lossThreshold(totalHours: number) {
  return Math.max(1, Math.ceil((totalHours * LIMIT_PERCENT) / 100 - 1e-9))
}

/** Faltas que puedes tener sin llegar al umbral. */
export function allowedOf(totalHours: number) {
  return lossThreshold(totalHours) - 1
}

export function stats(s: Subject, justifiedCount: boolean): Stats {
  const allowed = allowedOf(s.totalHours)
  let used = 0
  let justified = 0
  for (const a of s.absences) {
    if (!a.justified || justifiedCount) used += a.amount
    if (a.justified) justified += a.amount
  }
  const remaining = allowed - used
  const ratio = allowed > 0 ? used / allowed : used > 0 ? Infinity : 0
  const status: Status =
    remaining < 0 ? 'over' : remaining === 0 || ratio >= 0.75 ? 'danger' : ratio >= 0.5 ? 'warn' : 'ok'
  return { allowed, used, justified, remaining, status }
}

export const STATUS_META: Record<Status, { label: string; color: string }> = {
  ok: { label: 'Vas bien', color: '#10b981' },
  warn: { label: 'A mitad', color: '#f59e0b' },
  danger: { label: 'Poco margen', color: '#f97316' },
  over: { label: 'Sin evaluación continua', color: '#f43f5e' },
}

export function statusLabel(st: Stats) {
  return st.status === 'danger' && st.remaining === 0 ? 'Al límite' : STATUS_META[st.status].label
}

export function plural(n: number, word: string, pluralWord = word + 's') {
  return `${n} ${n === 1 ? word : pluralWord}`
}

export function remainingText(st: Stats) {
  if (st.remaining > 0) return `Te ${st.remaining === 1 ? 'queda' : 'quedan'} ${st.remaining} de ${plural(st.allowed, 'falta')}`
  if (st.remaining === 0) return 'Una falta más y pierdes la evaluación continua'
  return 'Has perdido la evaluación continua'
}

/* ---------- Fechas ---------- */

export function toISO(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

export function fromISO(iso: string) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export const todayISO = () => toISO(new Date())

/** 1 = lunes … 7 = domingo */
export const weekdayOf = (d: Date) => ((d.getDay() + 6) % 7) + 1

const longDate = new Intl.DateTimeFormat('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })
const monthYear = new Intl.DateTimeFormat('es-ES', { month: 'long', year: 'numeric' })

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)

export const formatLongDate = (d: Date) => cap(longDate.format(d))
export const formatMonth = (iso: string) => cap(monthYear.format(fromISO(iso)))

const shortDate = new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short' })
/** «3 feb» */
export const formatShortDate = (iso: string) => shortDate.format(fromISO(iso)).replace('.', '')

export function formatSession(x: Session) {
  return `${WEEKDAYS[x.weekday - 1]} ${x.start}–${x.end}`
}

export const slotKey = (x: Session) => `${x.weekday}-${x.start}`

const minutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3))

/** Horas lectivas de un bloque (8:00–8:55 = 1 h; 8:00–9:50 = 2 h). */
export function blockHours(x: Session) {
  return Math.max(1, Math.round((minutes(x.end) - minutes(x.start)) / 60))
}

export function weeklyHours(schedule: Session[]) {
  return schedule.reduce((n, x) => n + blockHours(x), 0)
}

/** Vacaciones de Navidad (23 dic – 7 ene), que no son lectivas en ningún curso. */
export function isChristmas(d: Date) {
  const m = d.getMonth()
  const day = d.getDate()
  return (m === 11 && day >= 23) || (m === 0 && day <= 7)
}

/** Periodo de prácticas en el que cae la fecha, si lo hay. */
export function internshipOn(iso: string, sem: Pick<Semester, 'internships'> | null | undefined): Period | undefined {
  return sem?.internships.find((p) => p.start <= iso && iso <= p.end)
}

/** Días sin clase aunque el horario diga lo contrario: Navidad y prácticas. */
export function isNoClassDay(d: Date, sem: Pick<Semester, 'internships'> | null | undefined) {
  return isChristmas(d) || !!internshipOn(toISO(d), sem)
}

/** Horas lectivas estimadas del curso (fechas incluidas) según el horario semanal. */
export function countHours(schedule: Session[], sem: Period & Partial<Pick<Semester, 'internships'>>) {
  const perWeekday = Array<number>(8).fill(0)
  for (const x of schedule) perWeekday[x.weekday] += blockHours(x)
  const breaks = { internships: sem.internships ?? [] }
  const end = fromISO(sem.end)
  let total = 0
  for (const d = fromISO(sem.start); d <= end; d.setDate(d.getDate() + 1)) {
    if (!isNoClassDay(d, breaks)) total += perWeekday[weekdayOf(d)]
  }
  return total
}

export function weeksLeft(endISO: string, from = new Date()) {
  const ms = fromISO(endISO).getTime() - new Date(from.getFullYear(), from.getMonth(), from.getDate()).getTime()
  return Math.max(0, Math.ceil(ms / (7 * 24 * 3600 * 1000)))
}

/** Curso de FP: de septiembre a junio. */
export function defaultCourse(now = new Date()) {
  const y = now.getMonth() >= 7 ? now.getFullYear() : now.getFullYear() - 1
  return { start: `${y}-09-08`, end: `${y + 1}-06-19` }
}

export function normName(name: string) {
  return name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

export function vibrate(ms = 12) {
  try {
    navigator.vibrate?.(ms)
  } catch {
    /* no disponible */
  }
}

/* ---------- Art. 18: días completos sin asistir ---------- */

export type Attendance = {
  streak: number // días lectivos seguidos sin asistir (hasta hoy)
  inWindow: number // días sin asistir en los últimos 30 días lectivos
  level: Status
}

/**
 * Un día lectivo cuenta como «sin asistir» si las horas de falta anotadas ese día
 * cubren todas las horas de clase del horario. Sin horario no se puede calcular.
 */
export function attendance(state: AppState, today = new Date()): Attendance | null {
  const perWeekday = Array<number>(8).fill(0)
  for (const s of state.subjects) for (const x of s.schedule) perWeekday[x.weekday] += blockHours(x)
  if (!perWeekday.some(Boolean)) return null

  const missed = new Map<string, number>()
  for (const s of state.subjects) for (const a of s.absences) missed.set(a.date, (missed.get(a.date) ?? 0) + a.amount)

  const sem = state.settings.semester
  const isLective = (d: Date) => perWeekday[weekdayOf(d)] > 0 && !isNoClassDay(d, sem)
  const fullDay = (d: Date) => (missed.get(toISO(d)) ?? 0) >= perWeekday[weekdayOf(d)]

  const startISO = sem?.start ?? [...missed.keys()].sort()[0] ?? toISO(today)
  const start = fromISO(startISO)

  // Recorre hacia atrás los días lectivos desde hoy. Hoy solo cuenta si ya está anotado
  // como día completo (si no, el día aún no ha terminado y no rompe la racha).
  let streak = 0
  let streakOpen = true
  let inWindow = 0
  let lectiveSeen = 0
  const d = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  for (let guard = 0; guard < 400 && d >= start && lectiveSeen < WINDOW_DAYS; guard++, d.setDate(d.getDate() - 1)) {
    if (!isLective(d)) continue
    const isToday = guard === 0
    const absent = fullDay(d)
    if (isToday && !absent) continue
    lectiveSeen++
    if (absent) inWindow++
    if (streakOpen) {
      if (absent) streak++
      else streakOpen = false
    }
  }

  const level: Status =
    streak >= STREAK_LIMIT || inWindow >= WINDOW_LIMIT ? 'over' : streak >= 3 || inWindow >= 7 ? 'danger' : streak >= 2 || inWindow >= 4 ? 'warn' : 'ok'
  return { streak, inWindow, level }
}
