import { PassportScanError, type PassportScanErrorCode } from './passportScanError'

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, code: PassportScanErrorCode): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeoutId = globalThis.setTimeout(
      () => reject(new PassportScanError(code)),
      timeoutMs,
    )
    const clearTimeout = () => globalThis.clearTimeout(timeoutId)

    promise.then(
      (value) => { clearTimeout(); resolve(value) },
      (reason: unknown) => { clearTimeout(); reject(reason) },
    )
  })
}
