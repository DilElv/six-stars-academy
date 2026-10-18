import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

async function uploadBufferOnce(buffer, folder, options) {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME
  const apiKey = process.env.CLOUDINARY_API_KEY
  const apiSecret = process.env.CLOUDINARY_API_SECRET
  if (!cloudName || !apiKey || !apiSecret) throw new Error('Konfigurasi Cloudinary belum lengkap')

  const params = { folder, timestamp: Math.floor(Date.now() / 1000), ...options }
  const signature = cloudinary.utils.api_sign_request(params, apiSecret)
  const form = new FormData()
  form.append('file', new Blob([buffer], { type: 'application/octet-stream' }), 'upload-image')
  form.append('api_key', apiKey)
  form.append('signature', signature)
  for (const [key, value] of Object.entries(params)) form.append(key, String(value))

  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: form,
    signal: AbortSignal.timeout(120_000),
  })
  const result = await response.json().catch(() => null)
  if (!response.ok || !result?.secure_url) {
    const error = new Error(result?.error?.message || `Cloudinary upload gagal (HTTP ${response.status})`)
    error.http_code = response.status
    throw error
  }
  return result
}

export async function uploadBuffer(buffer, folder = 'ssb-sixstar', options = {}) {
  let lastError
  for (let attempt = 1; attempt <= 2; attempt += 1) {
    try {
      return await uploadBufferOnce(buffer, folder, options)
    } catch (err) {
      lastError = err
      const transient = err?.name === 'TimeoutError' || err?.name === 'AbortError' || err?.http_code === 499 || err?.http_code >= 500 || /timeout|socket|network|aborted/i.test(err?.message || '')
      if (!transient || attempt === 2) break
    }
  }
  throw lastError
}

export default cloudinary
