import { useCallback, useEffect, useRef, useState } from 'react'
import type { Report } from './analysis/report'
import type { WorkerMessage, WorkerRequest } from './analysis/worker'
import { Overview } from './ui/tabs/Overview'
import { Production } from './ui/tabs/Production'
import { Items } from './ui/tabs/Items'
import { Power } from './ui/tabs/Power'
import { Storage } from './ui/tabs/Storage'
import { Buildings } from './ui/tabs/Buildings'

// Loaded on startup until you open another save. Gitignored; drop any .sav into public/saves/.
const DEFAULT_SAVE_URL = '/saves/foo.sav'

const TABS = {
  overview: 'Overview',
  production: 'Production lines',
  items: 'Items',
  power: 'Power',
  storage: 'Storage',
  buildings: 'Buildings',
} as const
export type Tab = keyof typeof TABS

const tabFromHash = (): Tab => {
  const h = location.hash.slice(1)
  return h in TABS ? (h as Tab) : 'overview'
}

type State =
  | { status: 'loading'; message: string; progress: number }
  | { status: 'error'; message: string }
  | { status: 'ready'; report: Report }

export default function App() {
  const [state, setState] = useState<State>({ status: 'loading', message: 'Starting', progress: 0 })
  const [tab, setTab] = useState<Tab>(tabFromHash)
  const [dragging, setDragging] = useState(false)
  const workerRef = useRef<Worker | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)

  const analyze = useCallback((request: WorkerRequest, transfer: Transferable[] = []) => {
    workerRef.current?.terminate()
    const worker = new Worker(new URL('./analysis/worker.ts', import.meta.url), { type: 'module' })
    workerRef.current = worker
    worker.onmessage = (e: MessageEvent<WorkerMessage>) => {
      const msg = e.data
      if (msg.type === 'progress') setState({ status: 'loading', message: msg.message, progress: msg.progress })
      else if (msg.type === 'done') {
        setState({ status: 'ready', report: msg.report })
        worker.terminate()
      } else setState({ status: 'error', message: msg.message })
    }
    worker.postMessage(request, transfer)
  }, [])

  const openFile = useCallback(
    async (file: File) => {
      setState({ status: 'loading', message: `Reading ${file.name}`, progress: 0 })
      const buffer = await file.arrayBuffer()
      analyze({ kind: 'file', name: file.name, buffer }, [buffer])
    },
    [analyze],
  )

  useEffect(() => {
    analyze({ kind: 'url', url: DEFAULT_SAVE_URL })
    return () => workerRef.current?.terminate()
  }, [analyze])

  useEffect(() => {
    const onHash = () => setTab(tabFromHash())
    addEventListener('hashchange', onHash)
    return () => removeEventListener('hashchange', onHash)
  }, [])

  const go = (t: Tab) => {
    location.hash = t
    setTab(t)
    scrollTo({ top: 0 })
  }

  return (
    <div
      className="app"
      onDragOver={(e) => {
        e.preventDefault()
        setDragging(true)
      }}
      onDragLeave={(e) => {
        if (e.currentTarget === e.target) setDragging(false)
      }}
      onDrop={(e) => {
        e.preventDefault()
        setDragging(false)
        const file = e.dataTransfer.files[0]
        if (file) openFile(file)
      }}
    >
      <header>
        <div className="title">
          <h1>Bottleneck</h1>
          {state.status === 'ready' && (
            <p className="note">
              {state.report.saveName} · {state.report.sessionName} · {state.report.playHours.toFixed(0)} hours played
              {state.report.savedAt && ` · saved ${new Date(state.report.savedAt).toLocaleString()}`}
            </p>
          )}
        </div>
        <button className="button" onClick={() => fileInput.current?.click()}>Open save…</button>
        <input
          ref={fileInput}
          type="file"
          accept=".sav"
          hidden
          onChange={(e) => {
            const file = e.target.files?.[0]
            if (file) openFile(file)
            e.target.value = ''
          }}
        />
      </header>

      {state.status === 'ready' && (
        <nav className="tabs">
          {(Object.keys(TABS) as Tab[]).map((t) => (
            <a key={t} href={`#${t}`} className={t === tab ? 'active' : ''}>{TABS[t]}</a>
          ))}
        </nav>
      )}

      <main>
        {state.status === 'loading' && (
          <div className="loading">
            <div className="progress"><div style={{ width: `${Math.round(state.progress * 100)}%` }} /></div>
            <p className="note">{state.message}…</p>
          </div>
        )}
        {state.status === 'error' && (
          <div className="loading">
            <p className="error">Couldn't read that save: {state.message}</p>
            <p className="note">Drop a different .sav file here or use Open save.</p>
          </div>
        )}
        {state.status === 'ready' && (
          <>
            {tab === 'overview' && <Overview report={state.report} go={go} />}
            {tab === 'production' && <Production report={state.report} />}
            {tab === 'items' && <Items report={state.report} />}
            {tab === 'power' && <Power report={state.report} />}
            {tab === 'storage' && <Storage report={state.report} />}
            {tab === 'buildings' && <Buildings report={state.report} />}
          </>
        )}
      </main>

      <footer className="note">
        Your save is read in your browser and never uploaded. Saves are in
        <code>%LOCALAPPDATA%\FactoryGame\Saved\SaveGames\</code>
      </footer>

      {dragging && <div className="drop-overlay">Drop your .sav file to analyze it</div>}
    </div>
  )
}
