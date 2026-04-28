import { useState, useCallback } from 'react'

interface GeoState {
  lat: number | null
  lng: number | null
  error: string | null
  loading: boolean
}

/**
 * Hook to request the browser's current geolocation.
 *
 * Usage:
 *   const { lat, lng, error, loading, request } = useGeolocation()
 *   // Call request() when the user clicks "Use my location"
 */
export function useGeolocation() {
  const [state, setState] = useState<GeoState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
  })

  const request = useCallback(() => {
    if (!navigator.geolocation) {
      setState((s) => ({
        ...s,
        error: 'Geolocation is not supported by your browser',
      }))
      return
    }

    setState((s) => ({ ...s, loading: true, error: null }))

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setState({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          error: null,
          loading: false,
        })
      },
      (err) => {
        setState((s) => ({
          ...s,
          error: err.message,
          loading: false,
        }))
      },
      { enableHighAccuracy: true, timeout: 10_000 },
    )
  }, [])

  return { ...state, request }
}
