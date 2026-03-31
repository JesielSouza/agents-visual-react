import { useState, useEffect, useCallback, useRef } from 'react';
import { playSuccess, playWalk } from '../utils/pixelSounds';
import { apiUrl } from '../utils/api';
import { isAgentCeo } from '../utils/agentPersona';

const POLL_MS = 5000;
const MOVE_DURATION = 900;
const MIN_DIST = 60;
const MAX_TRIES = 12;
const ROAM_MS = 9000;
const ROAM_DELTA = 10;
const ACTIVE_ROAM_STATUSES = new Set(['running', 'waiting_review', 'idle']);

const ACTIVITY_LABELS = {
  Engineering: 'Coding',
  Quality: 'Validando',
  Operations: 'Processando',
  Communications: 'Comunicando',
  PeopleOps: 'Alocando',
  Flex: 'Espera',
  Hall: 'Circulando',
};

const DEFAULT_ACTIVITY = 'Trabalhando';

const ROOM_SLOTS = {
  Hall: [
    { x: 28, y: 73 }, { x: 39, y: 72 }, { x: 50, y: 71 }, { x: 61, y: 72 }, { x: 72, y: 73 },
    { x: 34, y: 79 }, { x: 46, y: 80 }, { x: 58, y: 80 }, { x: 70, y: 79 },
  ],
  Engineering: [
    { x: 24, y: 30 }, { x: 34, y: 30 }, { x: 62, y: 28 }, { x: 74, y: 30 },
    { x: 26, y: 62 }, { x: 40, y: 62 }, { x: 62, y: 60 }, { x: 74, y: 62 },
  ],
  Quality: [
    { x: 24, y: 30 }, { x: 34, y: 30 }, { x: 56, y: 30 }, { x: 68, y: 30 },
    { x: 40, y: 58 }, { x: 50, y: 58 }, { x: 60, y: 58 },
  ],
  'People Ops': [
    { x: 24, y: 30 }, { x: 72, y: 30 }, { x: 38, y: 60 }, { x: 50, y: 60 }, { x: 64, y: 60 },
  ],
  Operations: [
    { x: 24, y: 30 }, { x: 36, y: 30 }, { x: 60, y: 30 }, { x: 72, y: 30 },
    { x: 36, y: 60 }, { x: 50, y: 60 }, { x: 64, y: 60 },
  ],
  Communications: [
    { x: 22, y: 30 }, { x: 50, y: 32 }, { x: 78, y: 30 }, { x: 38, y: 60 }, { x: 62, y: 60 },
  ],
  Flex: [
    { x: 22, y: 30 }, { x: 48, y: 30 }, { x: 74, y: 30 }, { x: 36, y: 60 }, { x: 58, y: 60 },
  ],
};

const DESK_SLOTS = {
  Engineering: [
    { x: 62, y: 28 }, { x: 74, y: 30 }, { x: 62, y: 60 }, { x: 74, y: 62 },
  ],
  Quality: [
    { x: 24, y: 30 }, { x: 60, y: 30 }, { x: 50, y: 58 },
  ],
  'People Ops': [
    { x: 24, y: 30 }, { x: 38, y: 60 }, { x: 64, y: 60 },
  ],
  Operations: [
    { x: 24, y: 30 }, { x: 60, y: 30 }, { x: 50, y: 60 },
  ],
  Communications: [
    { x: 50, y: 32 }, { x: 38, y: 60 }, { x: 62, y: 60 },
  ],
  Flex: [
    { x: 48, y: 30 }, { x: 36, y: 60 }, { x: 58, y: 60 },
  ],
};

const MEETING_SLOTS = [
  { x: 18, y: 22 }, { x: 50, y: 12 }, { x: 82, y: 22 },
  { x: 14, y: 80 }, { x: 50, y: 88 }, { x: 86, y: 80 },
];

