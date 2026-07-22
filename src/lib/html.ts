/**
 * Escapa texto para inclusão segura em HTML.
 * Preferir textContent/DOM quando possível; use isto só em templates HTML inevitáveis.
 */
export function escapeHtml(value: string | null | undefined): string {
  if (value == null) return "";
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapa HTML e preserva quebras de linha como <br>. */
export function escapeHtmlWithBreaks(value: string | null | undefined): string {
  return escapeHtml(value).replace(/\r\n|\r|\n/g, "<br>");
}
