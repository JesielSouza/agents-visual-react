import { useEffect, useRef, useState } from 'react';
import { playUiClick, playUiHover, useSoundSettings } from '../utils/pixelSounds';

function rowStyle(disabled = false) {
  return {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    opacity: disabled ? 0.45 : 1,
  };
}

export default function SoundSettings() {
  const [settings, setSettings] = useSoundSettings();
  const [open, setOpen] = useState(false);
  const rootRef = useRef(null);

  useEffect(() => {
    if (!open) return undefined;

    const handlePointerDown = (event) => {
      if (!rootRef.current?.contains(event.target)) {
        setOpen(false);
      }
    };

    window.addEventListener('pointerdown', handlePointerDown);
    return () => window.removeEventListener('pointerdown', handlePointerDown);
  }, [open]);

  const updateCategory = (key) => {
    setSettings((prev) => ({
      ...prev,
      categories: {
        ...prev.categories,
        [key]: !prev.categories[key],
      },
    }));
  };

  return (
    <div ref={rootRef} style={{ position: 'relative' }}>
      <button
        onMouseEnter={playUiHover}
        onClick={() => {
          playUiClick();
          setOpen((prev) => !prev);
        }}
        style={{
          width: 32,
          height: 32,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: open ? 'rgba(96,165,250,0.14)' : '#0f0f0f',
          border: `1px solid ${open ? 'rgba(96,165,250,0.55)' : 'rgba(255,255,255,0.12)'}`,
          borderRadius: 4,
          cursor: 'pointer',
          boxShadow: open ? '0 0 10px rgba(96,165,250,0.18)' : 'inset 0 1px 0 rgba(255,255,255,0.04)',
        }}
        aria-label="Abrir configuracoes de som"
      >
        <span style={{ fontSize: 14, filter: settings.enabled ? 'none' : 'grayscale(1)' }}>🔊</span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 10px)',
          right: 0,
          width: 270,
          background: '#0a0a0a',
          border: '1px solid #1f2937',
          borderTop: '3px solid #60a5fa',
          borderRadius: 6,
          boxShadow: '0 12px 30px rgba(0,0,0,0.55)',
          padding: 12,
          display: 'flex',
          flexDirection: 'column',
          gap: 12,
          zIndex: 120,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{
              fontFamily: 'var(--font-pixel)',
              fontSize: 6,
              letterSpacing: '0.15em',
              color: '#60a5fa',
            }}>
              SOUND SETTINGS
            </span>
            <label style={{ ...rowStyle(), gap: 8, cursor: 'pointer' }}>
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#d1d5db' }}>ON</span>
              <input
                type="checkbox"
                checked={settings.enabled}
                onChange={() => {
                  playUiClick();
                  setSettings((prev) => ({ ...prev, enabled: !prev.enabled }));
                }}
              />
            </label>
          </div>

          <label style={rowStyle(!settings.enabled)}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#9ca3af' }}>MASTER</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.volume}
                disabled={!settings.enabled}
                onChange={(e) => setSettings((prev) => ({ ...prev, volume: Number(e.target.value) }))}
                style={{ flex: 1 }}
              />
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#d1d5db', minWidth: 28 }}>
                {settings.volume}%
              </span>
            </div>
          </label>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {[
              ['movement', 'Movement sounds'],
              ['ui', 'UI sounds'],
              ['notifications', 'Notification sounds'],
              ['meetings', 'Meeting sounds'],
            ].map(([key, label]) => (
              <label key={key} style={{ ...rowStyle(!settings.enabled), cursor: 'pointer' }}>
                <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#d1d5db' }}>{label}</span>
                <input
                  type="checkbox"
                  checked={settings.categories[key]}
                  disabled={!settings.enabled}
                  onChange={() => {
                    playUiClick();
                    updateCategory(key);
                  }}
                />
              </label>
            ))}
          </div>

          <div style={{ height: 1, background: 'rgba(255,255,255,0.08)' }} />

          <label style={rowStyle(!settings.enabled)}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#9ca3af' }}>BACKGROUND MUSIC</span>
            <input
              type="checkbox"
              checked={settings.bgm.enabled}
              disabled={!settings.enabled}
              onChange={() => {
                playUiClick();
                setSettings((prev) => ({
                  ...prev,
                  bgm: {
                    ...prev.bgm,
                    enabled: !prev.bgm.enabled,
                  },
                }));
              }}
            />
          </label>

          <label style={rowStyle(!settings.enabled || !settings.bgm.enabled)}>
            <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#9ca3af' }}>BGM VOLUME</span>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1 }}>
              <input
                type="range"
                min="0"
                max="100"
                value={settings.bgm.volume}
                disabled={!settings.enabled || !settings.bgm.enabled}
                onChange={(e) => setSettings((prev) => ({
                  ...prev,
                  bgm: {
                    ...prev.bgm,
                    volume: Number(e.target.value),
                  },
                }))}
                style={{ flex: 1 }}
              />
              <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 5, color: '#d1d5db', minWidth: 28 }}>
                {settings.bgm.volume}%
              </span>
            </div>
          </label>
        </div>
      )}
    </div>
  );
}
