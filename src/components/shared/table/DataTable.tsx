import { For, Show, createEffect, createMemo, createSignal, type JSX } from 'solid-js'
import { Button } from '../../ui/button'
import { Input } from '../../ui/input'
import { Select } from '../../ui/select'
import { Skeleton } from '../../ui/skeleton'
import { cn } from '../../../lib/utils'

export interface DataTableColumn<T> {
  id: string
  label: string
  /** Right-align and monospace: use for every numeric column. */
  numeric?: boolean
  sortable?: boolean
  /** Hidden below 768px, where the table becomes stacked cards. */
  hideOnMobile?: boolean
  class?: string
  cell: (row: T) => JSX.Element
  sortValue?: (row: T) => string | number
}

export interface DataTableProps<T> {
  data: T[]
  columns: DataTableColumn<T>[]
  rowKey: (row: T) => string
  isLoading?: boolean
  error?: Error | null
  onRefetch?: () => void
  enableSearch?: boolean
  searchPlaceholder?: string
  searchValue?: (row: T) => string
  pageSize?: number
  pageSizeOptions?: number[]
  emptyTitle?: string
  emptyHint?: string
  emptyAction?: JSX.Element
  onRowClick?: (row: T) => void
  toolbar?: JSX.Element
  /** Rendered instead of a table row below 768px. */
  mobileCard?: (row: T) => JSX.Element
  /** Optional content rendered across the table below its owning row. */
  rowDetail?: (row: T) => JSX.Element | undefined
  class?: string

  /**
   * Server-side paging: the parent owns page state and total count, and
   * `data` contains only the current page.
   */
  isServerSide?: boolean
  totalCount?: number
  page?: number
  onPageChange?: (page: number) => void
  onPageSizeChange?: (size: number) => void
}

/**
 * The shared data-table contract used by muiru-watch: search, sorting,
 * pagination, shaped loading, retryable errors and mobile cards.
 */
