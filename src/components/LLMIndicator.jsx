import { useState } from 'react';
import { useLLMStatus } from '../hooks/useLLMStatus';

function badgeColor(name) {
  if (!name) return '#6b7280';
  if (name.includes('openai')) return '#10a37f';
  if (name.includes('minimax-m2.7')) return '#ff6b6b';
  if (name.includes('minimax-portal')) return '#f59e0b';
  if (name.includes('ollama')) return '#8b5cf6';
  if (name.includes('lmstudio')) return '#3b82f6';
  return '#9ca3af';
}

export default function LLMIndicator() {
  const status = useLLMStatus();
  const [open, setOpen] = useState(false);

  const primary = status?.primary_llm || 'offline';
  const color = badgeColor(primary);
  const hasFallbackWarning = !!status?.last_fallback;

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen((prev) => !prev)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: '#1a1a2e',
          border: `1px solid ${hasFallbackWarning ? '#facc15' : color}`,
          borderRadius: 4,
          padding: '5px 10px',
          boxShadow: hasFallbackWarning ? '0 0 10px rgba(250,204,21,0.2)' : `0 0 8px ${color}22`,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 11 }}>{hasFallbackWarning ? 'WARN' : 'LLM'}</span>
        <span style={{
          fontFamily: 'var(--font-pixel)',
          fontSize: 5,
          color: hasFallbackWarning ? '#facc15' : color,
          letterSpacing: '0.08em',
        }}>
          {primary}
        </span>
      </button>

      {open && (
        <div style={{
          position: 'absolute',
          top: 'calc(100% + 8px)',
          right: 0,
          width: 280,
          background: '#0a0a0a',
          border: '1px solid #1f2937',
          borderTop: '3px solid #3b82f6',
          borderRadius: 6,
          padding: 12,
          zIndex: 120,
          boxShadow: '0 12px 24px rgba(0,0,0,0.5)',
        }}>
          <div style={{ fontFamily: 'var(--font-pixel)', fontSize: 6, color: '#60a5fa', marginBottom: 8 }}>
            LLM STATUS
          </div>

          {(status?.available_llms || []).length === 0 ? (
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: '#9ca3af' }}>
              {status?.startup_error || 'Nenhuma LLM detectada'}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {status.available_llms.map((llm) => {
                const active = llm === status.primary_llm;
                return (
                  <div key={llm} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    gap: 8,
                    padding: '4px 6px',
                    borderRadius: 4,
                    background: active ? `${badgeColor(llm)}18` : 'rgba(255,255,255,0.03)',
                    border: `1px solid ${active ? `${badgeColor(llm)}66` : 'rgba(255,255,255,0.06)'}`,
                  }}>
                    <span style={{
                      fontFamily: 'var(--font-mono)',
                      fontSize: 11,
                      color: active ? badgeColor(llm) : '#d1d5db',
                      fontWeight: active ? 700 : 400,
                    }}>
                      {llm}
                    </span>
                    <span style={{ fontFamily: 'var(--font-pixel)', fontSize: 4.5, color: '#9ca3af' }}>
                      {status.calls_by_llm?.[llm] || 0} calls
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {status?.last_fallback && (
            <div style={{
              marginTop: 10,
              paddingTop: 8,
              borderTop: '1px solid rgba(255,255,255,0.08)',
              fontFamily: 'var(--font-mono)',
              fontSize: 10,
              color: '#facc15',
            }}>
              fallback: {status.last_fallback.from} {'->'} {status.last_fallback.to}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
