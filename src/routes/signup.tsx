import { A, useNavigate } from '@solidjs/router'
import { Show, createSignal } from 'solid-js'
import { AuthCard } from '../components/shared/AuthCard'
import { Button } from '../components/ui/button'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { signup } from '../resource/account/trans'
import { startSession } from '../lib/session'

export default function Signup() {
  const navigate = useNavigate()
  const [form, setForm] = createSignal({
    name: '',
    email: '',
    password: '',
    tenantName: '',
    tenantSlug: '',
  })
  const [error, setError] = createSignal('')
  const [busy, setBusy] = createSignal(false)

  const set = (key: keyof ReturnType<typeof form>, value: string) =>
    setForm({ ...form(), [key]: value })

  // The slug is derived while it is untouched, so most people never see the
  // field as a decision they have to make.
  const setWorkspace = (tenantName: string) =>
    setForm({
      ...form(),
      tenantName,
      tenantSlug: tenantName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, ''),
    })

  const submit = async (e: Event) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await signup(form())
      startSession(result.token, result.user, result.tenants)
      navigate('/jobs/new', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Create an account"
      subtitle="Cron you do not have to run yourself."
      footer={
        <>
          Already have one? <A href="/login" class="text-accent hover:underline">Sign in</A>
        </>
      }
    >
      <form class="space-y-3" onSubmit={submit}>
        <Field label="Your name">
          <Input required value={form().name} onInput={(e) => set('name', e.currentTarget.value)} />
        </Field>
        <Field label="Email">
          <Input
            type="email"
            required
            autocomplete="email"
            value={form().email}
            onInput={(e) => set('email', e.currentTarget.value)}
          />
        </Field>
        <Field label="Password" hint="At least 10 characters.">
          <Input
            type="password"
            required
            minLength={10}
            autocomplete="new-password"
            value={form().password}
            onInput={(e) => set('password', e.currentTarget.value)}
          />
        </Field>
        <Field label="Workspace">
          <Input
            required
            placeholder="Acme Ltd"
            value={form().tenantName}
            onInput={(e) => setWorkspace(e.currentTarget.value)}
          />
        </Field>
        <Show when={error()}>
          <p class="text-xs text-fail">{error()}</p>
        </Show>
        <Button type="submit" size="lg" class="w-full" loading={busy()}>
          Create account
        </Button>
      </form>
    </AuthCard>
  )
}
