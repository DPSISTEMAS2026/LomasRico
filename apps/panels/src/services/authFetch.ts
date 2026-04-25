/**
 * Wrapper de fetch que incluye automáticamente el token JWT
 * del localStorage en el header Authorization.
 * 
 * Uso: reemplazar `fetch(url, opts)` por `authFetch(url, opts)`
 * en todos los calls a endpoints protegidos del panel.
 */
export async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('lr_token') : null;

    const headers: Record<string, string> = {
        ...(options.headers as Record<string, string> || {}),
    };

    // Agregar Content-Type por defecto si hay body y no es FormData
    if (options.body && !(options.body instanceof FormData) && !headers['Content-Type']) {
        headers['Content-Type'] = 'application/json';
    }

    // Agregar Authorization si hay token
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    return fetch(url, {
        ...options,
        headers,
    });
}
