import React, { useState } from 'react'
import { useAuth } from '../context/AuthContext'
import { isSupabaseConfigured } from '../services/supabase'
import { X, Mail, Lock, User, ArrowRight, AlertCircle, Sparkles } from 'lucide-react'

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithEmail,
    signUpWithEmail,
    signInWithGoogle,
    signInAsGuest,
    loading
  } = useAuth()

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  if (!isAuthModalOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setErrorMessage(null)

    if (!email || !password) {
      setErrorMessage('Por favor completa todos los campos requeridos')
      return
    }

    if (mode === 'LOGIN') {
      const res = await signInWithEmail(email, password)
      if (res.error) setErrorMessage(res.error)
    } else {
      const res = await signUpWithEmail(email, password, name)
      if (res.error) setErrorMessage(res.error)
    }
  }

  const handleGoogleSignIn = async () => {
    setErrorMessage(null)
    const res = await signInWithGoogle()
    if (res?.error) setErrorMessage(res.error)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto">
      <div className="faceit-card border border-white/15 w-full max-w-md rounded-lg shadow-2xl p-5 md:p-6 my-8 text-slate-200 relative">
        
        {/* Close Button */}
        <button
          onClick={closeAuthModal}
          className="absolute right-4 top-4 p-1.5 rounded bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Brand Header */}
        <div className="text-center mb-5">
          <div className="w-10 h-10 rounded bg-[#FF5500] text-white flex items-center justify-center font-black text-lg mx-auto mb-2 shadow-lg shadow-orange-950/60">
            LF
          </div>
          <h2 className="text-xl font-bold text-white tracking-tight font-mono">
            {mode === 'LOGIN' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Accede a tu historial, cuotas y bankroll sincronizado
          </p>
        </div>

        {/* Tabs Mode Switcher */}
        <div className="flex bg-[#0B0C10] p-1 rounded-lg border border-white/5 mb-5 text-xs font-mono">
          <button
            type="button"
            onClick={() => { setMode('LOGIN'); setErrorMessage(null) }}
            className={`flex-1 py-1.5 rounded-md transition-all font-bold ${
              mode === 'LOGIN'
                ? 'bg-[#FF5500] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => { setMode('REGISTER'); setErrorMessage(null) }}
            className={`flex-1 py-1.5 rounded-md transition-all font-bold ${
              mode === 'REGISTER'
                ? 'bg-[#FF5500] text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            Registrarse
          </button>
        </div>

        {/* Error message */}
        {errorMessage && (
          <div className="mb-4 p-3 bg-red-950/50 border border-red-500/30 rounded text-xs text-red-300 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Google OAuth Button */}
        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-2.5 px-4 bg-[#161822] hover:bg-[#1E2230] text-white border border-white/15 rounded-lg flex items-center justify-center gap-3 font-semibold text-xs transition-all active:scale-98 shadow-sm mb-4 group"
        >
          {/* Google SVG Icon */}
          <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
            />
            <path
              fill="#34A853"
              d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.26v3.15C3.26 21.36 7.33 24 12 24z"
            />
            <path
              fill="#FBBC05"
              d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.26C.46 8.16 0 9.94 0 12s.46 3.84 1.26 5.42l4.02-3.15z"
            />
            <path
              fill="#EA4335"
              d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.64 1.26 6.58l4.02 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
            />
          </svg>
          <span>Continuar con Google</span>
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-4">
          <div className="flex-1 h-px bg-white/10" />
          <span className="text-[11px] font-mono text-slate-500 uppercase">
            o con tu correo
          </span>
          <div className="flex-1 h-px bg-white/10" />
        </div>

        {/* Email & Password Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          
          {mode === 'REGISTER' && (
            <div>
              <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
                Nombre de Usuario / Tipster
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="ej. BrunoBets"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-[#0B0C10] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#FF5500] focus:outline-none"
                />
              </div>
            </div>
          )}

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
              Correo Electrónico
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="email"
                required
                placeholder="tu@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0B0C10] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#FF5500] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-semibold text-slate-400 uppercase block mb-1">
              Contraseña
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="password"
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0B0C10] border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-[#FF5500] focus:outline-none"
              />
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-lg bg-[#FF5500] hover:bg-[#FF661A] text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-950/50 active:scale-98 transition-all flex items-center justify-center gap-1.5 mt-4"
          >
            <span>{mode === 'LOGIN' ? 'Entrar a La Fija' : 'Crear Cuenta'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        {/* Guest Mode Shortcut */}
        <div className="mt-4 pt-4 border-t border-white/5 text-center">
          <button
            type="button"
            onClick={signInAsGuest}
            className="text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span>Continuar como Invitado / Demo</span>
          </button>

          {!isSupabaseConfigured && (
            <p className="text-[10px] text-slate-500 mt-2 font-mono">
              💡 Modo local activo. Conecta tus credenciales de Supabase en <code>.env</code> para producción.
            </p>
          )}
        </div>

      </div>
    </div>
  )
}