const ROOM_ENTRY_POINTS = {
  Hall: { x: 50, y: 72, facing: 'down' },
  Engineering: { x: 92, y: 50, facing: 'left' },
  Quality: { x: 8, y: 50, facing: 'right' },
  'People Ops': { x: 8, y: 50, facing: 'right' },
  Operations: { x: 92, y: 50, facing: 'left' },
  Communications: { x: 50, y: 8, facing: 'down' },
  Flex: { x: 8, y: 50, facing: 'right' },
  __MEETING__: { x: 50, y: 6, facing: 'down' },
};

const TEAM_ZONE_MAP = {
  Leadership: 'Hall',
  Engineering: 'Engineering',
  Operations: 'Operations',
  Communications: 'Communications',
  'People Ops': 'People Ops',
  Quality: 'Quality',
};

function resolveZone(agent) {
  const hasWork = hasAssignedWork(agent);
  if (!hasWork && ['idle', 'done'].includes(agent.status)) return 'Hall';
  if (!hasWork && ((agent.team || '').trim() === 'Leadership' || agent.id === 'ceo')) return 'Hall';
  if (agent.status === 'blocked') return 'Operations';
  if (agent.status === 'waiting_review') return 'Quality';
  if (agent.employmentStatus === 'contractor' || agent.employmentStatus === 'dynamic' || agent.origin === 'dynamic_hire') {
    return hasWork ? 'Flex' : 'Hall';
  }
  const t = (agent.team || '').trim();
  if (TEAM_ZONE_MAP[t]) return TEAM_ZONE_MAP[t];
  const r = (agent.role || '').toLowerCase();
  if (r.includes('quality') || r.includes('qa')) return 'Quality';
  if (r.includes('people ops') || r.includes('rh')) return 'People Ops';
  if (r.includes('operation') || r.includes('analise')) return 'Operations';
  if (r.includes('comunicacao')) return 'Communications';
  return hasWork ? 'Engineering' : 'Hall';
}

