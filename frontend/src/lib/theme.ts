/**
 * shadcn's dark palette is gated on a `.dark` class (see the `@custom-variant`
 * in styles.css), so something has to put it there. This follows the OS setting
 * and keeps following it — a laptop that flips to dark at sunset should take
 * the app with it, which a one-shot read at boot would miss.
 */
export function applySystemTheme() {
  const query = window.matchMedia('(prefers-color-scheme: dark)')
  const apply = (dark: boolean) =>
    document.documentElement.classList.toggle('dark', dark)

  apply(query.matches)
  query.addEventListener('change', (event) => apply(event.matches))
}
