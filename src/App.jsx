import { useState } from 'react'

const SYSTEM_PROMPT =
  'Eres un experto en contexto para LLMs. Limpia este texto de menús, barras laterales y metadatos. Devuélvelo en Markdown estructurado, optimizado para que un agente de IA lo entienda rápido y gaste el mínimo de tokens'

function App() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [copied, setCopied] = useState(false)

  async function handleClean(event) {
    event.preventDefault()

    const notionUrl = url.trim()
    if (!notionUrl) {
      setError('Pega una URL pública de Notion.')
      return
    }
    if (!/^https?:\/\//i.test(notionUrl)) {
      setError('La URL tiene que empezar por http:// o https://.')
      return
    }

    const apiKey = import.meta.env.VITE_DEEPSEEK_API_KEY
    if (!apiKey) {
      setError('Falta VITE_DEEPSEEK_API_KEY. Créala en un archivo .env y reinicia Vite.')
      return
    }

    setLoading(true)
    setError('')
    setCopied(false)
    setResult('')

    try {
      setStatus('Leyendo la página…')
      const sourceResponse = await fetch(`https://r.jina.ai/${notionUrl}`)
      if (!sourceResponse.ok) {
        throw new Error(`No se pudo leer la página (${sourceResponse.status}).`)
      }

      const sourceText = await sourceResponse.text()
      if (!sourceText.trim()) {
        throw new Error('La página no devolvió texto.')
      }

      setStatus('Comprobando el saldo…')
      const balanceResponse = await fetch('https://api.deepseek.com/user/balance', {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      })
      const balance = await balanceResponse.json().catch(() => null)
      if (!balanceResponse.ok) {
        const message = balance?.error?.message || `No se pudo comprobar el saldo (${balanceResponse.status}).`
        throw new Error(message)
      }
      if (balance?.is_available === false) {
        throw new Error('Servicio no disponible temporalmente (sin saldo)')
      }

      setStatus('Limpiando el texto…')
      const completionResponse = await fetch('https://api.deepseek.com/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model: 'deepseek-chat',
          messages: [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: sourceText },
          ],
        }),
      })

      const data = await completionResponse.json().catch(() => null)
      if (!completionResponse.ok) {
        const message = data?.error?.message || `DeepSeek respondió ${completionResponse.status}.`
        throw new Error(message)
      }

      const content = data?.choices?.[0]?.message?.content?.trim()
      if (!content) {
        throw new Error('DeepSeek no devolvió texto.')
      }

      setResult(content)
      setStatus('')
    } catch (err) {
      setStatus('')
      setError(err instanceof Error ? err.message : 'No se pudo limpiar la página.')
    } finally {
      setLoading(false)
    }
  }

  async function handleCopy() {
    if (!result) return

    try {
      await navigator.clipboard.writeText(result)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 2000)
    } catch {
      setError('No se pudo copiar al portapapeles.')
    }
  }

  return (
    <div className="min-h-screen bg-stone-100 text-stone-900">
      <main className="mx-auto flex min-h-screen w-full max-w-3xl flex-col px-5 py-12 sm:px-8 sm:py-16">
        <header className="mb-8">
          <p className="text-xs font-medium tracking-[0.16em] text-stone-500 uppercase">
            Notion → Markdown
          </p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-stone-950 sm:text-4xl">
            Notion Cleaner
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-6 text-stone-600 sm:text-base">
            Pega una URL pública de Notion. Leemos la página y devolvemos Markdown
            limpio, listo para un agente.
          </p>
        </header>

        <form onSubmit={handleClean} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
          <label htmlFor="notion-url" className="text-sm font-medium text-stone-800">
            URL pública de Notion
          </label>
          <div className="mt-2 flex flex-col gap-3 sm:flex-row">
            <input
              id="notion-url"
              type="text"
              inputMode="url"
              autoComplete="off"
              spellCheck="false"
              placeholder="https://www.notion.so/…"
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              className="h-11 w-full rounded-xl border border-stone-300 bg-stone-50 px-3.5 text-sm text-stone-900 outline-none transition placeholder:text-stone-400 focus:border-stone-900 focus:bg-white focus:ring-2 focus:ring-stone-900/10"
            />
            <button
              type="submit"
              disabled={loading}
              className="h-11 shrink-0 rounded-xl bg-stone-950 px-5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {loading ? 'Limpiando…' : 'Limpiar'}
            </button>
          </div>
          {status ? (
            <p className="mt-3 text-sm text-stone-500" role="status">
              {status}
            </p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-red-700" role="alert">
              {error}
            </p>
          ) : null}
        </form>

        <section className="mt-6 flex min-h-0 flex-1 flex-col">
          <div className="mb-2 flex items-center justify-between gap-3">
            <h2 className="text-sm font-medium text-stone-800">Resultado</h2>
            <button
              type="button"
              onClick={handleCopy}
              disabled={!result}
              className="rounded-lg border border-stone-300 bg-white px-3 py-1.5 text-sm font-medium text-stone-800 transition hover:border-stone-400 hover:bg-stone-50 disabled:cursor-not-allowed disabled:text-stone-400"
            >
              {copied ? 'Copiado' : 'Copiar al portapapeles'}
            </button>
          </div>
          <textarea
            value={result}
            onChange={(event) => setResult(event.target.value)}
            readOnly={loading}
            placeholder="El Markdown limpio aparecerá aquí."
            spellCheck="false"
            className="min-h-80 w-full flex-1 resize-y rounded-2xl border border-stone-200 bg-white p-4 font-mono text-sm leading-6 text-stone-800 shadow-sm outline-none placeholder:text-stone-400 focus:border-stone-900 focus:ring-2 focus:ring-stone-900/10"
          />
        </section>
      </main>
    </div>
  )
}

export default App
