// Determine the API base URL
let API_BASE_URL = ''

if (import.meta.env.VITE_API_BASE_URL) {
  API_BASE_URL = import.meta.env.VITE_API_BASE_URL
} else if (import.meta.env.DEV) {
  API_BASE_URL = 'http://localhost:4000'
} else {
  // If deployed on Vercel and backend is in the same project, 
  // leaving this empty uses the same domain (relative paths)
  API_BASE_URL = '' 
}

export function getApiUrl(endpoint) {
  // Ensure endpoint starts with /
  const path = endpoint.startsWith('/') ? endpoint : `/${endpoint}`
  return `${API_BASE_URL}${path}`
}

export default API_BASE_URL