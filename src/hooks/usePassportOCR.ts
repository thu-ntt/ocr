import { useCallback, useEffect, useReducer, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { validatePassportImage } from '../services/imageValidation.service'
import { preparePassportOCR, scanPassport } from '../services/paddleOCR.service'
import { getScanErrorCode } from '../services/passportScanError'
import {
  INITIAL_PASSPORT_OCR_STATE,
  passportOCRReducer,
} from './passportOCRState'

function scheduleOCRWarmup(): () => void {
  const warmUp = () => { void preparePassportOCR().catch(() => undefined) }
  const requestIdle = Reflect.get(window, 'requestIdleCallback') as typeof window.requestIdleCallback | undefined
  if (requestIdle) {
    const idleId = requestIdle(warmUp, { timeout: 2_000 })
    return () => window.cancelIdleCallback(idleId)
  }
  const timeoutId = globalThis.setTimeout(warmUp, 500)
  return () => globalThis.clearTimeout(timeoutId)
}

export function usePassportOCR() {
  const { t } = useTranslation()
  const [state, dispatch] = useReducer(passportOCRReducer, INITIAL_PASSPORT_OCR_STATE)
  const operationId = useRef(0)
  const previewUrlRef = useRef('')

  const replacePreviewUrl = useCallback((nextUrl: string) => {
    if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current)
    previewUrlRef.current = nextUrl
  }, [])

  useEffect(() => () => replacePreviewUrl(''), [replacePreviewUrl])
  useEffect(scheduleOCRWarmup, [])

  const fail = useCallback((reason: unknown) => {
    dispatch({ type: 'FAILED', error: t(`errors.${getScanErrorCode(reason)}`) })
  }, [t])

  const setFile = useCallback((file: File) => {
    const currentOperation = ++operationId.current
    replacePreviewUrl('')
    dispatch({ type: 'FILE_SELECTED', file })
    void preparePassportOCR().catch(() => undefined)
    void validatePassportImage(file)
      .then(() => {
        if (operationId.current !== currentOperation) return
        const previewUrl = URL.createObjectURL(file)
        replacePreviewUrl(previewUrl)
        dispatch({ type: 'IMAGE_READY', previewUrl })
      })
      .catch((reason: unknown) => {
        if (operationId.current === currentOperation) fail(reason)
      })
  }, [fail, replacePreviewUrl])

  const reset = useCallback(() => {
    operationId.current += 1
    replacePreviewUrl('')
    dispatch({ type: 'RESET' })
  }, [replacePreviewUrl])

  const scan = useCallback(async () => {
    if (!state.file) return
    const currentOperation = ++operationId.current
    dispatch({ type: 'SCAN_STARTED' })
    try {
      const result = await scanPassport(state.file, (status) => {
        if (operationId.current === currentOperation) dispatch({ type: 'SCAN_STAGE_CHANGED', status })
      })
      if (operationId.current === currentOperation) dispatch({ type: 'SCAN_COMPLETED', result })
    } catch (reason) {
      if (operationId.current === currentOperation) fail(reason)
    }
  }, [fail, state.file])

  return { ...state, setFile, scan, reset }
}
