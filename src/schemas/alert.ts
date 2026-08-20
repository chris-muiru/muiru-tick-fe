import { z } from 'zod'

export const channelSchema = z
  .object({
    name: z.string().trim().min(1, 'Name it — this is what you will pick in a policy.'),
    kind: z.enum(['email', 'sms', 'slack', 'webhook']),
    target: z.string().trim().min(1, 'A destination is required.'),
  })
  .superRefine((channel, ctx) => {
    const bad = (message: string) =>
      ctx.addIssue({ code: 'custom', path: ['target'], message })

    if (channel.kind === 'email' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(channel.target)) {
      bad('That does not look like an email address.')
    }
    if (channel.kind === 'sms' && !/^\+?[0-9\s-]{7,}$/.test(channel.target)) {
      bad('Use an international number, for example +254712345678.')
    }
    if ((channel.kind === 'webhook' || channel.kind === 'slack') && !/^https?:\/\//i.test(channel.target)) {
      bad('Must be a URL starting with https://')
    }
  })

export const policySchema = z.object({
  name: z.string().trim().min(1, 'Name the policy.'),
  steps: z
    .array(
      z.object({
        channelUuid: z.string().min(1, 'Every step needs a channel.'),
        waitSeconds: z.number().int().min(0).max(86_400, 'A step cannot wait longer than a day.'),
      }),
    )
    .min(1, 'A policy with no steps notifies nobody.'),
})
