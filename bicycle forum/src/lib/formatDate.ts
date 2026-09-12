// Renders an ISO timestamp in the viewer's own timezone (Intl defaults to it
// when no `timeZone` option is given), from year down to minutes.
export function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}
