import { useState } from 'react'
import { useNavigate } from '@tanstack/react-router'
import { toast } from 'sonner'
import { z } from 'zod'
import { Button } from '#/components/ui/button'
import { Label } from '#/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '#/components/ui/select'
import { Textarea } from '#/components/ui/textarea'
import { useCreateJoke } from '#/features/jokes/api'
import { jokeErrorMessage } from '#/features/jokes/error-copy'
import { CATEGORIES, CATEGORY_LABELS } from '#/features/jokes/labels'
import { JokeCategory } from '#/generated/api/model'

/**
 * Mirrors `CreateJokeRequest` in the OpenAPI spec. The backend validates the
 * same bounds and is the authority; this only exists so a typo doesn't cost a
 * round trip. If the spec's limits move, they move here too — there is no way
 * to derive them from the generated types, which carry the shape but not the
 * constraints.
 */
const MIN = 3
const MAX = 500

const formSchema = z.object({
  content: z
    .string()
    .trim()
    .min(MIN, `A joke needs at least ${MIN} characters.`)
    .max(MAX, `Keep it under ${MAX} characters.`),
  category: z.enum(JokeCategory),
})

export function CreateJokeForm() {
  const navigate = useNavigate()
  const create = useCreateJoke()
  const [content, setContent] = useState('')
  const [category, setCategory] = useState<JokeCategory>(JokeCategory.GENERAL)
  const [contentError, setContentError] = useState<string>()

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const parsed = formSchema.safeParse({ content, category })
    if (!parsed.success) {
      setContentError(parsed.error.issues[0]?.message)
      return
    }
    setContentError(undefined)

    create.mutate(parsed.data, {
      onSuccess: (joke) => {
        toast.success('Joke added to the catalogue.')
        void navigate({ to: '/jokes/$id', params: { id: joke.id } })
      },
    })
  }

  return (
    <form onSubmit={onSubmit} className="space-y-6" noValidate>
      <div className="space-y-2">
        <Label htmlFor="content">The joke</Label>
        <Textarea
          id="content"
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={5}
          placeholder="Why do programmers prefer dark mode? …"
          aria-invalid={contentError !== undefined}
          aria-describedby="content-help"
        />
        <p id="content-help" className="text-sm text-muted-foreground">
          {contentError ?? `${content.trim().length} / ${MAX} characters`}
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="category">Category</Label>
        <Select
          value={category}
          onValueChange={(next) => setCategory(next as JokeCategory)}
        >
          <SelectTrigger id="category" className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {CATEGORIES.map((option) => (
              <SelectItem key={option} value={option}>
                {CATEGORY_LABELS[option]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* The 409 ("that joke already exists") and 400 cases both land here.
          They are about the submission, not the field, so they sit with the
          submit button rather than under the textarea. */}
      {create.isError ? (
        <p role="alert" className="text-sm text-destructive">
          {jokeErrorMessage(create.error)}
        </p>
      ) : null}

      <Button type="submit" disabled={create.isPending}>
        {create.isPending ? 'Adding…' : 'Add joke'}
      </Button>
    </form>
  )
}
