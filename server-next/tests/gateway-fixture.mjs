import crypto from 'node:crypto'

// Fake signing credentials; the test intercepts billing requests in memory.
process.env.RINTISAN_CLIENT_ID = 'local-test'
process.env.RINTISAN_API_KEY = 'local-test'
process.env.RINTISAN_BASE_URL = 'https://gateway.example.invalid'
process.env.RINTISAN_PRIVATE_KEY = crypto.generateKeyPairSync('rsa', {
  modulusLength: 2048,
  privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  publicKeyEncoding: { type: 'spki', format: 'pem' },
}).privateKey
