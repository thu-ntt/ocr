import { useCallback, useEffect, useRef, useState } from 'react'
import type { OCRStatus, PassportExtraction } from '../types/passport'
import { preparePassportOCR, scanPassport } from '../services/paddleOCR.service'
import { getScanErrorCode } from '../services/passportScanError'
import { preparePassportDocument } from '../services/documentPreparation.service'
import type { PreparedDocument } from '../types/document'
import { useTranslation } from 'react-i18next'

export function usePassportOCR() {
  const { t } = useTranslation()
  const [file, setFileState] = useState<File | null>(null)
  const [preparedDocument, setPreparedDocument] = useState<PreparedDocument | null>(null)
  const [previewUrl, setPreviewUrl] = useState('')
  const [status, setStatus] = useState<OCRStatus>('idle')
  const [result, setResult] = useState<PassportExtraction | null>(null)
  const [error, setError] = useState('')
  const operationId = useRef(0)

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl) }, [previewUrl])

  useEffect(() => {
    const warmUp = () => { void preparePassportOCR().catch(() => undefined) }
    const requestIdle = Reflect.get(window, 'requestIdleCallback') as typeof window.requestIdleCallback | undefined
    if (requestIdle) {
      const idleId = requestIdle(warmUp, { timeout: 2_000 })
      return () => window.cancelIdleCallback(idleId)
    }
    const timeoutId = globalThis.setTimeout(warmUp, 500)
    return () => globalThis.clearTimeout(timeoutId)
  }, [])

  const setFile = useCallback((nextFile: File) => {
    const currentOperation = ++operationId.current
    setFileState(nextFile); setPreparedDocument(null); setResult(null); setError(''); setStatus('preparing')
    // Reuse or resume the idle warm-up without blocking document preparation.
    void preparePassportOCR().catch(() => undefined)
    void preparePassportDocument(nextFile)
      .then((prepared) => {
        if (operationId.current !== currentOperation) return
        setPreparedDocument(prepared)
        setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return URL.createObjectURL(prepared.ocrFile) })
        setStatus('idle')
      })
      .catch((reason: unknown) => {
        if (operationId.current !== currentOperation) return
        setError(t(`errors.${getScanErrorCode(reason)}`)); setStatus('error')
      })
  }, [t])

  const reset = useCallback(() => {
    operationId.current += 1
    setPreviewUrl((old) => { if (old) URL.revokeObjectURL(old); return '' })
    setFileState(null); setPreparedDocument(null); setResult(null); setError(''); setStatus('idle')
  }, [])

  const scan = useCallback(async () => {
    if (!preparedDocument) return
    const currentOperation = ++operationId.current
    // Never show data from a previous document while a new scan is running or
    // after it fails document classification.
    setResult(null); setStatus('preparing'); setError('')
    try {
      const extraction = await scanPassport(preparedDocument.ocrFile, (stage) => {
        if (operationId.current === currentOperation) setStatus(stage)
      })
      if (operationId.current !== currentOperation) return
      setResult(extraction); setStatus('complete')
    } catch (reason) {
      if (operationId.current !== currentOperation) return
      setResult(null)
      setError(t(`errors.${getScanErrorCode(reason)}`))
      setStatus('error')
    }
  }, [preparedDocument, t])

  return { file, preparedDocument, previewUrl, status, result, error, setFile, scan, reset }
}
