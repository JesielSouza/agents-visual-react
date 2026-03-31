import AgentDot from './AgentDot';

export const ZONE_COLORS = {
  Engineering:    '#3b82f6',
  Quality:        '#f59e0b',
  'People Ops':   '#ec4899',
  Operations:     '#22c55e',
  Communications:'#8b5cf6',
  Flex:          '#14b8a6',
};

// Zone tile textures (repeating 8×8 pixel grid)
const ZONE_TILES = {
  Engineering: `
    repeating-linear-gradient(
      90deg,
      #1e3a5f 0px, #1e3a5f 3px,
      #2d5a87 3px, #2d5a87 4px,
      #1e3a5f 4px, #1e3a5f 8px
    )
  `,
  Quality: `
    repeating-linear-gradient(
      45deg,
      #5a3a00 0px, #5a3a00 3px,
      #7a5a10 3px, #7a5a10 5px,
      #5a3a00 5px, #5a3a00 8px
    )
  `,
  'People Ops': `
    repeating-radial-gradient(
      circle at 4px 4px,
      #3d1a2a 0px, #3d1a2a 3px,
      #5a2a40 3px, #5a2a40 8px
    )
  `,
  Operations: `
    repeating-linear-gradient(
      0deg,
      #14532d 0px, #14532d 3px,
      #166534 3px, #166534 4px,
      #14532d 4px, #14532d 8px
    )
  `,
  Communications: `
    repeating-linear-gradient(
      135deg,
      #2d1a5a 0px, #2d1a5a 3px,
      #4a2a87 3px, #4a2a87 5px,
      #2d1a5a 5px, #2d1a5a 8px
    )
  `,
  Flex: `
    repeating-linear-gradient(
      180deg,
      #0d4a4a 0px, #0d4a4a 3px,
      #146b6b 3px, #146b6b 5px,
      #0d4a4a 5px, #0d4a4a 8px
    )
  `,
};

// Zone icons (simple pixel-art-style SVG paths)
const ZONE_ICONS = {
  Engineering:    'M10 2H6a2 2 0 00-2 2v4a2 2 0 002 2h4a2 2 0 002-2V4a2 2 0 00-2-2zm0 8H6V6h4v4z', // wrench-ish
  Quality:        'M10 4a6 6 0 100 12 6 6 0 000-12zm0 2a4 4 0 110 8 4 4 0 010-8zm0 2l3 3',
  'People Ops':   'M8 10a2 2 0 100-4 2 2 0 000 4zm-1-5a4 4 0 014 4v1h1a1 1 0 011 1v3a1 1 0 01-1 1H4a1 1 0 01-1-1v-3a1 1 0 011-1h1v-1a4 4 0 014-4z',
  Operations:     'M10 2H6l-2 4h3v6H5l2 4h3v-6h3v6h2l2-4h-2V6h3l-2-4h-4z',
  Communications:'M10 6a4 4 0 014 4v4a4 4 0 01-4 4H6a4 4 0 01-4-4v-4a4 4 0 014-4h4m0-2H6a6 6 0 00-6 6v4a6 6 0 006 6h4a6 6 0 006-6v-4a6 6 0 00-6-6z',
  Flex:           'M4 10h4v4H4v-4zm6-6h4v4h-4V4zm-6 6h4v4H4v-4zm6 6h4v4h-4v-4z',
};

export const ZONE_DEFS = [
  { id: 'Engineering',    label: 'Engineering',    color: '#3b82f6', ga: 'eng' },
  { id: 'Quality',         label: 'QA',             color: '#f59e0b', ga: 'qa' },
  { id: 'People Ops',      label: 'People Ops',     color: '#ec4899', ga: 'pop' },
  { id: 'Operations',      label: 'Work',           color: '#22c55e', ga: 'ops' },
  { id: 'Communications',  label: 'Social',         color: '#8b5cf6', ga: 'com' },
  { id: 'Flex',           label: 'Flex',           color: '#14b8a6', ga: 'flex' },
];

const MEETING_H = 130;

function ZoneLabel({ label, color, icon }) {
  return (
    <div style={{
      position: 'absolute', top: 8, left: 8, zIndex: 5,
      display: 'flex', alignItems: 'center', gap: 5,
      background: `${color}18`,
      border: `1px solid ${color}50`,
      borderRadius: 3,
      padding: '3px 6px',
    }}>
      <svg width="8" height="8" viewBox="0 0 16 16" fill={color} style={{ flexShrink: 0 }}>
        <path d={ZONE_ICONS[label] || ZONE_ICONS.Communications} />
      </svg>
      <span style={{
        fontFamily: 'var(--font-pixel)',
        fontSize: 5, letterSpacing: '0.1em',
        color: `${color}bb`,
        textTransform: 'uppercase',
      }}>
        {label}
      </span>
    </div>
  );
}

