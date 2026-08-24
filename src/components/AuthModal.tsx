import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { isSupabaseConfigured } from '../services/supabase';
import { Modal } from './ui/Modal';
import {
  Mail,
  Lock,
  User,
  ArrowRight,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export const AuthModal: React.FC = () => {
  const {
    isAuthModalOpen,
    closeAuthModal,
    signInWithEmail,
    signUpWithEmail,
    signInAsGuest,
    loading,
  } = useAuth();

  const [mode, setMode] = useState<'LOGIN' | 'REGISTER'>('LOGIN');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email || !password) {
      setErrorMessage('Por favor completa todos los campos requeridos');
      return;
    }

    if (mode === 'LOGIN') {
      const res = await signInWithEmail(email, password);
      if (res.error) setErrorMessage(res.error);
    } else {
      const res = await signUpWithEmail(email, password, name);
      if (res.error) setErrorMessage(res.error);
    }
  };

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      ariaLabel='Autenticación'
      maxWidthClass='max-w-md'
    >
      {/* Brand Header */}
      <div className='text-center mb-5'>
        <div className='w-10 h-10 rounded bg-brand text-white flex items-center justify-center font-black text-lg mx-auto mb-2 shadow-lg shadow-orange-950/60'>
          LF
        </div>
        <h2 className='text-xl font-bold text-white tracking-tight font-mono'>
          {mode === 'LOGIN' ? 'INICIAR SESIÓN' : 'CREAR CUENTA'}
        </h2>
        <p className='text-xs text-slate-400 mt-0.5'>
          Tu historial y bankroll, sincronizados
        </p>
      </div>

      {/* Tabs Mode Switcher */}
      <div className='flex bg-base p-1 rounded-lg border border-white/5 mb-5 text-xs font-mono'>
        <button
          type='button'
          onClick={() => {
            setMode('LOGIN');
            setErrorMessage(null);
          }}
          aria-pressed={mode === 'LOGIN'}
          className={`flex-1 py-1.5 rounded-md transition-all font-bold ${
            mode === 'LOGIN'
              ? 'bg-brand text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Iniciar Sesión
        </button>
        <button
          type='button'
          onClick={() => {
            setMode('REGISTER');
            setErrorMessage(null);
          }}
          aria-pressed={mode === 'REGISTER'}
          className={`flex-1 py-1.5 rounded-md transition-all font-bold ${
            mode === 'REGISTER'
              ? 'bg-brand text-white shadow-sm'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          Registrarse
        </button>
      </div>

      {/* Error message */}
      {errorMessage && (
        <div className='mb-4 p-3 bg-red-950/50 border border-red-500/30 rounded text-xs text-red-300 flex items-start gap-2'>
          <AlertCircle className='w-4 h-4 text-red-400 shrink-0 mt-0.5' />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Email & Password Form */}
      <form onSubmit={handleSubmit} className='space-y-3'>
        {mode === 'REGISTER' && (
          <div>
            <label className='text-[11px] font-semibold text-slate-400 uppercase block mb-1'>
              Nombre de Usuario / Tipster
            </label>
            <div className='relative'>
              <User className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' />
              <input
                type='text'
                required
                placeholder='ej. BrunoBets'
                value={name}
                onChange={(e) => setName(e.target.value)}
                className='w-full bg-base border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand focus:outline-none'
              />
            </div>
          </div>
        )}

        <div>
          <label className='text-[11px] font-semibold text-slate-400 uppercase block mb-1'>
            Correo Electrónico
          </label>
          <div className='relative'>
            <Mail className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' />
            <input
              type='email'
              required
              autoComplete='email'
              placeholder='tu@email.com'
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className='w-full bg-base border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand focus:outline-none'
            />
          </div>
        </div>

        <div>
          <label className='text-[11px] font-semibold text-slate-400 uppercase block mb-1'>
            Contraseña
          </label>
          <div className='relative'>
            <Lock className='w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500' />
            <input
              type='password'
              required
              minLength={6}
              autoComplete={
                mode === 'LOGIN' ? 'current-password' : 'new-password'
              }
              placeholder='••••••••'
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className='w-full bg-base border border-white/10 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:border-brand focus:outline-none'
            />
          </div>
        </div>

        {/* Submit Action */}
        <button
          type='submit'
          disabled={loading}
          className='w-full py-2.5 rounded-lg bg-brand hover:bg-brand-hover text-white font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-950/50 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 mt-4 disabled:opacity-60'
        >
          <span>{mode === 'LOGIN' ? 'Entrar a La Fija' : 'Crear Cuenta'}</span>
          <ArrowRight className='w-4 h-4' />
        </button>
      </form>

      {/* Guest Mode Shortcut */}
      <div className='mt-4 pt-4 border-t border-white/5 text-center'>
        <button
          type='button'
          onClick={signInAsGuest}
          className='text-xs text-slate-400 hover:text-white flex items-center justify-center gap-1.5 mx-auto transition-colors'
        >
          <Sparkles className='w-3.5 h-3.5 text-orange-400' />
          <span>Continuar como Invitado / Demo</span>
        </button>

        {!isSupabaseConfigured && (
          <p className='text-[10px] text-slate-500 mt-2 font-mono'>
            💡 Modo local activo. Conecta tus credenciales de Supabase en{' '}
            <code>.env</code> para producción.
          </p>
        )}
      </div>
    </Modal>
  );
};
