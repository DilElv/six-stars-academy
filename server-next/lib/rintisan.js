import crypto from 'crypto'
import fs from 'fs'

const ENV = process.env.RINTISAN_ENV || 'sandbox'
const BASE_URL =
  process.env.RINTISAN_BASE_URL ||
  (ENV === 'production' ? 'https://api.rintisan.co.id' : 'https://api.sandbox.rintisan.co.id')

const CLIENT_ID = process.env.RINTISAN_CLIENT_ID
const API_KEY = process.env.RINTISAN_API_KEY
const CALLBACK_TOKEN = process.env.RINTISAN_CALLBACK_TOKEN

function readKeyFile(envVar, fallbackPath) {
  const direct = process.env[envVar]
  if (direct) return direct.includes('BEGIN') ? direct : Buffer.from(direct, 'base64').toString('utf8')
  const path = process.env[`${envVar}_PATH`] || fallbackPath
  if (path && fs.existsSync(path)) return fs.readFileSync(path, 'utf8')
  return null
}

// Our private key: used to sign outgoing requests to Rintisan.
function getPrivateKey() {
  return readKeyFile('RINTISAN_PRIVATE_KEY', './keys/rintisan_private.pem')
}

// Rintisan's public key: used to verify incoming callback signatures.
function getRintisanPublicKey() {
  return readKeyFile('RINTISAN_PUBLIC_KEY', './keys/rintisan_public.pem')
}

export function isConfigured() {
  return Boolean(CLIENT_ID && API_KEY && getPrivateKey())
}

export function isCallbackVerifiable() {
  return Boolean(CLIENT_ID && CALLBACK_TOKEN && getRintisanPublicKey())
}

function minify(obj) {
  return JSON.stringify(obj)
}

function bodyHash(minifiedBody) {
  return crypto.createHash('sha256').update(minifiedBody, 'utf8').digest('hex').toLowerCase()
}

// Sign a request body with OUR private key (SHA256withRSA), per Rintisan's guide.
export function signRequest(payload) {
  const privateKey = getPrivateKey()
  if (!privateKey) throw new Error('RINTISAN_PRIVATE_KEY belum dikonfigurasi')
  const minified = minify(payload)
  const hash = bodyHash(minified)
  const stringToSign = `${CLIENT_ID}:${hash}`
  const signature = crypto.createSign('RSA-SHA256').update(stringToSign, 'utf8').sign(privateKey).toString('base64')
  return { minified, signature }
}

// Verify an incoming callback signature using RINTISAN'S public key.
export function verifyCallback(rawBodyText, signatureB64) {
  const publicKey = getRintisanPublicKey()
  if (!publicKey) throw new Error('RINTISAN_PUBLIC_KEY belum dikonfigurasi')
  if (!signatureB64) return false

  let minified
  try {
    minified = minify(JSON.parse(rawBodyText))
  } catch {
    return false
  }

  const hash = bodyHash(minified)
  const stringToSign = `${CLIENT_ID}:${hash}`
  try {
    return crypto.createVerify('RSA-SHA256').update(stringToSign, 'utf8').verify(publicKey, signatureB64, 'base64')
  } catch {
    return false
  }
}

export function verifyCallbackToken(token) {
  return Boolean(CALLBACK_TOKEN) && token === CALLBACK_TOKEN
}

// Create a billing (invoice) on Rintisan. `payload` follows their Create Billing spec.
export async function createBilling(payload) {
  if (!isConfigured()) throw new Error('Payment gateway belum dikonfigurasi (RINTISAN_* env belum diisi)')

  const { minified, signature } = signRequest(payload)

  const res = await fetch(`${BASE_URL}/api/v1/billing/payin/partner/create`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-client-id': CLIENT_ID,
      'x-api-key': API_KEY,
      'x-signature': signature,
    },
    body: minified,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok || !data || String(data.response_code) !== '200') {
    const message = data?.message || `Rintisan create billing gagal (HTTP ${res.status})`
    throw new Error(message)
  }
  return data
}

export async function queryPayment(trxId) {
  if (!isConfigured()) throw new Error('Payment gateway belum dikonfigurasi (RINTISAN_* env belum diisi)')

  const payload = { trx_id: trxId }
  const { minified, signature } = signRequest(payload)

  const res = await fetch(`${BASE_URL}/api/v1/billing/payin/partner/querypayment`, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'x-client-id': CLIENT_ID,
      'x-api-key': API_KEY,
      'x-signature': signature,
    },
    body: minified,
  })

  const data = await res.json().catch(() => null)
  if (!res.ok || !data) throw new Error(`Rintisan query payment gagal (HTTP ${res.status})`)
  return data
}

export const PAYMENT_METHODS = [
  { value: 'QRIS', label: 'QRIS' },
  { value: 'VAMANDIRI', label: 'Virtual Account Mandiri' },
  { value: 'VABNI', label: 'Virtual Account BNI' },
  { value: 'VABRI', label: 'Virtual Account BRI' },
  { value: 'TOKOPEDIA CC', label: 'Kartu Kredit (Tokopedia)' },
  { value: 'TOKOPEDIA NON CC', label: 'Tokopedia (Non Kartu Kredit)' },
  { value: 'BLIBLI CC', label: 'Kartu Kredit (Blibli)' },
]
