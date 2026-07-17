import { PassportScanError, type PassportScanErrorCode } from './passportScanError'

export function withTimeout<T>(promise: Promise<T>, timeoutMs: number, code: PassportScanErrorCode): Promise<T> {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(() => reject(new PassportScanError(code)), timeoutMs)
    promise.then(
      (value) => { window.clearTimeout(timeout); resolve(value) },
      (reason: unknown) => { window.clearTimeout(timeout); reject(reason) },
    )
  })
}
