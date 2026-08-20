import { For } from 'solid-js'
import { Skeleton } from '../ui/skeleton'

export function SectionsSkeleton() {
  return (
    <div class="mx-auto max-w-[1600px] space-y-4 px-4 py-5">
      <Skeleton class="h-7 w-40" />
      <Skeleton class="h-[68px] w-full" />
      <For each={[0, 1, 2]}>{() => <Skeleton class="h-40 w-full" />}</For>
    </div>
  )
}
