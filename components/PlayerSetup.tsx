'use client';

import { useState } from 'react';
import { useStore } from '@/lib/store';

export default function PlayerSetup({ onDone }: { onDone?: () => void }) {
  const { setPlayer } = useStore();
  const [name, setName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed.length < 2) {
      setError('Minimum 2 caractères, sorcière !');
      return;
    }
    if (trimmed.length > 20) {
      setError('Maximum 20 caractères !');
      return;
    }
    setPlayer({
      id: crypto.randomUUID(),
      name: trimmed,
      createdAt: Date.now(),
    });
    onDone?.();
  };

  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      minHeight: '100dvh', padding: '24px',
      background: 'var(--bg-dark)',
      gap: '24px',
    }}>
      <div style={{ fontSize: '80px', textAlign: 'center' }}>🌲</div>
      <h1 style={{ color: 'var(--rasta-gold)', fontSize: '28px', fontWeight: 900, textAlign: 'center' }}>
        Bienvenue en Schlagonie !
      </h1>
      <p style={{ color: 'var(--text-secondary)', textAlign: 'center', fontSize: '15px' }}>
        Choisis ton nom de guerrière des Vosges
      </p>

      <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '320px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <input
          type="text"
          value={name}
          onChange={(e) => { setName(e.target.value); setError(''); }}
          placeholder="Ton pseudo..."
          autoFocus
          style={{
            background: 'var(--bg-card)',
            border: '2px solid var(--border-color)',
            borderRadius: '12px',
            padding: '14px 16px',
            color: 'var(--text-primary)',
            fontSize: '16px',
            outline: 'none',
            width: '100%',
          }}
          onFocus={(e) => (e.target.style.borderColor = 'var(--rasta-gold)')}
          onBlur={(e) => (e.target.style.borderColor = 'var(--border-color)')}
        />
        {error && <p style={{ color: 'var(--rasta-red)', fontSize: '13px' }}>{error}</p>}
        <button type="submit" className="btn-rasta" style={{ marginTop: '4px' }}>
          C&apos;est parti ! 🏔️
        </button>
      </form>
    </div>
  );
}
