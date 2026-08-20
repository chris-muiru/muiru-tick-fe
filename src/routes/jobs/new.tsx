import { useNavigate } from '@solidjs/router'
import { createSignal } from 'solid-js'
import { Shell } from '../../components/shared/Shell'
import { JobForm, emptyForm, toRequestBody } from '../../components/job/JobForm'
import { useJobMutations } from '../../resource/job/hook'

export default function NewJob() {
  const navigate = useNavigate()
  const mutations = useJobMutations()
  const [error, setError] = createSignal('')

  return (
    <Shell>
      <h1 class="mb-1 text-xl font-medium tracking-tight text-primary">New job</h1>
      <p class="mb-5 text-xs text-secondary">
        We call your endpoint on schedule. Check the preview on the right before saving —
        a schedule that is wrong by an hour looks exactly like one that is right.
      </p>

      <JobForm
        initial={emptyForm()}
        submitLabel="Create job"
        saving={mutations.create.isPending}
        error={error()}
        onCancel={() => navigate('/jobs')}
        onSubmit={(form) => {
          setError('')
          mutations.create.mutate(toRequestBody(form), {
            onSuccess: (job) => navigate(`/jobs/${job.uuid}`),
            onError: (err) => setError((err as Error).message),
          })
        }}
      />
    </Shell>
  )
}
