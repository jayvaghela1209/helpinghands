import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'http://localhost:54321'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'placeholder-anon-key'

// Determine if we should mock Supabase (e.g. if the URL is local default port or placeholder)
const isMockMode = supabaseUrl.includes('localhost:54321') || supabaseUrl.includes('placeholder');

let supabaseClient;

if (!isMockMode) {
  supabaseClient = createClient(supabaseUrl, supabaseAnonKey)
} else {
  console.warn('HelpingHands: Running in local MOCK mode. Authenticating against local PostgreSQL database.')
  
  // Custom mock client to emulate Supabase Auth
  const listeners = new Set()
  let currentSession = JSON.parse(localStorage.getItem('hh_session') || 'null')

  const notifyListeners = (event) => {
    listeners.forEach((cb) => cb(event, currentSession))
  }

  supabaseClient = {
    auth: {
      async signUp({ email, password }) {
        // Signups are handled through our backend API POST /api/auth/signup,
        // so we don't need this to do much in mock mode.
        return { data: { user: { id: 'mock-uuid', email } }, error: null }
      },
      
      async signInWithPassword({ email, password }) {
        try {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000'
          const response = await fetch(`${apiUrl}/api/auth/login`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
          })
          
          if (!response.ok) {
            const errData = await response.json()
            return { data: null, error: { message: errData.detail || 'Authentication failed' } }
          }
          
          const session = await response.json()
          currentSession = session
          localStorage.setItem('hh_session', JSON.stringify(session))
          notifyListeners('SIGNED_IN')
          
          return { data: { session, user: session.user }, error: null }
        } catch (err) {
          return { data: null, error: { message: 'Could not reach backend auth: ' + err.message } }
        }
      },
      
      async getSession() {
        return { data: { session: currentSession }, error: null }
      },
      
      onAuthStateChange(callback) {
        listeners.add(callback)
        // Immediately fire with current state
        callback(currentSession ? 'SIGNED_IN' : 'SIGNED_OUT', currentSession)
        
        return {
          data: {
            subscription: {
              unsubscribe() {
                listeners.delete(callback)
              }
            }
          }
        }
      },
      
      async signOut() {
        currentSession = null
        localStorage.removeItem('hh_session')
        notifyListeners('SIGNED_OUT')
        return { error: null }
      }
    }
  }
}

export const supabase = supabaseClient
export default supabase
