/**
 * Thin API client that wraps fetch with auth headers and base URL.
 */

const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000/api'

function getToken(): string | null {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('token')
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getToken()
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  }
  if (token) headers['Authorization'] = `Bearer ${token}`

  const res = await fetch(`${BASE_URL}${path}`, { ...options, headers })

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new ApiError(res.status, err?.error ?? 'Request failed')
  }

  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export interface AuthUser {
  id: string
  name: string
  email: string
  role: string
  avatarUrl?: string
  phone?: string
  neighborhood?: string
  phoneVerified?: boolean
  emailVerified?: boolean
  governmentIdVerified?: boolean
  governmentIdUrl?: string
  socialLink?: string
}

export interface AuthResponse {
  token: string
  user: AuthUser
}

export const auth = {
  register: (data: { name: string; email: string; password: string }) =>
    request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  login: (data: { email: string; password: string }) =>
    request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  me: () => request<AuthUser>('/auth/me'),

  completeProfile: (data: { phone: string; neighborhood: string }) =>
    request<AuthUser>('/auth/complete-profile', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// ── Listings ──────────────────────────────────────────────────────────────────

export interface Review {
  id: string
  rating: number
  comment?: string
  createdAt: string
  author: { id: string; name: string; avatarUrl?: string }
}

export interface Listing {
  id: string
  title: string
  description: string
  pricePerDay: number
  securityDeposit?: number | null
  status: string
  images: string[]
  tags: string[]
  address: string
  city: string
  state?: string
  country: string
  latitude: number
  longitude: number
  minRentalDays: number
  maxRentalDays: number
  createdAt: string
  owner: { 
    id: string; 
    name: string; 
    avatarUrl?: string;
    bio?: string;
    phone?: string;
    phoneVerified?: boolean;
    emailVerified?: boolean;
    governmentIdVerified?: boolean;
  }
  category: { id: string; name: string; slug: string; icon?: string }
  reviews?: Review[]
  _count?: { reviews: number; bookings?: number }
}

export interface ListingsResponse {
  data: Listing[]
  meta: { total: number; page: number; limit: number; pages: number }
}

export interface ListingSearchParams {
  q?: string
  categoryId?: string
  city?: string
  lat?: number
  lng?: number
  radiusKm?: number
  minPrice?: number
  maxPrice?: number
  page?: number
  limit?: number
}

export interface CreateListingInput {
  title: string
  description: string
  pricePerDay: number
  securityDeposit?: number
  categoryId: string
  images: string[]
  tags?: string[]
  address: string
  city: string
  state?: string
  country: string
  postalCode?: string
  latitude: number
  longitude: number
  minRentalDays?: number
  maxRentalDays?: number
}

export const listings = {
  search: (params: ListingSearchParams = {}) => {
    const qs = new URLSearchParams(
      Object.entries(params)
        .filter(([, v]) => v !== undefined)
        .map(([k, v]) => [k, String(v)]),
    ).toString()
    return request<ListingsResponse>(`/listings${qs ? `?${qs}` : ''}`)
  },

  get: (id: string) => request<Listing>(`/listings/${id}`),

  availability: (id: string, startDate?: string, endDate?: string) => {
    const qs = new URLSearchParams(
      Object.entries({ startDate, endDate }).filter(
        ([, v]) => v !== undefined,
      ) as [string, string][],
    ).toString()
    return request<{ available: boolean; blockedDates: string[] }>(
      `/listings/${id}/availability${qs ? `?${qs}` : ''}`,
    )
  },

  create: (data: CreateListingInput) =>
    request<Listing>('/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: Partial<Listing>) =>
    request<Listing>(`/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  delete: (id: string) =>
    request<void>(`/listings/${id}`, { method: 'DELETE' }),
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export interface Booking {
  id: string
  status: string
  startDate: string
  endDate: string
  totalPrice: number
  notes?: string
  createdAt: string
  listing: Pick<Listing, 'id' | 'title' | 'images' | 'city' | 'pricePerDay'> & {
    securityDeposit?: number | null
  }
  renter?: { id: string; name: string; avatarUrl?: string; phone?: string; email?: string }
}

export const bookings = {
  mine: () => request<Booking[]>('/bookings'),
  ownerBookings: () => request<Booking[]>('/bookings/owner'),
  get: (id: string) => request<Booking>(`/bookings/${id}`),
  create: (data: {
    listingId: string
    startDate: string
    endDate: string
    notes?: string
  }) =>
    request<Booking>('/bookings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  updateStatus: (id: string, status: string) =>
    request<Booking>(`/bookings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),
}

// ── Messages ──────────────────────────────────────────────────────────────────

export interface Message {
  id: string
  body: string
  status: string
  createdAt: string
  sender: { id: string; name: string; avatarUrl?: string }
}

export interface Conversation {
  id: string
  updatedAt: string
  listing?: { id: string; title: string; images: string[] }
  participants: { id: string; name: string; avatarUrl?: string }[]
  messages: Message[]
}

export const messages = {
  conversations: () => request<Conversation[]>('/messages/conversations'),
  conversation: (id: string) =>
    request<Conversation>(`/messages/conversations/${id}`),
  // Find or create a conversation with a recipient (optionally scoped to a listing)
  startConversation: (data: { recipientId: string; listingId?: string }) =>
    request<Conversation>('/messages/conversations', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  send: (data: { conversationId: string; body: string }) =>
    request<Message>('/messages', {
      method: 'POST',
      body: JSON.stringify(data),
    }),
  markRead: (messageId: string) =>
    request<Message>(`/messages/${messageId}/read`, { method: 'PATCH' }),
}

// ── Categories ────────────────────────────────────────────────────────────────

export interface Category {
  id: string
  name: string
  slug: string
  icon?: string
}

export const categories = {
  list: () => request<Category[]>('/categories'),
}

// ── Uploads ───────────────────────────────────────────────────────────────────

export interface UploadSignature {
  signature: string
  timestamp: number
  folder: string
  cloudName: string
  apiKey: string
}

export const uploads = {
  /**
   * Get a signed upload credential from the server, then POST the file
   * directly to Cloudinary. Returns the secure_url of the uploaded image.
   */
  sign: (folder: 'listings' | 'avatars' = 'listings') =>
    request<UploadSignature>(`/uploads/sign?folder=${folder}`),

  /**
   * Upload a file directly to Cloudinary using a server-signed credential.
   * Returns the Cloudinary secure_url.
   */
  async uploadFile(
    file: File,
    folder: 'listings' | 'avatars' = 'listings',
  ): Promise<string> {
    const creds = await uploads.sign(folder)

    const formData = new FormData()
    formData.append('file', file)
    formData.append('api_key', creds.apiKey)
    formData.append('timestamp', String(creds.timestamp))
    formData.append('signature', creds.signature)
    formData.append('folder', creds.folder)

    const res = await fetch(
      `https://api.cloudinary.com/v1_1/${creds.cloudName}/image/upload`,
      { method: 'POST', body: formData },
    )

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      throw new Error(err?.error?.message ?? 'Upload failed')
    }

    const data = await res.json()
    return data.secure_url as string
  },
}

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = {
  profile: (id: string) => request<AuthUser>(`/users/${id}`),
  updateMe: (data: Partial<AuthUser & { bio: string; phone: string }>) =>
    request<AuthUser>('/users/me', {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),
}

// ── Admin ─────────────────────────────────────────────────────────────────────

export interface AdminListing extends Omit<Listing, 'owner'> {
  owner?: { id: string; name: string; email: string; role: string }
  _count: { bookings: number; reviews: number }
}

export interface AdminUser {
  id: string
  name: string
  email: string
  role: string
  phone?: string
  neighborhood?: string
  emailVerified: boolean
  phoneVerified: boolean
  governmentIdVerified: boolean
  createdAt: string
  _count: { listings: number; bookingsAsRenter: number }
}

export interface PlatformStats {
  totalUsers: number
  totalAdmins: number
  totalListings: number
  pendingListings: number
  totalBookings: number
}

export const admin = {
  // ADMIN: get own listings
  myListings: () => request<AdminListing[]>('/admin/my-listings'),

  // ADMIN: create a listing (starts as DRAFT, needs SUPER_ADMIN approval)
  createListing: (data: CreateListingInput) =>
    request<Listing>('/admin/listings', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  // ADMIN: toggle listing status (ACTIVE / PAUSED)
  toggleStatus: (id: string, status: 'ACTIVE' | 'PAUSED') =>
    request<Listing>(`/admin/listings/${id}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    }),

  // ADMIN: update own listing
  updateListing: (id: string, data: Partial<CreateListingInput>) =>
    request<Listing>(`/admin/listings/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    }),

  // ADMIN: delete own listing
  deleteListing: (id: string) =>
    request<void>(`/admin/listings/${id}`, { method: 'DELETE' }),

  // SUPER_ADMIN: platform overview stats
  platformStats: () => request<PlatformStats>('/admin/platform-stats'),

  // SUPER_ADMIN: all listings (including DRAFT pending approval)
  allListings: () => request<AdminListing[]>('/admin/all-listings'),

  // SUPER_ADMIN: all bookings log
  allBookings: () => request<Booking[]>('/admin/all-bookings'),

  // SUPER_ADMIN: approve a DRAFT listing → ACTIVE
  approveListing: (id: string) =>
    request<Listing>(`/admin/approve-listing/${id}`, { method: 'PATCH' }),

  // SUPER_ADMIN: reject a DRAFT listing → DELETED
  rejectListing: (id: string) =>
    request<Listing>(`/admin/reject-listing/${id}`, { method: 'PATCH' }),

  // SUPER_ADMIN: force delete any listing
  forceDelete: (id: string) =>
    request<void>(`/admin/force-delete/${id}`, { method: 'DELETE' }),

  // SUPER_ADMIN: promote user to ADMIN
  verifyAdmin: (userId: string) =>
    request<{ id: string; name: string; email: string; role: string }>(
      `/admin/verify-admin/${userId}`,
      { method: 'PATCH' },
    ),

  // SUPER_ADMIN: all users
  allUsers: () => request<AdminUser[]>('/admin/all-users'),
}
