import { Link } from '@tanstack/react-router'
import { DicesIcon, LaughIcon, PlusIcon } from 'lucide-react'
import type { ReactNode } from 'react'

const NAV = [
  { to: '/', label: 'Catalogue', icon: LaughIcon },
  { to: '/random', label: 'Random', icon: DicesIcon },
  { to: '/new', label: 'Add a joke', icon: PlusIcon },
] as const

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-x-6 gap-y-2 px-4 py-4">
          <Link to="/" className="text-lg font-semibold tracking-tight">
            Joke catalogue
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            {NAV.map(({ to, label, icon: Icon }) => (
              <Link
                key={to}
                to={to}
                // `exact` on "/" only, or the catalogue tab stays lit on every
                // child route.
                activeOptions={{ exact: to === '/' }}
                activeProps={{ 'data-active': true }}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-muted-foreground transition-colors hover:text-foreground data-[active]:bg-accent data-[active]:text-accent-foreground"
              >
                <Icon className="size-4" />
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  )
}
