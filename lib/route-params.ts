/**
 * Next.js 14 passa `params` síncrono; no 15+ pode ser Promise.
 * Usar isto nas route handlers dinâmicos para obter o slug de forma segura.
 */
export async function resolveDynamicParams<T extends Record<string, string>>(params: T | Promise<T>): Promise<T> {
  return Promise.resolve(params)
}
