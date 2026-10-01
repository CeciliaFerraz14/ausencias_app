import { useSyncExternalStore } from 'react'
import { COLORS, HHMM, ISO_DATE, uid } from './logic'
import type { Absence, AppState, Semester, Session, Subject } from './types'

const STORAGE_KEY = 'ausencias:v1'

const listeners = new Set<() => void>()

function defaultState(): AppState {
  return { subjects: [], settings: { justifiedCount: true, semester: null } }
}

function load(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? normalize(JSON.parse(raw)) : defaultState()
  } catch {
    return defaultState()
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch {
    /* almacenamiento lleno o bloqueado: los datos siguen en memoria */
  }
}

const int = (v: unknown, min: number, fallback: number) => {
  const n = Number(v)
  return Number.isFinite(n) && n >= min ? Math.floor(n) : fallback
}

export function normalizeSchedule(list: unknown): Session[] {
  if (!Array.isArray(list)) return []
  return list
    .filter((x) => Number.isInteger(x?.weekday) && x.weekday >= 1 && x.weekday <= 7 && HHMM.test(x.start) && HHMM.test(x.end))
    .map((x) => ({ weekday: x.weekday, start: x.start, end: x.end }))
}

function normalizeSemester(sem: any): Semester | null {
  if (!sem || !ISO_DATE.test(sem.start) || !ISO_DATE.test(sem.end)) return null
  return { start: sem.start, end: sem.end }
}

/** Valida datos guardados o importados. Lanza si el formato no es válido. */
export function normalize(data: any): AppState {
  if (!data || !Array.isArray(data.subjects)) throw new Error('Formato no válido')
  return {
    settings: {
      justifiedCount: data.settings?.justifiedCount !== false,
      semester: normalizeSemester(data.settings?.semester),
    },
    subjects: data.subjects.map(
      (s: any): Subject => ({
        id: String(s.id || uid()),
        name: String(s.name || 'Sin nombre').slice(0, 60),
        color: COLORS.includes(s.color) ? s.color : COLORS[0],
        totalHours: int(s.totalHours ?? s.totalSessions, 1, 1),
        createdAt: Number(s.createdAt) || Date.now(),
        schedule: normalizeSchedule(s.schedule),
        absences: (Array.isArray(s.absences) ? s.absences : [])
          .filter((a: any) => ISO_DATE.test(a?.date))
          .map(
            (a: any): Absence => ({
              id: String(a.id || uid()),
              date: a.date,
              amount: int(a.amount, 1, 1),
              justified: !!a.justified,
              note: String(a.note || '').slice(0, 120),
              ...(typeof a.slot === 'string' ? { slot: a.slot } : {}),
            }),
          ),
      }),
    ),
  }
}

// Se carga aquí, después de definir las funciones de validación que usa.
let state: AppState = load()

function emit() {
  for (const l of listeners) l()
}

/** Aplica un cambio sobre una copia del estado, lo guarda y avisa a la interfaz. */
export function update(fn: (draft: AppState) => void) {
  const next = structuredClone(state)
  fn(next)
  state = next
  persist()
  emit()
}

export function replaceState(next: AppState) {
  state = next
  persist()
  emit()
}

export const resetState = () => replaceState(defaultState())

export const getState = () => state

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function useAppState() {
  return useSyncExternalStore(subscribe, getState)
}

// Mantiene sincronizadas varias pestañas abiertas.
window.addEventListener('storage', (e) => {
  if (e.key === STORAGE_KEY) {
    state = load()
    emit()
  }
})

/* ---------- Acciones ---------- */

const findIn = (draft: AppState, id: string) => draft.subjects.find((s) => s.id === id)

export const actions = {
  addSubject(data: Omit<Subject, 'id' | 'createdAt' | 'absences' | 'color'> & { color?: string }) {
    const id = uid()
    update((d) => {
      d.subjects.push({ color: COLORS[d.subjects.length % COLORS.length], ...data, id, createdAt: Date.now(), absences: [] })
    })
    navigator.storage?.persist?.().catch(() => {})
    return id
  },
  updateSubject(id: string, patch: Partial<Subject>) {
    update((d) => {
      const s = findIn(d, id)
      if (s) Object.assign(s, patch)
    })
  },
  deleteSubject(id: string) {
    update((d) => {
      d.subjects = d.subjects.filter((s) => s.id !== id)
    })
  },
  addAbsence(subjectId: string, absence: Omit<Absence, 'id'>) {
    const id = uid()
    update((d) => findIn(d, subjectId)?.absences.push({ ...absence, id }))
    return id
  },
  updateAbsence(subjectId: string, absenceId: string, patch: Partial<Absence>) {
    update((d) => {
      const a = findIn(d, subjectId)?.absences.find((x) => x.id === absenceId)
      if (a) Object.assign(a, patch)
    })
  },
  removeAbsence(subjectId: string, absenceId: string) {
    update((d) => {
      const s = findIn(d, subjectId)
      if (s) s.absences = s.absences.filter((a) => a.id !== absenceId)
    })
  },
  restoreAbsence(subjectId: string, absence: Absence) {
    update((d) => findIn(d, subjectId)?.absences.push(absence))
  },
  setSettings(patch: Partial<AppState['settings']>) {
    update((d) => Object.assign(d.settings, patch))
  },
}
