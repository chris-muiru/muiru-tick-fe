import { z } from 'zod'

const email = z.string().trim().min(1, 'An email is required.').email('That does not look like an email address.')

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'Enter your password.'),
})

export const signupSchema = z.object({
  name: z.string().trim().min(1, 'What should we call you?'),
  email,
  // Length beats composition rules: a long passphrase is stronger than a short
  // one with a symbol bolted on, and nobody resents typing it.
  password: z.string().min(10, 'At least 10 characters. A short phrase works well.'),
  tenantName: z.string().trim().min(1, 'Name the workspace — it appears on every alert.'),
  tenantSlug: z
    .string()
    .trim()
    .min(1, 'A slug is required.')
    .regex(/^[a-z0-9-]+$/, 'Lowercase letters, numbers and hyphens only.'),
})

export const inviteSchema = z.object({
  email,
  role: z.enum(['member', 'admin', 'owner']),
})
