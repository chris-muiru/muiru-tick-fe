import { Show, createSignal } from 'solid-js'
import { Shell } from '../components/shared/Shell'
import { ListSection } from '../components/shared/Section'
import { SecretValue } from '../components/shared/SecretValue'
import { ConfirmButton } from '../components/shared/ConfirmButton'
import { Card, CardBody, CardHeader } from '../components/ui/card'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Field } from '../components/ui/field'
import { Input } from '../components/ui/input'
import { Select } from '../components/ui/select'
import { useAccountMutations, useCredentialsQuery, useTeamQuery } from '../resource/account/hook'
import { useZodForm } from '../lib/useZodForm'
import { inviteSchema } from '../schemas/auth'
import { session } from '../lib/session'
import { API_BASE } from '../lib/http'

const ROLES = [
  { value: 'member', label: 'Member', hint: 'Can see and edit jobs.' },
  { value: 'admin', label: 'Admin', hint: 'Also invites and removes teammates.' },
  { value: 'owner', label: 'Owner', hint: 'Also changes roles. A workspace always needs one.' },
]

export default function Settings() {
  const team = useTeamQuery()
  const credentials = useCredentialsQuery()
  const mutations = useAccountMutations()

  const current = () => session()
  const workspace = () => current()?.tenants.find((t) => t.uuid === current()?.activeTenantUuid)
  const canManage = () => workspace()?.role === 'owner' || workspace()?.role === 'admin'

  const [invite, setInvite] = createSignal({ email: '', role: 'member' })
  const inviteForm = useZodForm(inviteSchema)
  const [keyName, setKeyName] = createSignal('')
  const [issued, setIssued] = createSignal<{ clientKey: string; clientSecret: string } | null>(null)
  const [renaming, setRenaming] = createSignal<string | null>(null)

  return (
    <Shell>
      <h1 class="mb-5 text-lg font-medium tracking-tight text-primary">Settings</h1>

      <div class="mb-6 grid gap-4 lg:grid-cols-2">
        <ProfileCard />
        <PasswordCard />
      </div>

      <Show when={canManage()}>
        <WorkspaceCard />
      </Show>

      <ListSection
        title="Team"
        rows={team.data}
        isLoading={team.isPending}
        error={team.error as Error | null}
        emptyTitle="Just you"
        emptyHint="Invite the people who need to see what ran and what did not."
        footer={
          <form
            class="grid gap-2 sm:grid-cols-[1fr_170px_auto]"
            onSubmit={(e) => {
              e.preventDefault()
              if (!inviteForm.validateAll(invite() as never)) return
              mutations.invite.mutate(invite(), {
                onSuccess: () => setInvite({ email: '', role: 'member' }),
              })
            }}
          >
            <Field label="Email" error={inviteForm.errors().email}>
              <Input
                placeholder="teammate@example.com"
                value={invite().email}
                onInput={(e) => {
                  setInvite({ ...invite(), email: e.currentTarget.value })
                  inviteForm.clearField('email')
                }}
              />
            </Field>
            <Field label="Role">
              <Select
                value={invite().role}
                options={ROLES}
                onChange={(role) => setInvite({ ...invite(), role })}
              />
            </Field>
            <div class="flex items-end">
              <Button type="submit" loading={mutations.invite.isPending}>
                Invite
              </Button>
            </div>
          </form>
        }
      >
        {(member) => (
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-primary">{member.name || member.email}</p>
              <p class="truncate text-2xs text-muted">{member.email}</p>
            </div>
            <Show when={!member.accepted}>
              <Badge variant="late">invite pending</Badge>
            </Show>
            {/* Only an owner may change roles, and the API enforces it too — the
                disabled control is a courtesy, not the guard. */}
            <Show
              when={workspace()?.role === 'owner'}
              fallback={<Badge variant="neutral">{member.role}</Badge>}
            >
              <div class="w-36">
                <Select
                  value={member.role}
                  options={ROLES}
                  onChange={(role) =>
                    mutations.changeRole.mutate({ uuid: member.uuid, role })
                  }
                />
              </div>
            </Show>
            <Show when={canManage()}>
              <ConfirmButton
                label="Remove"
                confirmLabel="Remove"
                question={`Remove ${member.email}?`}
                pending={mutations.removeTeammate.isPending}
                onConfirm={() => mutations.removeTeammate.mutate(member.uuid)}
              />
            </Show>
          </div>
        )}
      </ListSection>

      <ListSection
        title="API credentials"
        description={`Every dashboard action is also a REST call against ${API_BASE}. Authenticate with X-Client-Key and X-Client-Secret.`}
        rows={credentials.data}
        isLoading={credentials.isPending}
        error={credentials.error as Error | null}
        emptyTitle="No credentials yet"
        emptyHint="Issue one to manage jobs from your own deploy pipeline."
        footer={
          <div class="space-y-3">
            <form
              class="flex items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault()
                mutations.createCredential.mutate(keyName(), {
                  onSuccess: (result) => {
                    setIssued(result)
                    setKeyName('')
                  },
                })
              }}
            >
              <Field label="Name">
                <Input
                  required
                  placeholder="CI pipeline"
                  value={keyName()}
                  onInput={(e) => setKeyName(e.currentTarget.value)}
                />
              </Field>
              <Button type="submit" loading={mutations.createCredential.isPending}>
                Issue
              </Button>
            </form>

            {/* Shown here and nowhere else: only the hash is stored, so a lost
                secret is rotated rather than recovered. */}
            <Show when={issued()}>
              {(credential) => (
                <div class="space-y-2 rounded border border-accent/30 bg-accent/5 p-3">
                  <p class="text-xs font-medium text-primary">
                    Copy the secret now — it is not shown again.
                  </p>
                  <SecretValue value={credential().clientKey} />
                  <SecretValue value={credential().clientSecret} />
                </div>
              )}
            </Show>
          </div>
        }
      >
        {(credential) => (
          <div class="flex flex-wrap items-center gap-x-3 gap-y-2 px-3.5 py-3">
            <Show
              when={renaming() === credential.uuid}
              fallback={
                <div class="min-w-0 flex-1">
                  <p class="truncate text-sm text-primary">{credential.name}</p>
                  <p class="num truncate text-2xs text-muted">{credential.clientKey}</p>
                </div>
              }
            >
              <form
                class="flex min-w-0 flex-1 items-center gap-2"
                onSubmit={(e) => {
                  e.preventDefault()
                  const name = new FormData(e.currentTarget).get('name') as string
                  if (!name?.trim()) return
                  mutations.renameCredential.mutate(
                    { uuid: credential.uuid, name: name.trim() },
                    { onSuccess: () => setRenaming(null) },
                  )
                }}
              >
                <Input name="name" value={credential.name} autofocus />
                <Button size="sm" type="submit" loading={mutations.renameCredential.isPending}>
                  Save
                </Button>
                <Button size="sm" type="button" variant="ghost" onClick={() => setRenaming(null)}>
                  Cancel
                </Button>
              </form>
            </Show>

            <Show when={renaming() !== credential.uuid}>
              <Show when={credential.revoked} fallback={<Badge variant="ok">active</Badge>}>
                <Badge variant="neutral">revoked</Badge>
              </Show>
              <Button size="sm" variant="outline" onClick={() => setRenaming(credential.uuid)}>
                Rename
              </Button>
              <Show when={!credential.revoked}>
                <ConfirmButton
                  label="Revoke"
                  confirmLabel="Revoke"
                  question="Anything using this key stops working immediately."
                  pending={mutations.revokeCredential.isPending}
                  onConfirm={() => mutations.revokeCredential.mutate(credential.uuid)}
                />
              </Show>
              {/* Revoked keys are kept until deleted so an old access log entry
                  can still be traced back to one. */}
              <Show when={credential.revoked}>
                <ConfirmButton
                  pending={mutations.deleteCredential.isPending}
                  onConfirm={() => mutations.deleteCredential.mutate(credential.uuid)}
                />
              </Show>
            </Show>
          </div>
        )}
      </ListSection>
    </Shell>
  )
}

