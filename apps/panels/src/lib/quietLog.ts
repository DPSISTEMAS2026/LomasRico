/** En producción no escribe en consola del navegador (evita filtrar fallos internos). */
export function quietError(..._args: unknown[]) {
    if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.error(..._args);
    }
}

export function quietWarn(..._args: unknown[]) {
    if (process.env.NODE_ENV !== 'production') {
        // eslint-disable-next-line no-console
        console.warn(..._args);
    }
}
