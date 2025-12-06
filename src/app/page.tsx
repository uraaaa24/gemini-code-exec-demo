'use client'

import {
  type GenerateContentConfig,
  GoogleGenAI,
  type Part,
} from '@google/genai'
import { useState } from 'react'

const apiKey = process.env.NEXT_PUBLIC_GEMINI_API_KEY
if (!apiKey) {
  throw new Error('Missing NEXT_PUBLIC_GEMINI_API_KEY is not set')
}

const ai = new GoogleGenAI({ apiKey })

const DEFAULT_PROMPT =
  'ここに任意のテキストを書いてください。\n' +
  '例: 1〜200までの素数を列挙して合計を求めてください。Python のコードを生成し、Code Execution で実行して結果を使って説明してください。'

export default function Home() {
  const [prompt, setPrompt] = useState<string>('')
  const [useCodeExecution, setUseCodeExecution] = useState<boolean>(true)

  const [streamText, setStreamText] = useState<string>('')
  const [lastCode, setLastCode] = useState<string>('')
  const [execOutput, setExecOutput] = useState<string>('')

  const [isRunning, setIsRunning] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  const handleRun = async () => {
    if (!prompt.trim()) {
      setError('Prompt is empty')
      return
    }

    setIsRunning(true)
    setStreamText('')
    setLastCode('')
    setExecOutput('')
    setError(null)

    try {
      const config: GenerateContentConfig = {}
      if (useCodeExecution) {
        config.tools = [{ codeExecution: {} }]
      }

      const stream = await ai.models.generateContentStream({
        model: 'gemini-2.5-flash',
        contents: [prompt],
        config,
      })

      // Process the streaming response
      for await (const chunk of stream) {
        if (chunk.text) {
          setStreamText((prev) => prev + chunk.text)
        }

        const parts = chunk?.candidates?.[0]?.content?.parts || []
        parts.forEach((part: Part) => {
          // Capture generated executable code
          if (part.executableCode?.code) {
            setLastCode(part.executableCode.code)
          }
          // Capture code execution results
          if (part.codeExecutionResult?.output) {
            setExecOutput(
              (prev) => `${prev + (part.codeExecutionResult?.output ?? '')}\n`,
            )
          }
        })
      }
    } catch (err) {
      console.error('Error during generation:', err)
      if (err instanceof Error) {
        setError(err.message || 'An error occurred')
      } else {
        setError('An unknown error occurred')
      }
    } finally {
      setIsRunning(false)
    }
  }

  return (
    <main className="min-h-screen bg-neutral-100 text-neutral-900 flex justify-center p-6">
      <div className="w-full max-w-5xl space-y-6">
        <header className="space-y-2">
          <h1 className="text-2xl font-semibold tracking-tight">
            Gemini Code Execution Streaming Demo
          </h1>
          <p className="text-sm text-neutral-500">
            任意のテキストを入力して、Code
            Executionのあり/なしを切り替えながら、ストリーミング出力をブラウザ上で確認するためのシンプルなデモです。
          </p>
        </header>

        {/* Input section */}
        <section className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <label
              htmlFor="prompt"
              className="block text-sm font-medium text-neutral-800"
            >
              Prompt
            </label>

            {/* Code Execution toggle */}
            <button
              type="button"
              onClick={() => setUseCodeExecution((prev) => !prev)}
              className={`cursor-pointer inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium transition-colors ${
                useCodeExecution
                  ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                  : 'border-neutral-300 bg-white text-neutral-600'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  useCodeExecution ? 'bg-emerald-500' : 'bg-neutral-400'
                }`}
              />
              {useCodeExecution ? 'Code Execution: ON' : 'Code Execution: OFF'}
            </button>
          </div>

          {/* Prompt input */}
          <textarea
            id="prompt"
            className="w-full h-32 rounded-xl border border-neutral-300 bg-white px-3 py-2 text-sm outline-none ring-0 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 resize-none"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={DEFAULT_PROMPT}
          />

          {/* Run button */}
          <button
            type="button"
            onClick={handleRun}
            disabled={prompt.trim() === '' || isRunning}
            className="cursor-pointer disabled:cursor-not-allowed inline-flex items-center justify-center rounded-full bg-sky-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-sky-700 disabled:bg-neutral-400"
          >
            {isRunning ? '実行中...' : 'チャットを送信する'}
          </button>

          {error && <p className="text-xs text-red-500 mt-1">⚠ {error}</p>}
        </section>

        {/* Output section */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Streaming Text */}
          <div className="rounded-xl border border-neutral-200 bg-white p-3 flex flex-col shadow-sm">
            <h2 className="text-xs font-semibold text-neutral-700 mb-1">
              Streaming Text
            </h2>
            <div className="flex-1 overflow-auto text-xs whitespace-pre-wrap font-mono text-neutral-800">
              {streamText ||
                '（ここにモデルの回答がストリーミング表示されます）'}
            </div>
          </div>

          {/* Generated Code */}
          {useCodeExecution && (
            <div className="rounded-xl border border-neutral-200 bg-white p-3 flex flex-col shadow-sm">
              <h2 className="text-xs font-semibold text-neutral-700 mb-1">
                Generated Code
              </h2>
              <div className="flex-1 overflow-auto text-xs whitespace-pre font-mono text-emerald-800">
                {lastCode ||
                  '# ここに Code Execution 用に生成された Python コードが表示されます'}
              </div>
            </div>
          )}

          {/* Code Execution Result */}
          {useCodeExecution && (
            <div className="rounded-xl border border-neutral-200 bg-white p-3 flex flex-col shadow-sm">
              <h2 className="text-xs font-semibold text-neutral-700 mb-1">
                Code Execution Result
              </h2>
              <div className="flex-1 overflow-auto text-xs whitespace-pre-wrap font-mono text-amber-800">
                {execOutput ||
                  '（ここに Python 実行結果の標準出力などが表示されます）'}
              </div>
            </div>
          )}
        </section>
      </div>
    </main>
  )
}
