'use client'

import { useState } from 'react'
import { login } from '@/actions/auth'

export default function LoginPage() {
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    
    const formData = new FormData(e.currentTarget)
    const result = await login(formData)
    
    if (result && !result.success) {
      setError(result.error || 'Bir hata oluştu.')
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div className="glass-card animate-fade-in" style={{ width: '100%', maxWidth: '400px', padding: '32px' }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <div style={{ 
            width: '64px', 
            height: '64px', 
            borderRadius: '16px', 
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            boxShadow: '0 8px 16px rgba(139, 92, 246, 0.4)'
          }}>
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
              <path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
            </svg>
          </div>
          <h1 style={{ fontSize: '1.75rem', marginBottom: '8px' }}>Cihaz Takip Sistemi</h1>
          <p style={{ color: 'var(--muted)', fontSize: '0.95rem' }}>Devam etmek için giriş yapın</p>
        </div>

        {error && (
          <div className="badge badge-danger" style={{ 
            display: 'block', 
            padding: '12px 16px', 
            marginBottom: '24px',
            borderRadius: 'var(--radius-sm)',
            textTransform: 'none',
            letterSpacing: 'normal'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div className="input-group">
            <label htmlFor="email">E-posta Adresi</label>
            <input 
              type="email" 
              id="email" 
              name="email" 
              className="input-field" 
              required 
              placeholder="admin@test.com"
            />
          </div>

          <div className="input-group" style={{ marginBottom: '24px' }}>
            <label htmlFor="sifre">Şifre</label>
            <input 
              type="password" 
              id="sifre" 
              name="sifre" 
              className="input-field" 
              required 
              placeholder="••••••••"
            />
          </div>

          <button 
            type="submit" 
            className="btn btn-primary" 
            disabled={loading}
            style={{ width: '100%', padding: '14px', fontSize: '1rem' }}
          >
            {loading ? 'Giriş Yapılıyor...' : 'Giriş Yap'}
          </button>
        </form>
        
        <div style={{ textAlign: 'center', marginTop: '24px', fontSize: '0.85rem', color: 'var(--muted)' }}>
          Test Hesabı: <strong style={{ color: 'var(--foreground)' }}>admin@test.com</strong> / <strong style={{ color: 'var(--foreground)' }}>admin123</strong>
        </div>
      </div>
    </div>
  )
}