function ProfileCard() {
  const mutations = useAccountMutations()
  const [name, setName] = createSignal(session()?.user.name ?? '')
  const [saved, setSaved] = createSignal(false)

  return (
    <Card>
      <CardHeader title="Your profile" />
      <CardBody>
        <form
          class="flex items-start gap-2"
          onSubmit={(e) => {
            e.preventDefault()
            if (!name().trim()) return
            mutations.updateAccount.mutate(name().trim(), {
              onSuccess: () => {
                setSaved(true)
                setTimeout(() => setSaved(false), 2000)
              },
            })
          }}
        >
          <Field label="Name" hint={session()?.user.email}>
            <Input value={name()} onInput={(e) => setName(e.currentTarget.value)} />
          </Field>
          <Button class="mt-5" type="submit" loading={mutations.updateAccount.isPending}>
            {saved() ? 'Saved' : 'Save'}
          </Button>
        </form>
      </CardBody>
    </Card>
  )
}

function PasswordCard() {
  const mutations = useAccountMutations()
  const [current, setCurrent] = createSignal('')
  const [next, setNext] = createSignal('')
  const [message, setMessage] = createSignal<{ tone: 'ok' | 'fail'; text: string } | null>(null)

  return (
    <Card>
      <CardHeader title="Password" />
      <CardBody>
        <form
          class="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault()
            setMessage(null)
            if (next().length < 10) {
              setMessage({ tone: 'fail', text: 'At least 10 characters. A short phrase works well.' })
              return
            }
            mutations.changePassword.mutate(
              { current: current(), next: next() },
              {
                onSuccess: () => {
                  setCurrent('')
                  setNext('')
                  setMessage({ tone: 'ok', text: 'Password changed.' })
                },
                onError: (error) => setMessage({ tone: 'fail', text: (error as Error).message }),
              },
            )
          }}
        >
          {/* The current password is asked for even though the session already
              proves who this is — it is what stops a walked-away laptop
              becoming a permanent takeover. */}
          <Field label="Current">
            <Input
              type="password"
              autocomplete="current-password"
              value={current()}
              onInput={(e) => setCurrent(e.currentTarget.value)}
            />
          </Field>
          <Field label="New">
            <Input
              type="password"
              autocomplete="new-password"
              value={next()}
              onInput={(e) => setNext(e.currentTarget.value)}
            />
          </Field>
          <Button type="submit" loading={mutations.changePassword.isPending}>
            Change
          </Button>
        </form>
        <Show when={message()}>
          {(note) => (
            <p class={note().tone === 'ok' ? 'mt-2 text-2xs text-ok' : 'mt-2 text-2xs text-fail'}>
              {note().text}
            </p>
          )}
        </Show>
      </CardBody>
    </Card>
  )
}

