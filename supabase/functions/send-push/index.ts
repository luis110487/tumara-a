import { createClient } from 'npm:@supabase/supabase-js@2.49.8'
import { importPKCS8, SignJWT } from 'npm:jose@5.10.0'

type ServiceAccount = {
  project_id: string
  client_email: string
  private_key: string
  token_uri?: string
}

type PushEvent = {
  id: string
  recipient_id: string
  title: string
  body: string
  path: string
  attempts: number
  claim_token: string
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8' },
  })

async function googleAccessToken(account: ServiceAccount) {
  const now = Math.floor(Date.now() / 1000)
  const key = await importPKCS8(account.private_key, 'RS256')
  const assertion = await new SignJWT({
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  })
    .setProtectedHeader({ alg: 'RS256', typ: 'JWT' })
    .setIssuer(account.client_email)
    .setSubject(account.client_email)
    .setAudience(account.token_uri || 'https://oauth2.googleapis.com/token')
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(key)

  const response = await fetch(account.token_uri || 'https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })
  if (!response.ok) throw new Error(`oauth_${response.status}`)
  const payload = await response.json()
  if (!payload.access_token) throw new Error('oauth_missing_token')
  return String(payload.access_token)
}

async function sendFcm(
  account: ServiceAccount,
  accessToken: string,
  token: string,
  event: PushEvent,
  platform: string,
) {
  const message: Record<string, unknown> = {
    token,
    data: {
      title: event.title,
      body: event.body,
      path: event.path,
      event_id: String(event.id),
      recipient_id: event.recipient_id,
    },
  }
  if (platform === 'web') {
    message.webpush = { headers: { Urgency: 'high', TTL: '86400' } }
  } else {
    message.android = { priority: 'high', ttl: '86400s' }
  }

  const response = await fetch(
    `https://fcm.googleapis.com/v1/projects/${account.project_id}/messages:send`,
    {
      method: 'POST',
      headers: {
        authorization: `Bearer ${accessToken}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({ message }),
    },
  )
  if (response.ok) return 'sent'
  const error = await response.json().catch(() => ({}))
  const details = error?.error?.details || []
  if (details.some((item: Record<string, unknown>) => item.errorCode === 'UNREGISTERED')) {
    return 'expired'
  }
  throw new Error(`fcm_${response.status}`)
}

Deno.serve(async (request) => {
  if (request.method !== 'POST') return json({ error: 'method_not_allowed' }, 405)

  const cronSecret = Deno.env.get('CRON_SECRET')
  if (!cronSecret || request.headers.get('x-cron-secret') !== cronSecret) {
    return json({ error: 'unauthorized' }, 401)
  }

  const rawAccount = Deno.env.get('FCM_SERVICE_ACCOUNT_JSON')
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  let serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!serviceKey) {
    try {
      const secretKeys = JSON.parse(Deno.env.get('SUPABASE_SECRET_KEYS') || '{}')
      serviceKey = secretKeys.default
    } catch {
      serviceKey = undefined
    }
  }
  if (!rawAccount) return json({ error: 'missing_fcm_service_account' }, 503)
  if (!supabaseUrl) return json({ error: 'missing_supabase_url' }, 503)
  if (!serviceKey) return json({ error: 'missing_supabase_secret_key' }, 503)

  let account: ServiceAccount
  try {
    account = JSON.parse(rawAccount) as ServiceAccount
  } catch {
    return json({ error: 'invalid_firebase_json' }, 503)
  }
  if (!account.project_id || !account.client_email || !account.private_key) {
    return json({ error: 'invalid_firebase_credentials' }, 503)
  }

  const supabase = createClient(supabaseUrl, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let sent = 0
  let failed = 0
  let expired = 0

  try {
    await supabase.rpc('queue_due_service_reminders')
    const accessToken = await googleAccessToken(account)

    for (let index = 0; index < 25; index += 1) {
      const { data: claimed, error: claimError } = await supabase.rpc('claim_push_outbox', {
        p_limit: 1,
      })
      if (claimError) throw claimError
      const event = claimed?.[0] as PushEvent | undefined
      if (!event) break

      const lease = () =>
        supabase
          .from('push_outbox')
          .update({ locked_at: new Date().toISOString() })
          .eq('id', event.id)
          .eq('claim_token', event.claim_token)
          .eq('status', 'processing')
          .select('id')
          .maybeSingle()

      try {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_active')
          .eq('id', event.recipient_id)
          .maybeSingle()
        if (!profile?.is_active) throw new Error('inactive_recipient')

        const { data: devices, error: deviceError } = await supabase
          .from('push_devices')
          .select('installation_id,token,platform')
          .eq('user_id', event.recipient_id)
          .eq('enabled', true)
        if (deviceError) throw deviceError

        const { data: receipts } = await supabase
          .from('push_receipts')
          .select('installation_id')
          .eq('event_id', event.id)
        const delivered = new Set((receipts || []).map((row) => row.installation_id))
        let successes = delivered.size

        for (const device of devices || []) {
          if (delivered.has(device.installation_id)) continue
          const renewed = await lease()
          if (renewed.error || !renewed.data) throw new Error('lease_lost')
          const result = await sendFcm(
            account,
            accessToken,
            device.token,
            event,
            device.platform,
          )
          if (result === 'expired') {
            expired += 1
            await supabase
              .from('push_devices')
              .update({ enabled: false })
              .eq('installation_id', device.installation_id)
              .eq('token', device.token)
          } else {
            successes += 1
            await supabase.from('push_receipts').upsert(
              { event_id: event.id, installation_id: device.installation_id },
              { onConflict: 'event_id,installation_id', ignoreDuplicates: true },
            )
          }
        }

        if (!successes) throw new Error('no_registered_devices')
        await supabase
          .from('push_outbox')
          .update({ status: 'sent', sent_at: new Date().toISOString(), last_error: null })
          .eq('id', event.id)
          .eq('claim_token', event.claim_token)
          .eq('status', 'processing')
        sent += 1
      } catch (error) {
        const attempts = Number(event.attempts || 1)
        const delaySeconds = Math.min(3600, 30 * 2 ** Math.min(attempts, 7))
        await supabase
          .from('push_outbox')
          .update({
            status: attempts >= 10 ? 'failed' : 'pending',
            available_at: new Date(Date.now() + delaySeconds * 1000).toISOString(),
            last_error: error instanceof Error ? error.message.slice(0, 160) : 'delivery_failed',
          })
          .eq('id', event.id)
          .eq('claim_token', event.claim_token)
          .eq('status', 'processing')
        failed += 1
      }
    }

    return json({ ok: true, sent, failed, expired })
  } catch (error) {
    return json(
      { error: error instanceof Error ? error.message : 'dispatch_failed', sent, failed, expired },
      500,
    )
  }
})


