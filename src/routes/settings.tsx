import { Show, createSignal } from 'solid-js'
import { Shell } from '../components/shared/Shell'
import { ListSection } from '../components/shared/Section'
import { SecretValue } from '../components/shared/SecretValue'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Input, Select } from '../components/ui/input'
import { useAccountMutations, useCredentialsQuery, useTeamQuery } from '../resource/account/hook'
import { API_BASE } from '../lib/http'

export default function Settings() {
  const team = useTeamQuery()
  const credentials = useCredentialsQuery()
  const mutations = useAccountMutations()

  const [invite, setInvite] = createSignal({ email: '', role: 'member' })
  const [keyName, setKeyName] = createSignal('')
  const [issued, setIssued] = createSignal<{ clientKey: string; clientSecret: string } | null>(null)

  return (
    <Shell>
      <h1 class="mb-5 text-xl font-medium tracking-tight text-primary">Settings</h1>

      <ListSection
        title="Team"
        rows={team.data}
        isLoading={team.isPending}
        error={team.error as Error | null}
        emptyTitle="Just you"
        emptyHint="Invite the people who need to see what ran and what did not."
        footer={
          <form
            class="grid gap-2 sm:grid-cols-[1fr_140px_auto]"
            onSubmit={(e) => {
              e.preventDefault()
              mutations.invite.mutate(invite(), {
                onSuccess: () => setInvite({ email: '', role: 'member' }),
              })
            }}
          >
            <Input
              required
              type="email"
              placeholder="teammate@example.com"
              value={invite().email}
              onInput={(e) => setInvite({ ...invite(), email: e.currentTarget.value })}
            />
            <Select
              value={invite().role}
              onChange={(e) => setInvite({ ...invite(), role: e.currentTarget.value })}
            >
              <option value="member">Member</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </Select>
            <Button type="submit" loading={mutations.invite.isPending}>
              Invite
            </Button>
          </form>
        }
      >
        {(member) => (
          <div class="flex items-center gap-3 px-3.5 py-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-primary">{member.name || member.email}</p>
              <p class="truncate text-2xs text-muted">{member.email}</p>
            </div>
            <Badge variant="neutral">{member.role}</Badge>
            <Show when={!member.accepted}>
              <Badge variant="late">invite pending</Badge>
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
              class="flex gap-2"
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
              <Input
                required
                placeholder="CI pipeline"
                value={keyName()}
                onInput={(e) => setKeyName(e.currentTarget.value)}
              />
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
          <div class="flex items-center gap-3 px-3.5 py-3">
            <div class="min-w-0 flex-1">
              <p class="truncate text-sm text-primary">{credential.name}</p>
              <p class="num truncate text-2xs text-muted">{credential.clientKey}</p>
            </div>
            <Show when={credential.revoked} fallback={<Badge variant="ok">active</Badge>}>
              <Badge variant="neutral">revoked</Badge>
            </Show>
            <Show when={!credential.revoked}>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => mutations.revokeCredential.mutate(credential.uuid)}
              >
                Revoke
              </Button>
            </Show>
          </div>
        )}
      </ListSection>
    </Shell>
  )
}
