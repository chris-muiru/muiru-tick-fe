import { For, Show, createEffect, createMemo, createSignal, type JSX } from 'solid-js'
import { Card, CardHeader } from '../ui/card'
import { Button } from '../ui/button'
import { Select } from '../ui/select'
import { Skeleton } from '../ui/skeleton'

/**
 * One frame for every list in the app: header, a skeleton in the row's own
 * shape while loading, an error that says what to do, and an empty state that
 * guides rather than shrugs.
 */
export function ListSection<T>(props: {
  title: string
  description?: string
  action?: JSX.Element
  rows: T[] | undefined
  isLoading?: boolean
  error?: Error | null
  onRefetch?: () => void
  emptyTitle: string
  emptyHint: string
  children: (row: T) => JSX.Element
  footer?: JSX.Element
  skeletonRows?: number
  pageSize?: number
  pageSizeOptions?: number[]
}) {
  const [page, setPage] = createSignal(0)
  const [pageSize, setPageSize] = createSignal(props.pageSize ?? 10)
  const totalRows = () => (props.rows ?? []).length
  const pageCount = createMemo(() => Math.max(1, Math.ceil(totalRows() / pageSize())))
  const pagedRows = createMemo(() => {
    const start = Math.min(page(), pageCount() - 1) * pageSize()
    return (props.rows ?? []).slice(start, start + pageSize())
  })

  createEffect(() => {
    if (page() >= pageCount()) setPage(pageCount() - 1)
  })

  return (
    <section class="mb-6">
      <Card>
        <CardHeader title={props.title} action={props.action} />
        <Show when={props.description}>
          <p class="border-b border-border px-3.5 py-2 text-xs text-muted">{props.description}</p>
        </Show>

        <Show
          when={!props.error}
          fallback={
            <div class="flex flex-col items-start gap-2 p-5">
              <p class="text-sm font-medium text-primary">This could not be loaded.</p>
              <p class="text-xs text-secondary">{props.error?.message}</p>
              <Show when={props.onRefetch}>
                <button
                  onClick={() => props.onRefetch!()}
                  class="rounded border border-border px-2.5 py-1 text-xs text-secondary hover:bg-surface-2"
                >
                  Try again
                </button>
              </Show>
            </div>
          }
        >
          <Show
            when={!props.isLoading}
            fallback={
              <div class="divide-y divide-border">
                <For each={Array.from({ length: props.skeletonRows ?? 3 })}>
                  {() => (
                    <div class="flex items-center gap-3 px-3.5 py-3">
                      <Skeleton class="h-3 w-32" />
                      <Skeleton class="ml-auto h-3 w-24" />
                    </div>
                  )}
                </For>
              </div>
            }
          >
            <Show
              when={(props.rows ?? []).length > 0}
              fallback={
                <div class="px-5 py-10 text-center">
                  <p class="text-sm font-medium text-primary">{props.emptyTitle}</p>
                  <p class="mx-auto mt-1 max-w-sm text-xs text-secondary">{props.emptyHint}</p>
                </div>
              }
            >
              <div class="divide-y divide-border">
                <For each={pagedRows()}>{(row) => props.children(row)}</For>
              </div>
            </Show>
          </Show>
        </Show>

        <Show when={!props.error && !props.isLoading && totalRows() > pageSize()}>
          <div class="flex flex-wrap items-center justify-between gap-3 border-t border-border px-3 py-2">
            <span class="num text-2xs text-muted">
              {page() * pageSize() + 1}–{Math.min((page() + 1) * pageSize(), totalRows())} of{' '}
              {totalRows().toLocaleString()}
            </span>
            <div class="flex items-center gap-2">
              <Select
                class="w-28"
                value={String(pageSize())}
                options={(props.pageSizeOptions ?? [5, 10, 20, 50]).map((size) => ({
                  value: String(size),
                  label: `${size} / page`,
                }))}
                onChange={(value) => {
                  setPageSize(Number(value))
                  setPage(0)
                }}
              />
              <Button
                size="sm"
                variant="outline"
                disabled={page() === 0}
                onClick={() => setPage(Math.max(0, page() - 1))}
                aria-label={`Previous ${props.title.toLowerCase()} page`}
              >
                ‹
              </Button>
              <span class="num text-2xs text-secondary">{page() + 1}/{pageCount()}</span>
              <Button
                size="sm"
                variant="outline"
                disabled={page() >= pageCount() - 1}
                onClick={() => setPage(Math.min(pageCount() - 1, page() + 1))}
                aria-label={`Next ${props.title.toLowerCase()} page`}
              >
                ›
              </Button>
            </div>
          </div>
        </Show>

        <Show when={props.footer}>
          <div class="border-t border-border p-3">{props.footer}</div>
        </Show>
      </Card>
    </section>
  )
}