function WorkspaceCard() {
  const mutations = useAccountMutations()
  const workspace = () =>
    session()?.tenants.find((t) => t.uuid === session()?.activeTenantUuid)
  const [name, setName] = createSignal(workspace()?.name ?? '')
  const [slug, setSlug] = createSignal(workspace()?.slug ?? '')
  const [message, setMessage] = createSignal('')

  return (
    <Card class="mb-6">
      <CardHeader title="Workspace" />
      <CardBody>
        <form
          class="grid gap-2 sm:grid-cols-[1fr_1fr_auto] sm:items-start"
          onSubmit={(e) => {
            e.preventDefault()
            setMessage('')
            mutations.updateWorkspace.mutate(
              { name: name(), slug: slug() },
              {
                onSuccess: () =>
                  setMessage('Saved. Sign out and back in to see the new name in the switcher.'),
                onError: (error) => setMessage((error as Error).message),
              },
            )
          }}
        >
          <Field label="Name" hint="Appears on every alert.">
            <Input value={name()} onInput={(e) => setName(e.currentTarget.value)} />
          </Field>
          <Field label="Slug" hint="Lowercase letters, numbers and hyphens.">
            <Input class="num" value={slug()} onInput={(e) => setSlug(e.currentTarget.value)} />
          </Field>
          <Button
            class="sm:mt-5"
            type="submit"
            loading={mutations.updateWorkspace.isPending}
          >
            Save
          </Button>
        </form>
        <Show when={message()}>
          <p class="mt-2 text-2xs text-secondary">{message()}</p>
        </Show>
      </CardBody>
    </Card>
  )
}
