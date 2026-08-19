import { Link } from '@tanstack/react-router'
import { CATEGORIES, CATEGORY_LABELS } from '#/features/jokes/labels'
import { cn } from '#/lib/utils'
import type { JokeCategory } from '#/generated/api/model'

export function categoryChipClass(isActive: boolean): string {
  return cn(
    'rounded-full border px-3 py-1 text-sm transition-colors hover:bg-accent hover:text-accent-foreground',
    isActive && 'bg-primary text-primary-foreground hover:bg-primary',
  )
}

/**
 * Catalogue filter. Links, not buttons — the filter lives in the URL, so each
 * chip is a real navigation the browser can bookmark, share and go Back
 * through. Switching filter also resets to page 0; staying on page 4 of a
 * filter with two results shows an empty list and looks broken.
 */
export function CategoryFilter({ selected }: { selected?: JokeCategory }) {
  return (
    <div className="flex flex-wrap gap-2">
      <Link
        to="/"
        search={(prev) => ({ ...prev, category: undefined, page: 0 })}
        className={categoryChipClass(selected === undefined)}
      >
        All
      </Link>
      {CATEGORIES.map((category) => (
        <Link
          key={category}
          to="/"
          search={(prev) => ({ ...prev, category, page: 0 })}
          className={categoryChipClass(selected === category)}
        >
          {CATEGORY_LABELS[category]}
        </Link>
      ))}
    </div>
  )
}

/**
 * The same chips as component state rather than URL state, for the random
 * draw. A random joke's URL is not worth sharing — following it gives you a
 * different joke — so there is nothing here for the address bar to hold.
 */
export function CategoryToggle({
  value,
  onChange,
}: {
  value?: JokeCategory
  onChange: (next?: JokeCategory) => void
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <button
        type="button"
        onClick={() => onChange(undefined)}
        className={categoryChipClass(value === undefined)}
      >
        All
      </button>
      {CATEGORIES.map((category) => (
        <button
          key={category}
          type="button"
          onClick={() => onChange(category)}
          className={categoryChipClass(value === category)}
        >
          {CATEGORY_LABELS[category]}
        </button>
      ))}
    </div>
  )
}
