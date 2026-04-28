import crypto from 'crypto'
import { env } from './env.js'

/**
 * Generate a signed upload signature so the client can POST directly to
 * Cloudinary without exposing the API secret.
 *
 * Flow:
 *   1. Client calls GET /api/uploads/sign?folder=listings
 *   2. Server returns { signature, timestamp, cloudName, apiKey }
 *   3. Client POSTs the file directly to:
 *      https://api.cloudinary.com/v1_1/{cloudName}/image/upload
 *      with the signature params included
 */
export function generateUploadSignature(folder: 'listings' | 'avatars') {
  const timestamp = Math.round(Date.now() / 1000)

  // Params must be sorted alphabetically for the signature
  const paramsToSign = `folder=${folder}&timestamp=${timestamp}`

  const signature = crypto
    .createHash('sha256')
    .update(paramsToSign + env.CLOUDINARY_API_SECRET)
    .digest('hex')

  return {
    signature,
    timestamp,
    folder,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
    apiKey: env.CLOUDINARY_API_KEY,
  }
}
