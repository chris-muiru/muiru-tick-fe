import { useNavigate, useParams } from '@solidjs/router'
import { Show, createSignal } from 'solid-js'
import { Shell } from '../../../components/shared/Shell'
import { JobForm, formFromJob, toRequestBody } from '../../../components/job/JobForm'
import { SectionsSkeleton } from '../../../components/shared/PageSkeleton'
import { useJobMutations, useJobQuery } from '../../../resource/job/hook'

export default function EditJob() {
  const params = useParams<{ uuid: string }>()
  const navigate = useNavigate()
  const job = useJobQuery(() => params.uuid)
  const mutations = useJobMutations()
  const [error, setError] = createSignal('')

  return (
    <Shell>
      <Show when={job.data} fallback={<SectionsSkeleton />}>
        {(loaded) => (
          <>
            <h1 class="mb-1 text-xl font-medium tracking-tight text-primary">
              Edit {loaded().name}
            </h1>
            <p class="mb-5 text-xs text-secondary">
              Changing the schedule recomputes the next run — a slot already queued under
              the old cadence is not carried over.
            </p>

            {/* Keyed on the uuid so navigating between two jobs rebuilds the
                form rather than leaving the previous one's values in place. */}
            <JobForm
              initial={formFromJob(loaded())}
              submitLabel="Save changes"
              saving={mutations.update.isPending}
              error={error()}
              onCancel={() => navigate(`/jobs/${params.uuid}`)}
              onSubmit={(form) => {
                setError('')
                mutations.update.mutate(
                  { uuid: params.uuid, body: toRequestBody(form) },
                  {
                    onSuccess: () => navigate(`/jobs/${params.uuid}`),
                    onError: (err) => setError((err as Error).message),
                  },
                )
              }}
            />
          </>
        )}
      </Show>
    </Shell>
  )
}
