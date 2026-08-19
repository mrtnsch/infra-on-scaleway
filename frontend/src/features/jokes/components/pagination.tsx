import { Link } from '@tanstack/react-router'
import { ChevronLeftIcon, ChevronRightIcon } from 'lucide-react'
import { buttonVariants } from '#/components/ui/button'
import { cn } from '#/lib/utils'

/**
 * `page` is zero-based on the wire (the OpenAPI spec says so) and one-based on
 * screen. The conversion happens here and nowhere else.
 */
export function Pagination({
  page,
  totalPages,
}: {
  page: number
  totalPages: number
}) {
  if (totalPages <= 1) return null

  const linkClass = cn(buttonVariants({ variant: 'outline', size: 'sm' }))
  // TanStack renders a disabled link as a plain <span>, which is the right
  // element for "there is nowhere to go" — no href, not focusable.
  const disabledClass = cn(linkClass, 'pointer-events-none opacity-50')

  return (
    <nav className="flex items-center justify-between gap-4">
      <Link
        to="/"
        search={(prev) => ({ ...prev, page: (prev.page ?? 0) - 1 })}
        disabled={page <= 0}
        className={page <= 0 ? disabledClass : linkClass}
      >
        <ChevronLeftIcon className="size-4" />
        Previous
      </Link>
      <span className="text-sm text-muted-foreground">
        Page {page + 1} of {totalPages}
      </span>
      <Link
        to="/"
        search={(prev) => ({ ...prev, page: (prev.page ?? 0) + 1 })}
        disabled={page >= totalPages - 1}
        className={page >= totalPages - 1 ? disabledClass : linkClass}
      >
        Next
        <ChevronRightIcon className="size-4" />
      </Link>
    </nav>
  )
}
