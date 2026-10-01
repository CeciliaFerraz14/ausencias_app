export type Session = {
  weekday: number // 1 = lunes … 7 = domingo
  start: string // HH:MM
  end: string
}

export type Absence = {
  id: string
  date: string // YYYY-MM-DD
  amount: number // horas lectivas perdidas (1 falta = 1 hora)
  justified: boolean
  note: string
  slot?: string // clase del horario marcada desde «Hoy» (p. ej. "1-09:00")
}

export type Subject = {
  id: string
  name: string
  color: string
  totalHours: number // duración total del módulo en horas
  createdAt: number
  schedule: Session[]
  absences: Absence[]
}

/** Periodo lectivo del curso (o desde la fecha de matrícula). */
export type Semester = { start: string; end: string }

export type AppState = {
  subjects: Subject[]
  settings: {
    justifiedCount: boolean
    semester: Semester | null
  }
}

export type Status = 'ok' | 'warn' | 'danger' | 'over'

export type Stats = {
  allowed: number
  used: number
  justified: number
  remaining: number
  status: Status
}
