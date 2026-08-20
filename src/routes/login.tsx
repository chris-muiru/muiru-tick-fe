import { A, useNavigate } from '@solidjs/router'
import { Show, createSignal } from 'solid-js'
import { AuthCard } from '../components/shared/AuthCard'
import { Button } from '../components/ui/button'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { login } from '../resource/account/trans'
import { startSession } from '../lib/session'

export default function Login() {
  const navigate = useNavigate()
  const [email, setEmail] = createSignal('')
  const [password, setPassword] = createSignal('')
  const [error, setError] = createSignal('')
  const [busy, setBusy] = createSignal(false)

  const submit = async (e: Event) => {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const result = await login(email(), password())
      startSession(result.token, result.user, result.tenants)
      navigate('/dashboard', { replace: true })
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthCard
      title="Sign in"
      subtitle="Your jobs keep firing while you are away."
      footer={
        <>
          No account? <A href="/signup" class="text-accent hover:underline">Create one</A>
        </>
      }
    >
      <form class="space-y-3" onSubmit={submit}>
        <Field label="Email">
          <Input
            type="email"
            required
            autocomplete="email"
            value={email()}
            onInput={(e) => setEmail(e.currentTarget.value)}
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            required
            autocomplete="current-password"
            value={password()}
            onInput={(e) => setPassword(e.currentTarget.value)}
          />
        </Field>
        <Show when={error()}>
          <p class="text-xs text-fail">{error()}</p>
        </Show>
        <Button type="submit" size="lg" class="w-full" loading={busy()}>
          Sign in
        </Button>
      </form>
    </AuthCard>
  )
}
