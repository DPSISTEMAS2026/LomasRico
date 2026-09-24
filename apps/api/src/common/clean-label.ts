export function cleanModifierLabel(label?: string | null): string {
    if (!label) return '';
    return String(label)
        .replace(/mer-?cat\s*:\s*/gi, '')
        .replace(/\bmer-?cat\b/gi, '')
        .replace(/^[:\s\-]+/, '')
        .replace(/\s{2,}/g, ' ')
        .trim();
}