function hashCode(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(31, h) + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function seededRandom(seed) {
  return ((Math.sin(seed + 1) * 10000) % 1 + 1) % 1;
}

function lerp(a, b, t) { return a + (b - a) * t; }
function easeInOutQuad(t) { return t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t; }
function clamp(value, min, max) { return Math.max(min, Math.min(max, value)); }
function resolveFacing(fromX, fromY, toX, toY) {
  return Math.abs(toX - fromX) > Math.abs(toY - fromY)
    ? (toX >= fromX ? 'right' : 'left')
    : (toY >= fromY ? 'down' : 'up');
}

function getEntryPoint(zone) {
  return ROOM_ENTRY_POINTS[zone] || { x: 50, y: 10, facing: 'down' };
}

function getFixedSlots(zone) {
  return ROOM_SLOTS[zone] || [{ x: 50, y: 50 }];
}

function getDeskSlots(zone) {
  return DESK_SLOTS[zone] || getFixedSlots(zone);
}

function hasAssignedWork(agent) {
  const currentWork = agent.current_task || agent.task || agent.summary;
  if (!currentWork) return false;
  return ['running', 'waiting_review', 'blocked'].includes(agent.status);
}

function computeTargets(agents, inMeeting) {
  const byZone = {};
  agents.forEach((a) => {
    const z = inMeeting[a.id] ? '__MEETING__' : (a.zone || resolveZone(a));
    if (!byZone[z]) byZone[z] = [];
    byZone[z].push(a);
  });

  const targets = new Map();

  Object.entries(byZone).forEach(([zone, ags]) => {
    if (zone === '__MEETING__') {
      ags.forEach((a, index) => {
        const seat = MEETING_SLOTS[index % MEETING_SLOTS.length];
        targets.set(a.id, { x: seat.x, y: seat.y, isMoving: false, facing: 'down' });
      });
      return;
    }

    const used = [];

    ags.forEach((a) => {
      const seed = hashCode(a.id);
      const focusedWork = hasAssignedWork(a);
      const fixedSlots = focusedWork ? getDeskSlots(zone) : getFixedSlots(zone);
      let placed = false;

      for (let t = 0; t < MAX_TRIES; t++) {
        const s = seed + t * 97;
        const baseSlot = fixedSlots.length > 0
          ? fixedSlots[(hashCode(a.id) + t) % fixedSlots.length]
          : { x: 20 + seededRandom(s) * 60, y: 20 + seededRandom(s + 1) * 60 };
        const jitter = fixedSlots.length > 0 ? (focusedWork ? 1.2 : 4) : 12;
        const sx = clamp(baseSlot.x + (seededRandom(s) - 0.5) * jitter, 12, 88);
        const sy = clamp((baseSlot.y ?? (20 + seededRandom(s + 1) * 60)) + (seededRandom(s + 1) - 0.5) * jitter, 18, 82);

        const tooClose = used.some((u) => {
          const dx = (u.x - sx) * 1.4;
          const dy = u.y - sy;
          return Math.sqrt(dx * dx + dy * dy) < MIN_DIST * 0.7;
        });

        if (!tooClose) {
          targets.set(a.id, { x: sx, y: sy, isMoving: false, facing: 'down' });
          used.push({ x: sx, y: sy });
          placed = true;
          break;
        }
      }

      if (!placed) {
        const cols = Math.ceil(Math.sqrt(ags.length));
        const idx = ags.indexOf(a);
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const sx = (col + 1) / (cols + 1) * 90 + 5;
        const sy = (row + 1) / (Math.ceil(ags.length / cols) + 1) * 90 + 5;
        targets.set(a.id, { x: sx, y: sy, isMoving: false, facing: 'down' });
        used.push({ x: sx, y: sy });
      }
    });
  });

  return targets;
}

export function useAgents() {
  const [agents, setAgents] = useState([]);
  const [agentPositions, setAgentPositions] = useState(new Map());
  const [lastUpdate, setLastUpdate] = useState(null);

  // Stable refs — never cause re-renders
  const inMeetingRef = useRef({});
  const posRef = useRef(new Map());
  const agentsRef = useRef(new Map()); // id -> agent for O(1) lookup
  const animRef = useRef(new Map());
  const rafRef = useRef(null);
  const prevZonesRef = useRef({});
  const roamTickRef = useRef(0);

  // ─── RAF loop ──────────────────────────────
  const startRaf = useCallback(() => {
    if (rafRef.current !== null) return;
    rafRef.current = requestAnimationFrame(function tick() {
      const now = Date.now();
      let dirty = false;

      animRef.current.forEach(function(anim, id) {
        var fromX = anim.fromX;
        var fromY = anim.fromY;
        var toX = anim.toX;
        var toY = anim.toY;

        if (fromX == null || fromY == null || toX == null || toY == null) {
          console.warn('[useAgents] Skipping anim with null pos for', id);
          animRef.current.delete(id);
          return;
        }

        var elapsed = now - anim.startTime;
        var t = Math.min(1, elapsed / MOVE_DURATION);
        var eased = easeInOutQuad(t);

        var x = lerp(fromX, toX, eased);
        var y = lerp(fromY, toY, eased);

        var pos = posRef.current.get(id);
        if (!pos) {
          animRef.current.delete(id);
          return;
        }

        pos.x = x;
        pos.y = y;
        pos.isMoving = t < 1;
        pos.facing = resolveFacing(fromX, fromY, toX, toY);

        if (t >= 1) {
          pos.x = toX;
          pos.y = toY;
          pos.isMoving = false;
          animRef.current.delete(id);
        }

        dirty = true;
      });

      if (dirty) {
        setAgentPositions(new Map(posRef.current));
      }

      if (animRef.current.size > 0) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        rafRef.current = null;
      }
    });
  }, []);

  // ─── Start a single movement ─────────────
  // Uses refs only — no state dependency
  function startMove(id, fromX, fromY, toX, toY) {
    if (fromX == null || fromY == null || toX == null || toY == null) {
      console.warn('[useAgents] startMove null for', id, { fromX, fromY, toX, toY });
      return;
    }

    var pos = posRef.current.get(id);
    if (pos) {
      pos.x = fromX;
      pos.y = fromY;
      pos.targetX = toX;
      pos.targetY = toY;
      pos.isMoving = true;
      pos.facing = resolveFacing(fromX, fromY, toX, toY);
    }

    animRef.current.set(id, {
      fromX: fromX, fromY: fromY, toX: toX, toY: toY,
      startTime: Date.now(),
    });

    posRef.current.set(id, pos || {
      x: fromX,
      y: fromY,
      targetX: toX,
      targetY: toY,
      isMoving: true,
      facing: resolveFacing(fromX, fromY, toX, toY),
    });
    setAgentPositions(new Map(posRef.current));
    startRaf();
  }

  const roamAgents = useCallback(function() {
    if (agentsRef.current.size === 0) return;

    roamTickRef.current += 1;

    agentsRef.current.forEach(function(agent, id) {
      if (inMeetingRef.current[id]) return;
      if (!ACTIVE_ROAM_STATUSES.has(agent.status)) return;

      var current = posRef.current.get(id);
      if (!current || current.isMoving || animRef.current.has(id)) return;

      var seed = hashCode(id) + roamTickRef.current * 37;
      var dx = (seededRandom(seed) - 0.5) * ROAM_DELTA * 2;
      var dy = (seededRandom(seed + 1) - 0.5) * ROAM_DELTA * 2;
      var zoneSlots = getFixedSlots(agent.zone);
      var homeSlot = zoneSlots[hashCode(id) % zoneSlots.length] || { x: 50, y: 50 };
      var nextX = clamp(homeSlot.x + dx, 12, 88);
      var nextY = clamp(homeSlot.y + dy, 18, 82);

      if (Math.abs(nextX - current.x) < 2 && Math.abs(nextY - current.y) < 2) return;

      playWalk({ volume: 0.08, category: 'movement' });
      startMove(id, current.x, current.y, nextX, nextY);
    });
  }, [startRaf]);

  // ─── Fetch agents ─────────────────────────
  const fetchAgents = useCallback(async function() {
    try {
      var res = await fetch(apiUrl('/api/agents/status?t=' + Date.now()), {
        headers: { Accept: 'application/json' },
      });
      if (!res.ok) return;
      var data = await res.json();
      var incoming = Array.isArray(data) ? data : (data.agents || []);

      var nextAgents = incoming.map(function(a) {
        return Object.assign({}, a, {
          zone: resolveZone(a),
          activity: {
            label: ACTIVITY_LABELS[resolveZone(a)] || DEFAULT_ACTIVITY,
            progress: Math.random(),
          },
        });
      });

      // Update agentsRef for O(1) lookup
      var nextAgentsMap = new Map();
      nextAgents.forEach(function(a) { nextAgentsMap.set(a.id, a); });
      agentsRef.current = nextAgentsMap;

      var newTargets = computeTargets(nextAgents, inMeetingRef.current);
      var nextPositions = new Map();
      var now = Date.now();

      nextAgents.forEach(function(a) {
        var prevPos = posRef.current.get(a.id);
        var newTarget = newTargets.get(a.id);
        if (!newTarget) return;

        var prevZone = prevZonesRef.current[a.id];
        var currentZone = inMeetingRef.current[a.id] ? '__MEETING__' : a.zone;

        if (prevPos && prevZone !== undefined && prevZone !== currentZone) {
          // Zone changed — enter from the target room doorway for a clearer sense of movement.
          var entry = getEntryPoint(currentZone);
          nextPositions.set(a.id, {
            x: entry.x, y: entry.y,
            targetX: newTarget.x, targetY: newTarget.y,
            isMoving: true,
            facing: entry.facing,
          });
          playWalk({ volume: 0.2, category: 'movement' });
          if (isAgentCeo(a)) {
            playSuccess({ volume: 0.4, category: 'notifications', from: 460, to: 920 });
          }
          startMove(a.id, entry.x, entry.y, newTarget.x, newTarget.y);
        } else if (
          prevPos &&
          hasAssignedWork(a) &&
          (
            Math.abs((prevPos.targetX ?? prevPos.x) - newTarget.x) > 2 ||
            Math.abs((prevPos.targetY ?? prevPos.y) - newTarget.y) > 2
          )
        ) {
          nextPositions.set(a.id, {
            x: prevPos.x, y: prevPos.y,
            targetX: newTarget.x, targetY: newTarget.y,
            isMoving: true,
            facing: resolveFacing(prevPos.x, prevPos.y, newTarget.x, newTarget.y),
          });
          playWalk({ volume: 0.14, category: 'movement' });
          startMove(a.id, prevPos.x, prevPos.y, newTarget.x, newTarget.y);
        } else if (prevPos) {
          nextPositions.set(a.id, {
            x: prevPos.x, y: prevPos.y,
            targetX: newTarget.x, targetY: newTarget.y,
            isMoving: prevPos.isMoving,
            facing: prevPos.facing || newTarget.facing || 'down',
          });
        } else {
          nextPositions.set(a.id, {
            x: newTarget.x,
            y: newTarget.y,
            isMoving: false,
            facing: newTarget.facing || 'down',
          });
        }

        prevZonesRef.current[a.id] = currentZone;
      });

      // Remove stale
      posRef.current = nextPositions;
      setAgentPositions(new Map(nextPositions));
      setAgents(nextAgents);
      setLastUpdate(new Date());
    } catch (e) {
      // silently fail
    }
  }, [startRaf]); // startRaf is stable via useCallback

  // ─── Cleanup ────────────────────────────────
  useEffect(function() {
    return function() {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, []);

  // ─── Poll ────────────────────────────────
  useEffect(function() {
    fetchAgents();
    var id = setInterval(fetchAgents, POLL_MS);
    return function() { clearInterval(id); };
  }, [fetchAgents]);

  useEffect(function() {
    var id = setInterval(roamAgents, ROAM_MS);
    return function() { clearInterval(id); };
  }, [roamAgents]);

  // ─── Sync meeting state ──────────────────
  // Wrapped in useCallback so it's stable — reads agents from agentsRef
  var updateInMeeting = useCallback(function(im) {
    inMeetingRef.current = im;

    // Compute meeting targets
    var meetingIds = Object.keys(im);
    var meetingAgents = meetingIds.map(function(id) { return { id: id }; });
    var meetTargets = computeTargets(meetingAgents, im);
    var now = Date.now();

    // Build the next positions map
    var next = new Map(posRef.current);

    // Agents entering meeting
    meetingIds.forEach(function(id) {
      var target = meetTargets.get(id);
      if (!target) return;
      var entry = getEntryPoint('__MEETING__');
      var startX = entry.x;
      var startY = entry.y;
      next.set(id, {
        x: startX, y: startY,
        targetX: target.x, targetY: target.y,
        isMoving: true,
        facing: entry.facing,
      });
      // Register animation directly (no setState inside setState)
      animRef.current.set(id, {
        fromX: startX, fromY: startY,
        toX: target.x, toY: target.y,
        startTime: now,
      });
      posRef.current.set(id, next.get(id));
    });

    // Agents leaving meeting — use agentsRef for lookup
    posRef.current.forEach(function(pos, id) {
      if (!im[id]) {
        // Was in meeting, now leaving
        var ag = agentsRef.current.get(id);
        if (ag) {
          var slots = getFixedSlots(ag.zone);
          var slot = slots[hashCode(id) % slots.length];
          var roomEntry = getEntryPoint(ag.zone);
          next.set(id, {
            x: roomEntry.x, y: roomEntry.y,
            targetX: slot.x, targetY: slot.y,
            isMoving: true,
            facing: roomEntry.facing,
          });
          animRef.current.set(id, {
            fromX: roomEntry.x, fromY: roomEntry.y,
            toX: slot.x, toY: slot.y,
            startTime: now,
          });
          posRef.current.set(id, next.get(id));
        }
      }
    });

    // Single state update — no nested setState
    setAgentPositions(new Map(next));

    // Ensure RAF is running
    if (animRef.current.size > 0) startRaf();
  }, [startRaf]);

  return { agents: agents, agentPositions: agentPositions, lastUpdate: lastUpdate, updateInMeeting: updateInMeeting };
}