export function DataTable<T>(props: DataTableProps<T>) {
  const [search, setSearch] = createSignal('')
  const [sortId, setSortId] = createSignal<string | null>(null)
  const [sortDir, setSortDir] = createSignal<'asc' | 'desc'>('asc')
  const [localPage, setLocalPage] = createSignal(0)
  const [pageSize, setPageSizeSignal] = createSignal(props.pageSize ?? 10)

  const page = () => (props.isServerSide ? (props.page ?? 0) : localPage())
  const setPage = (next: number) => {
    if (props.isServerSide) props.onPageChange?.(next)
    else setLocalPage(next)
  }
  const setPageSize = (next: number) => {
    setPageSizeSignal(next)
    props.onPageSizeChange?.(next)
  }

  const filtered = createMemo(() => {
    const term = search().trim().toLowerCase()
    if (!term || !props.searchValue) return props.data
    return props.data.filter((row) => props.searchValue!(row).toLowerCase().includes(term))
  })

  const sorted = createMemo(() => {
    const id = sortId()
    if (!id) return filtered()
    const column = props.columns.find((candidate) => candidate.id === id)
    if (!column?.sortValue) return filtered()
    const direction = sortDir() === 'asc' ? 1 : -1
    return [...filtered()].sort((leftRow, rightRow) => {
      const left = column.sortValue!(leftRow)
      const right = column.sortValue!(rightRow)
      if (left === right) return 0
      return (left > right ? 1 : -1) * direction
    })
  })

  const totalRows = () => (props.isServerSide ? (props.totalCount ?? 0) : sorted().length)
  const pageCount = createMemo(() => Math.max(1, Math.ceil(totalRows() / pageSize())))
  const paged = createMemo(() => {
    if (props.isServerSide) return sorted()
    const currentPage = Math.min(localPage(), pageCount() - 1)
    const start = currentPage * pageSize()
    return sorted().slice(start, start + pageSize())
  })

  createEffect(() => {
    if (!props.isServerSide && localPage() >= pageCount()) setLocalPage(pageCount() - 1)
  })

  const toggleSort = (column: DataTableColumn<T>) => {
    if (!column.sortable) return
    if (sortId() === column.id) setSortDir((direction) => (direction === 'asc' ? 'desc' : 'asc'))
    else {
      setSortId(column.id)
      setSortDir('asc')
    }
    setPage(0)
  }

  return (
    <div class={cn('flex flex-col', props.class)}>
      <Show when={props.enableSearch || props.toolbar}>
        <div class="flex flex-wrap items-center gap-2 border-b border-border p-2.5">
          <Show when={props.enableSearch}>
            <div class="relative w-full sm:min-w-[180px] sm:max-w-xs sm:flex-1">
              <Input
                type="search"
                value={search()}
                onInput={(event) => {
                  setSearch(event.currentTarget.value)
                  setPage(0)
                }}
                placeholder={props.searchPlaceholder ?? 'Search…'}
                aria-label={props.searchPlaceholder ?? 'Search'}
                class="h-8 pl-7 text-xs"
              />
              <span class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden="true">
                <svg width="11" height="11" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.6">
                  <circle cx="7" cy="7" r="5" />
                  <path d="M11 11l3.5 3.5" stroke-linecap="round" />
                </svg>
              </span>
            </div>
          </Show>
          {props.toolbar}
        </div>
      </Show>

      <Show when={props.error}>
        {(error) => (
          <div class="flex flex-col items-start gap-2 p-6">
            <p class="text-sm font-medium text-primary">This list could not be loaded.</p>
            <p class="text-xs text-secondary">{error().message}</p>
            <Show when={props.onRefetch}>
              <Button size="sm" variant="outline" onClick={() => props.onRefetch!()}>
                Try again
              </Button>
            </Show>
          </div>
        )}
      </Show>

      <Show when={!props.error}>
        <Show
          when={!props.isLoading}
          fallback={
            <div class="divide-y divide-border">
              <For each={Array.from({ length: 6 })}>
                {() => (
                  <div class="flex items-center gap-3 px-3.5 py-2.5">
                    <Skeleton class="h-2 w-2 rounded-full" />
                    <Skeleton class="h-3 w-40" />
                    <Skeleton class="ml-auto h-3 w-16" />
                    <Skeleton class="h-3 w-20" />
                  </div>
                )}
              </For>
            </div>
          }
        >
          <Show
            when={paged().length > 0}
            fallback={
              <div class="flex flex-col items-center gap-2 px-6 py-14 text-center">
                <p class="text-sm font-medium text-primary">
                  {search() ? `Nothing matches “${search()}”` : (props.emptyTitle ?? 'Nothing here yet')}
                </p>
                <p class="max-w-sm text-xs text-secondary">
                  {search()
                    ? 'Try a shorter search, or clear it to see everything.'
                    : (props.emptyHint ?? '')}
                </p>
                <Show when={!search() && props.emptyAction}>{props.emptyAction}</Show>
              </div>
            }
          >
            <table class="hidden w-full md:table">
              <thead>
                <tr class="border-b border-border">
                  <For each={props.columns}>
                    {(column) => (
                      <th
                        scope="col"
                        class={cn(
                          'px-3.5 py-2 text-left text-2xs font-medium uppercase tracking-wide text-muted',
                          column.numeric && 'text-right',
                          column.hideOnMobile && 'hidden lg:table-cell',
                        )}
                      >
                        <Show when={column.sortable} fallback={column.label}>
                          <button
                            type="button"
                            onClick={() => toggleSort(column)}
                            class="inline-flex items-center gap-1 hover:text-secondary"
                            aria-label={`Sort by ${column.label}`}
                          >
                            {column.label}
                            <span class="text-[8px]" aria-hidden="true">
                              {sortId() === column.id ? (sortDir() === 'asc' ? '▲' : '▼') : '↕'}
                            </span>
                          </button>
                        </Show>
                      </th>
                    )}
                  </For>
                </tr>
              </thead>
              <tbody>
                <For each={paged()}>
                  {(row) => (
                    <>
                      <tr
                        data-row-key={props.rowKey(row)}
                        class={cn(
                          'border-b border-border/60 last:border-0',
                          props.onRowClick && 'cursor-pointer hover:bg-surface-2',
                        )}
                        onClick={() => props.onRowClick?.(row)}
                      >
                        <For each={props.columns}>
                          {(column) => (
                            <td
                              class={cn(
                                'px-3.5 py-2 text-sm text-primary',
                                column.numeric && 'num text-right text-secondary',
                                column.hideOnMobile && 'hidden lg:table-cell',
                                column.class,
                              )}
                            >
                              {column.cell(row)}
                            </td>
                          )}
                        </For>
                      </tr>
                      <Show when={props.rowDetail?.(row)}>
                        {(detail) => (
                          <tr class="border-b border-border/60 bg-surface-0">
                            <td colSpan={props.columns.length} class="p-3.5">{detail()}</td>
                          </tr>
                        )}
                      </Show>
                    </>
                  )}
                </For>
              </tbody>
            </table>

            <Show when={props.mobileCard}>
              <div class="divide-y divide-border md:hidden">
                <For each={paged()}>
                  {(row) => (
                    <div
                      data-row-key={props.rowKey(row)}
                      class={cn('p-3', props.onRowClick && 'cursor-pointer active:bg-surface-2')}
                      onClick={() => props.onRowClick?.(row)}
                    >
                      {props.mobileCard!(row)}
                      <Show when={props.rowDetail?.(row)}>
                        {(detail) => <div class="mt-3 border-t border-border pt-3">{detail()}</div>}
                      </Show>
                    </div>
                  )}
                </For>
              </div>
            </Show>
          </Show>
        </Show>
      </Show>

      <Show when={!props.error && totalRows() > pageSize()}>
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
              aria-label="Previous page"
            >
              ‹
            </Button>
            <span class="num text-2xs text-secondary">{page() + 1}/{pageCount()}</span>
            <Button
              size="sm"
              variant="outline"
              disabled={page() >= pageCount() - 1}
              onClick={() => setPage(Math.min(pageCount() - 1, page() + 1))}
              aria-label="Next page"
            >
              ›
            </Button>
          </div>
        </div>
      </Show>
    </div>
  )
}
