import { createFileRoute } from '@tanstack/react-router'
import { CreateJokeForm } from '#/features/jokes/components/create-joke-form'

export const Route = createFileRoute('/new')({
  head: () => ({ meta: [{ title: 'Add a joke' }] }),
  component: NewJokePage,
})

function NewJokePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Add a joke</h1>
        <p className="mt-1 text-muted-foreground">
          It joins the catalogue immediately — there is no review queue.
        </p>
      </div>
      <CreateJokeForm />
    </div>
  )
}
