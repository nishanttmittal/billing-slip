/**
 * Firebase auth for Billing Slip — Google sign-in gate only (data stays local).
 *
 * The web config below is NOT secret — Firebase web keys are meant to ship in
 * the browser. Access control = the Google-login allowlist below + sign-in.
 * Add a staff member by putting their Google email (lowercase) in ACCESS_ALLOWLIST.
 */
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth'

const firebaseConfig = {
  apiKey:            'AIzaSyCK0M-EfmOp9nh1-ZJcrBqT7c4plNxL2FM',
  authDomain:        'unico-operations.firebaseapp.com',
  projectId:         'unico-operations',
  storageBucket:     'unico-operations.firebasestorage.app',
  messagingSenderId: '367786260524',
  appId:             '1:367786260524:web:ae49d5da0ef1a71a9e3989',
}

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const provider = new GoogleAuthProvider()

/** Who may open Billing Slip. Add a staff member's Google email (lowercase). */
export const ACCESS_ALLOWLIST = [
  'nspenterprises24@gmail.com', // Owner
  'anshulgoel5884@gmail.com',   // Anshul — Manager
]

export const isAllowed = (email) =>
  !!email && ACCESS_ALLOWLIST.includes(email.toLowerCase())

export const signInWithGoogle = () => signInWithPopup(auth, provider)
export const signOutUser = () => signOut(auth)
export const watchAuth = (cb) => onAuthStateChanged(auth, cb)
