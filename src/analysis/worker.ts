import { Parser } from '@etothepii/satisfactory-file-parser'
import { buildReport, type Report } from './report'

export type WorkerRequest =
  | { kind: 'url'; url: string }
  | { kind: 'file'; name: string; buffer: ArrayBuffer }

export type WorkerMessage =
  | { type: 'progress'; progress: number; message: string }
  | { type: 'done'; report: Report }
  | { type: 'error'; message: string }

const post = (msg: WorkerMessage) => self.postMessage(msg)

self.onmessage = async (e: MessageEvent<WorkerRequest>) => {
  try {
    let name: string
    let buffer: ArrayBuffer
    if (e.data.kind === 'url') {
      post({ type: 'progress', progress: 0, message: 'Downloading save' })
      const res = await fetch(e.data.url)
      if (!res.ok) throw new Error(`Could not load ${e.data.url}: ${res.status}`)
      buffer = await res.arrayBuffer()
      name = e.data.url.split('/').pop() ?? 'save'
    } else {
      name = e.data.name
      buffer = e.data.buffer
    }

    const save = Parser.ParseSave(name, buffer, {
      onProgressCallback: (progress, message) => post({ type: 'progress', progress, message: message ?? 'Parsing' }),
    })
    post({ type: 'progress', progress: 1, message: 'Analyzing' })
    // Only the report crosses back to the UI thread, not the full object dump.
    post({ type: 'done', report: buildReport(name, save) })
  } catch (err) {
    post({ type: 'error', message: err instanceof Error ? err.message : String(err) })
  }
}