export default function ZoneMap({ agents, inMeeting, agentPositions }) {
  return (
    <div style={{
      display: 'grid',
      width: '100%', height: '100%',
      gridTemplateColumns: '1fr 1fr 1fr',
      gridTemplateRows: `1fr ${MEETING_H}px 1fr`,
      gridTemplateAreas: `"eng qa pop" "meet meet meet" "ops com flex"`,
      gap: 6, padding: 10,
      background: '#0d1117',
    }}>
      {ZONE_DEFS.map((z) => {
        const zoneAgents = agents.filter((a) => !inMeeting[a.id] && a.zone === z.id);
        return (
          <div key={z.id} style={{
            gridArea: z.ga,
            position: 'relative',
            background: ZONE_TILES[z.id] || '#0a0a0a',
            border: `2px solid ${z.color}55`,
            borderRadius: 4,
            overflow: 'hidden',
          }}>
            {/* Corner decorations */}
            {[
              { top: -1, left: -1 },
              { top: -1, right: -1 },
              { bottom: -1, left: -1 },
              { bottom: -1, right: -1 },
            ].map((pos, i) => (
              <div key={i} style={{
                position: 'absolute',
                width: 6, height: 6,
                background: `${z.color}60`,
                borderRadius: 1,
                ...pos,
              }} />
            ))}

            <ZoneLabel label={z.label} color={z.color} />

            {zoneAgents.map((a) => {
              const pos = agentPositions.get(a.id) || { x: 50, y: 50 };
              return (
                <AgentDot key={a.id} agent={a} inMeeting={false}
                  style={{ left: `${pos.x}%`, top: `${pos.y}%`, isMoving: !!pos.isMoving }} />
              );
            })}
          </div>
        );
      })}

      {/* Meeting row */}
      <div style={{
        gridArea: 'meet',
        position: 'relative',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        background: `
          repeating-linear-gradient(
            45deg,
            #0f0a1a 0px, #0f0a1a 4px,
            #130d22 4px, #130d22 8px
          )
        `,
        border: `2px solid rgba(139,92,246,0.25)`,
        borderRadius: 4,
      }}>
        {/* Label */}
        <div style={{
          position: 'absolute', top: 6,
          display: 'flex', alignItems: 'center', gap: 5,
          background: 'rgba(139,92,246,0.15)',
          border: '1px solid rgba(139,92,246,0.4)',
          borderRadius: 3, padding: '2px 8px',
        }}>
          {/* People icon */}
          <svg width="8" height="8" viewBox="0 0 16 16" fill="rgba(139,92,246,0.8)">
            <path d="M8 8a3 3 0 100-6 3 3 0 000 6zm-4 1a4 4 0 018 0v2H4v-2z"/>
          </svg>
          <span style={{
            fontFamily: 'var(--font-pixel)',
            fontSize: 5, letterSpacing: '0.2em',
            color: 'rgba(139,92,246,0.7)',
          }}>
            SALA DE REUNIAO
          </span>
        </div>

        {/* Table — pixel wood */}
        <div style={{
          width: 200, height: 80,
          background: `
            linear-gradient(
              to bottom,
              #c17f3a 0%,
              #a0622e 30%,
              #8b4f1a 70%,
              #6b3a10 100%
            )
          `,
          border: '3px solid #4a2a0a',
          borderRadius: 6,
          position: 'relative',
          marginTop: 10,
          boxShadow: '0 4px 8px rgba(0,0,0,0.5), inset 0 2px 0 rgba(255,255,255,0.1)',
        }}>
          {/* Wood grain */}
          <div style={{
            position: 'absolute', inset: 0,
            background: `repeating-linear-gradient(
              90deg,
              transparent 0px, transparent 18px,
              rgba(0,0,0,0.1) 18px, rgba(0,0,0,0.1) 20px
            )`,
            borderRadius: 3,
          }} />

          {/* Chairs */}
          {[[65,-10],[135,-10],[65,80],[135,80],[-10,40],[210,40]].map(([cx,cy],i) => (
            <div key={i} style={{
              position: 'absolute', left: cx, top: cy,
              width: 26, height: 12,
              background: '#2a2a2a',
              border: '2px solid #1a1a1a',
              borderRadius: 3,
              boxShadow: '0 2px 4px rgba(0,0,0,0.4)',
            }} />
          ))}
        </div>

        {agents.filter((a) => inMeeting[a.id]).map((a) => {
          const pos = agentPositions.get(a.id) || { x: 50, y: 50 };
          return (
            <AgentDot key={a.id} agent={a} inMeeting={true}
              style={{ left: `${pos.x}%`, top: `${pos.y}%`, isMoving: !!pos.isMoving }} />
          );
        })}
      </div>
    </div>
  );
}
