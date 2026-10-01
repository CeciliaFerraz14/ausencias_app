import { Download, GraduationCap, KeyRound, Scale, Smartphone, Trash2, Upload } from 'lucide-react'
import { useRef, useState, type ReactNode } from 'react'
import { getAccessCode, setAccessCode } from '../../lib/api'
import { plural, todayISO } from '../../lib/logic'
import { useInstall } from '../../lib/pwa'
import { actions, getState, normalize, replaceState, resetState, useAppState } from '../../lib/store'
import { useUI } from '../../lib/ui'
import { Switch } from '../common'
import { Sheet } from '../Sheet'

export function SettingsSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Sheet open={open} onClose={onClose} title="Ajustes">
      <SettingsBody onClose={onClose} />
    </Sheet>
  )
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section>
      <h3 className="mb-2 px-1 text-xs font-bold tracking-wider text-muted uppercase">{title}</h3>
      <div className="divide-y divide-line overflow-hidden rounded-3xl bg-soft">{children}</div>
    </section>
  )
}

function Row({ icon, children, onClick, danger }: { icon: ReactNode; children: ReactNode; onClick: () => void; danger?: boolean }) {
  return (
    <button type="button" onClick={onClick} className={`flex w-full items-center gap-3 px-4 py-3.5 text-left font-semibold transition hover:bg-card ${danger ? 'text-rose-600 dark:text-rose-400' : ''}`}>
      <span className="grid size-9 place-items-center rounded-xl bg-card ring-1 ring-line">{icon}</span>
      {children}
    </button>
  )
}

function SettingsBody({ onClose }: { onClose: () => void }) {
  const state = useAppState()
  const ui = useUI()
  const install = useInstall()
  const [code, setCode] = useState(getAccessCode)
  const fileRef = useRef<HTMLInputElement>(null)

  function exportData() {
    const blob = new Blob([JSON.stringify({ app: 'ausencias', version: 1, exportedAt: new Date().toISOString(), ...getState() }, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ausencias-${todayISO()}.json`
    document.body.append(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  async function importData(file: File) {
    try {
      const data = normalize(JSON.parse(await file.text()))
      if (!confirm(`Se importarán ${plural(data.subjects.length, 'módulo')} y se reemplazarán tus datos actuales. ¿Continuar?`)) return
      replaceState(data)
      onClose()
      ui.toast('Datos importados')
    } catch {
      alert('El archivo no es una copia de seguridad válida.')
    }
  }

  return (
    <div className="grid gap-6 pt-1 pb-2">
      <Group title="Faltas">
        <div className="flex items-center justify-between gap-4 px-4 py-3.5">
          <div>
            <p className="font-semibold">Las justificadas cuentan</p>
            <p className="text-sm text-muted">Para el 15 % cuentan todas las faltas; desactívalo solo si tu centro no las computa.</p>
          </div>
          <Switch checked={state.settings.justifiedCount} onChange={(v) => actions.setSettings({ justifiedCount: v })} label="Las faltas justificadas cuentan" />
        </div>
        <Row icon={<Scale size={17} />} onClick={() => ui.openSheet({ kind: 'rules' })}>
          Normativa (Decreto 91/2024)
        </Row>
        <Row icon={<GraduationCap size={17} />} onClick={() => ui.openSheet({ kind: 'tutorial' })}>
          Ver el tutorial
        </Row>
      </Group>

      <Group title="Escanear horarios">
        <label className="flex items-center gap-3 px-4 py-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-card ring-1 ring-line">
            <KeyRound size={17} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-sm font-semibold text-muted">Código de clase</span>
            <input
              value={code}
              onChange={(e) => setCode(e.target.value)}
              onBlur={() => setAccessCode(code)}
              placeholder="Te lo pasa quien gestiona la app"
              autoCapitalize="none"
              autoComplete="off"
              spellCheck={false}
              className="w-full bg-transparent py-0.5 font-semibold outline-none placeholder:font-normal placeholder:text-muted/70"
            />
          </span>
        </label>
      </Group>

      {(install.canPrompt || install.iosManual) && (
        <Group title="App">
          <Row
            icon={<Smartphone size={17} />}
            onClick={() => (install.canPrompt ? install.prompt() : ui.openSheet({ kind: 'install-ios' }))}
          >
            Instalar en este dispositivo
          </Row>
        </Group>
      )}

      <Group title="Copia de seguridad">
        <Row icon={<Download size={17} />} onClick={exportData}>
          Exportar datos
        </Row>
        <Row icon={<Upload size={17} />} onClick={() => fileRef.current?.click()}>
          Importar datos
        </Row>
        <Row
          danger
          icon={<Trash2 size={17} />}
          onClick={() => {
            if (!confirm('Se borrarán todos tus módulos y faltas. No se puede deshacer. ¿Continuar?')) return
            resetState()
            onClose()
          }}
        >
          Borrar todos los datos
        </Row>
      </Group>
      <input
        ref={fileRef}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) importData(f)
        }}
      />

      <p className="px-1 text-center text-xs text-muted">Tus datos se guardan solo en este dispositivo. Exporta una copia para pasarlos a otro móvil.</p>
    </div>
  )
}
