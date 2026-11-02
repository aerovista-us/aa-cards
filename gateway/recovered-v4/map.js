const TAG_COLORS = {
  veil: '#1c3559',
  clerks: '#2f2b59',
  archive: '#1f4b3d',
  market: '#5a4120',
  hazard: '#5a2727',
  rest: '#1c4a54',
  worksite: '#5a4a20',
  void: '#050b14',
};

const TAG_GLOW = {
  veil: 'rgba(129, 196, 255, 0.35)',
  clerks: 'rgba(175, 152, 255, 0.28)',
  archive: 'rgba(129, 255, 206, 0.26)',
  market: 'rgba(255, 197, 132, 0.26)',
  hazard: 'rgba(255, 128, 128, 0.28)',
  rest: 'rgba(132, 232, 255, 0.24)',
  worksite: 'rgba(255, 215, 130, 0.24)',
  void: 'rgba(42, 66, 92, 0.24)',
};

const MARKER_STYLES = {
  desk: { stroke: [255, 207, 125], fill: [255, 207, 125], shape: 'diamond' },
  side: { stroke: [140, 245, 159], fill: [140, 245, 159], shape: 'document' },
  npc: { stroke: [184, 163, 255], fill: [184, 163, 255], shape: 'speech' },
  echo: { stroke: [126, 231, 255], fill: [126, 231, 255], shape: 'echo' },
  intel: { stroke: [178, 218, 252], fill: [178, 218, 252], shape: 'eye' },
  rest: { stroke: [140, 245, 159], fill: [140, 245, 159], shape: 'circle' },
  archive: { stroke: [129, 255, 206], fill: [129, 255, 206], shape: 'archive' },
  market: { stroke: [255, 197, 132], fill: [255, 197, 132], shape: 'crate' },
  thread: { stroke: [126, 231, 255], fill: [126, 231, 255], shape: 'document' },
};

const CHARACTER_MARKER_STYLES = {
  billy: { stroke: [104, 226, 255], fill: [104, 226, 255], label: 'B' },
  caseworker: { stroke: [255, 207, 125], fill: [255, 207, 125], label: 'C' },
  jinx: { stroke: [140, 245, 159], fill: [140, 245, 159], label: 'J' },
  edgar: { stroke: [190, 174, 255], fill: [190, 174, 255], label: 'E' },
  nyx: { stroke: [255, 112, 112], fill: [255, 112, 112], label: 'N' },
  nettie: { stroke: [126, 231, 255], fill: [126, 231, 255], label: 'T' },
  mara: { stroke: [178, 218, 252], fill: [178, 218, 252], label: 'M' },
  overseer: { stroke: [255, 70, 70], fill: [255, 70, 70], label: 'O' },
};

function rgba(rgb, alpha) {
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`;
}

export class MapSystem {
  constructor(state, canvas) {
    this.stateRef = state;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.grid = [];
    this.w = 10;
    this.h = 10;
    this.tagPool = ['veil', 'clerks', 'archive', 'market', 'hazard', 'rest'];
    this.spawnSystem = null;
    this.animHandle = null;
    this.worldProfile = { shape: 'grid', w: this.w, h: this.h, theme: '' };
    this.taskMarkers = [];
    this.prerequisiteTarget = null;
    this.movementHintsEnabled = false;
    this.hoveredTile = null;
  }

  attachSpawn(spawn) { this.spawnSystem = spawn; }

  setTagPool(tagPool) {
    if (Array.isArray(tagPool) && tagPool.length > 0) {
      this.tagPool = tagPool.slice();
    }
  }

  setWorldProfile(profile = {}) {
    this.worldProfile = {
      shape: profile.shape || 'grid',
      w: Number(profile.w || this.w),
      h: Number(profile.h || this.h),
      theme: profile.theme || this.worldProfile.theme || '',
    };
    this.w = this.worldProfile.w;
    this.h = this.worldProfile.h;
    this.ensureGrid();
    this.ensureValidPlayerPosition();
  }

  setTaskMarkers(markers = []) {
    this.taskMarkers = Array.isArray(markers) ? markers.slice(0, 24) : [];
  }

  setPrerequisiteTarget(target = null) {
    if (!target || !Number.isFinite(Number(target.x)) || !Number.isFinite(Number(target.y))) {
      this.prerequisiteTarget = null;
      return;
    }
    this.prerequisiteTarget = { x: Number(target.x), y: Number(target.y) };
  }

  setMovementHintsEnabled(enabled) {
    this.movementHintsEnabled = !!enabled;
  }

  setHoveredTile(tile = null) {
    if (!tile || !Number.isFinite(Number(tile.x)) || !Number.isFinite(Number(tile.y))) {
      this.hoveredTile = null;
      return;
    }
    this.hoveredTile = { x: Number(tile.x), y: Number(tile.y) };
  }

  getCellMetrics() {
    const W = this.canvas?.width || 1;
    const H = this.canvas?.height || 1;
    const cols = this.w;
    const rows = this.h;
    return {
      cols,
      rows,
      cw: Math.floor(W / cols),
      ch: Math.floor(H / rows),
    };
  }

  pointerToTile(clientX, clientY) {
    if (!this.canvas) return null;
    const rect = this.canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    const px = (clientX - rect.left) * scaleX;
    const py = (clientY - rect.top) * scaleY;
    const { cols, rows, cw, ch } = this.getCellMetrics();
    const tx = Math.floor(px / cw);
    const ty = Math.floor(py / ch);
    if (tx < 0 || ty < 0 || tx >= cols || ty >= rows) return null;
    return { x: tx, y: ty };
  }

  isAdjacentToPlayer(tx, ty) {
    const s = this.stateRef.state;
    const dx = Math.abs(Number(tx) - Number(s.pos.x));
    const dy = Math.abs(Number(ty) - Number(s.pos.y));
    return dx + dy === 1;
  }

  isReachableStep(tx, ty) {
    const s = this.stateRef.state;
    const dx = Number(tx) - Number(s.pos.x);
    const dy = Number(ty) - Number(s.pos.y);
    return this.canMove(s.pos.x, s.pos.y, dx, dy);
  }

  getReachableSteps() {
    const s = this.stateRef.state;
    const dirs = [[0, -1], [1, 0], [0, 1], [-1, 0]];
    const steps = [];
    for (const [dx, dy] of dirs) {
      const x = s.pos.x + dx;
      const y = s.pos.y + dy;
      if (this.canMove(s.pos.x, s.pos.y, dx, dy)) steps.push({ x, y });
    }
    return steps;
  }

  async load(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('Failed to load map');
    const data = await res.json();
    this.w = data.w;
    this.h = data.h;
    this.grid = data.grid;
    this.worldProfile = { shape: 'grid', w: this.w, h: this.h, theme: '' };
    this.ensureGrid();
    this.ensureValidPlayerPosition();
    const s = this.stateRef.state;
    this.tile(s.pos.x, s.pos.y).discovered = true;
  }

  ensureGrid() {
    const needed = this.w * this.h;
    if (!Array.isArray(this.grid)) this.grid = [];
    if (this.grid.length !== needed) {
      const next = new Array(needed);
      for (let i = 0; i < needed; i++) {
        next[i] = this.grid[i] || { tags: ['void'], discovered: false, spawns: [] };
      }
      this.grid = next;
    }
  }

  isCellEnabled(x, y) {
    if (x < 0 || y < 0 || x >= this.w || y >= this.h) return false;
    const shape = this.worldProfile.shape || 'grid';

    if (shape === 'office') {
      // Intake-office topology: central queue lanes plus side service corridors.
      const midL = Math.max(1, Math.floor(this.w / 2) - 1);
      const midR = Math.min(this.w - 2, midL + 1);
      const queueY = Math.floor(this.h / 2);

      const sideLanes = (x === 1 || x === this.w - 2) && y >= 1 && y <= this.h - 2;
      const centralSpine = (x === midL || x === midR) && y >= 1 && y <= this.h - 2;
      const intakeWindows = y === 2 && x >= Math.max(2, midL - 3) && x <= Math.min(this.w - 3, midR + 3);
      const queueBays = (y === queueY || y === queueY + 1) && x >= 1 && x <= this.w - 2;
      const archiveLane = y === this.h - 3 && x >= 3 && x <= this.w - 4;
      const intakeConnectors = (y === queueY - 1 || y === queueY + 2) && (x === midL - 3 || x === midR + 3);

      return sideLanes || centralSpine || intakeWindows || queueBays || archiveLane || intakeConnectors;
    }

    if (shape === 'worksite') {
      const laneY = Math.floor(this.h / 2);
      const mainLane = y === laneY && x >= 1 && x <= this.w - 2;
      const staging = (x === 1 || x === 3 || x === this.w - 2) && y >= 1 && y <= this.h - 2;
      const scaffold = (y === 1 || y === this.h - 2) && x >= 2 && x <= this.w - 3 && x % 2 === 0;
      return mainLane || staging || scaffold;
    }

    if (shape === 'corridor') {
      // Hallway-like snake corridor.
      const mx = Math.floor(this.w / 2);
      const central = Math.abs(x - mx) <= 1;
      const sidePocket = (y % 3 === 1) && (x >= 1 && x <= this.w - 2);
      return central || sidePocket;
    }

    if (shape === 'stacks') {
      // Archive stacks: alternating blocked columns.
      if (x === 0 || x === this.w - 1 || y === 0 || y === this.h - 1) return true;
      return (x % 2 === 1) || (y % 4 === 0);
    }

    if (shape === 'market') {
      // Open plaza with alley cuts.
      const cx = Math.floor(this.w / 2);
      const cy = Math.floor(this.h / 2);
      const plaza = Math.abs(x - cx) <= 3 && Math.abs(y - cy) <= 2;
      const alleys = (x % 3 === 0) || (y % 3 === 0);
      return plaza || alleys;
    }

    if (shape === 'meadow') {
      // Mostly open with curved edge trims.
      const cx = (this.w - 1) / 2;
      const cy = (this.h - 1) / 2;
      const dx = (x - cx) / (this.w / 2);
      const dy = (y - cy) / (this.h / 2);
      return (dx * dx + dy * dy) <= 1.06;
    }

    if (shape === 'rift') {
      // Diamond with fractures.
      const cx = Math.floor(this.w / 2);
      const cy = Math.floor(this.h / 2);
      const manhattan = Math.abs(x - cx) + Math.abs(y - cy);
      if (manhattan > Math.floor(Math.min(this.w, this.h) * 0.45)) return false;
      if ((x + y) % 5 === 0 && manhattan > 1) return false;
      return true;
    }

    if (shape === 'wild') {
      // Organic islands.
      if ((x + y) % 7 === 0 && x > 1 && y > 1 && x < this.w - 2 && y < this.h - 2) return false;
      return true;
    }

    return true;
  }

  ensureValidPlayerPosition() {
    const s = this.stateRef.state;
    const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
    s.pos.x = clamp(s.pos.x, 0, this.w - 1);
    s.pos.y = clamp(s.pos.y, 0, this.h - 1);
    if (this.isCellEnabled(s.pos.x, s.pos.y)) return;

    const cx = Math.floor(this.w / 2);
    const cy = Math.floor(this.h / 2);
    for (let r = 0; r < Math.max(this.w, this.h); r++) {
      for (let y = Math.max(0, cy - r); y <= Math.min(this.h - 1, cy + r); y++) {
        for (let x = Math.max(0, cx - r); x <= Math.min(this.w - 1, cx + r); x++) {
          if (this.isCellEnabled(x, y)) {
            s.pos.x = x;
            s.pos.y = y;
            return;
          }
        }
      }
    }
  }

  generate() {
    this.ensureGrid();
    const rand = () => this.stateRef.rand();
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const idx = y * this.w + x;
        const t = this.grid[idx] || { tags: [], discovered: false };
        const active = this.isCellEnabled(x, y);
        t.tags = [active ? this.tagPool[Math.floor(rand() * this.tagPool.length)] : 'void'];
        t.discovered = false;
        t.spawns = [];
        this.grid[idx] = t;
      }
    }
    this.ensureValidPlayerPosition();
    const s = this.stateRef.state;
    this.tile(s.pos.x, s.pos.y).discovered = true;
  }

  tile(x, y) { return this.grid[y * this.w + x]; }
  inBounds(x, y) { return this.isCellEnabled(x, y); }
  canMove(x, y, dx, dy) { return this.inBounds(x + dx, y + dy); }

  move(dx, dy) {
    const s = this.stateRef.state;
    const nx = s.pos.x + dx;
    const ny = s.pos.y + dy;
    if (!this.inBounds(nx, ny)) return false;
    s.pos.x = nx;
    s.pos.y = ny;
    this.tile(nx, ny).discovered = true;
    return true;
  }

  currentTile() {
    const s = this.stateRef.state;
    return this.tile(s.pos.x, s.pos.y);
  }

  startAnimation() {
    if (this.animHandle) return;
    const loop = () => {
      this.draw(performance.now());
      this.animHandle = requestAnimationFrame(loop);
    };
    this.animHandle = requestAnimationFrame(loop);
  }

  isOfficeIntakeWorld() {
    return this.worldProfile.shape === 'office' || this.stateRef.state.currentWorld === 'AFTERLIFE';
  }

  officeFixtureForCell(x, y) {
    const midL = Math.max(1, Math.floor(this.w / 2) - 1);
    const midR = Math.min(this.w - 2, midL + 1);
    const queueY = Math.floor(this.h / 2);

    if (x === 0 || y === 0 || x === this.w - 1 || y === this.h - 1) return 'wall';
    if (y === 1 && x >= Math.max(2, midL - 3) && x <= Math.min(this.w - 3, midR + 3) && x % 2 === 0) return 'window';
    if ((y === 3 || y === this.h - 4) && x >= 2 && x <= this.w - 3 && x % 2 === 1) return 'desk';
    if ((x === 3 || x === this.w - 4) && y >= 3 && y <= this.h - 3) return 'cabinet';
    if ((x === midL - 2 || x === midR + 2) && y >= 2 && y <= this.h - 2 && y % 2 === 0) return 'terminal';
    if ((y === queueY || y === queueY + 1) && (x === midL - 3 || x === midR + 3)) return 'queue';
    return 'wall';
  }


  officeObstacleType(x, y) {
    if (this.isCellEnabled(x, y)) return null;

    const midL = Math.max(1, Math.floor(this.w / 2) - 1);
    const midR = Math.min(this.w - 2, midL + 1);
    const queueY = Math.floor(this.h / 2);

    if (x === 0 || y === 0 || x === this.w - 1 || y === this.h - 1) return 'wall';

    if (y === 1 && x >= Math.max(2, midL - 3) && x <= Math.min(this.w - 3, midR + 3)) {
      if (x === midL || x === midR || x === midL - 1 || x === midR + 1) return 'lockedDoor';
      return 'counter';
    }

    if ((x === 3 || x === this.w - 4) && y >= 2 && y <= this.h - 3) return 'wall';

    if ((x === midL - 2 || x === midR + 2) && y >= 2 && y <= this.h - 2) return 'statGenerator';

    if ((y === 3 || y === this.h - 4) && x >= 2 && x <= this.w - 3) return 'counter';

    if ((y === queueY || y === queueY + 1) && (x === midL - 3 || x === midR + 3)) return 'lockedDoor';

    return 'wall';
  }

  buildOfficeObstacleRects() {
    const typeMap = new Array(this.h);
    for (let y = 0; y < this.h; y++) {
      typeMap[y] = new Array(this.w).fill(null);
      for (let x = 0; x < this.w; x++) {
        typeMap[y][x] = this.officeObstacleType(x, y);
      }
    }

    const visited = new Array(this.h).fill(null).map(() => new Array(this.w).fill(false));
    const rects = [];

    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        const type = typeMap[y][x];
        if (!type || visited[y][x]) continue;

        let rw = 1;
        while (x + rw < this.w && typeMap[y][x + rw] === type && !visited[y][x + rw]) rw += 1;

        let rh = 1;
        let canGrow = true;
        while (y + rh < this.h && canGrow) {
          for (let xx = x; xx < x + rw; xx++) {
            if (typeMap[y + rh][xx] !== type || visited[y + rh][xx]) {
              canGrow = false;
              break;
            }
          }
          if (canGrow) rh += 1;
        }

        for (let yy = y; yy < y + rh; yy++) {
          for (let xx = x; xx < x + rw; xx++) {
            visited[yy][xx] = true;
          }
        }

        rects.push({ x, y, w: rw, h: rh, type });
      }
    }

    return rects;
  }

  drawMergedOfficeStructure(ctx, rect, cw, ch, pulse) {
    const gap = Math.max(2, Math.floor(Math.min(cw, ch) * 0.08));
    const px = rect.x * cw + gap;
    const py = rect.y * ch + gap;
    const pw = Math.max(2, rect.w * cw - gap * 2);
    const ph = Math.max(2, rect.h * ch - gap * 2);
    const cx = px + pw * 0.5;
    const cy = py + ph * 0.5;

    ctx.save();
    ctx.lineWidth = 1.2;

    if (rect.type === 'wall') {
      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, 'rgba(14, 30, 49, 0.96)');
      g.addColorStop(1, 'rgba(7, 16, 28, 0.98)');
      ctx.fillStyle = g;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = 'rgba(113, 156, 196, 0.34)';
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

      ctx.strokeStyle = `rgba(177, 218, 252, ${0.18 + pulse * 0.1})`;
      const seamStep = Math.max(10, Math.floor(ch * 0.55));
      for (let sy = py + seamStep; sy < py + ph - 4; sy += seamStep) {
        ctx.beginPath();
        ctx.moveTo(px + 3, sy);
        ctx.lineTo(px + pw - 3, sy);
        ctx.stroke();
      }
    } else if (rect.type === 'counter') {
      const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
      g.addColorStop(0, 'rgba(28, 58, 84, 0.94)');
      g.addColorStop(1, 'rgba(16, 34, 54, 0.98)');
      ctx.fillStyle = g;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = 'rgba(132, 184, 228, 0.46)';
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

      ctx.strokeStyle = `rgba(212, 236, 255, ${0.44 + pulse * 0.16})`;
      ctx.beginPath();
      ctx.moveTo(px + 2, py + ph * 0.28);
      ctx.lineTo(px + pw - 2, py + ph * 0.28);
      ctx.moveTo(px + 2, py + ph * 0.62);
      ctx.lineTo(px + pw - 2, py + ph * 0.62);
      ctx.stroke();

      const icon = Math.min(pw, ph) * 0.24;
      ctx.fillStyle = `rgba(215, 241, 255, ${0.22 + pulse * 0.1})`;
      ctx.fillRect(cx - icon * 0.7, cy - icon * 0.25, icon * 1.4, icon * 0.5);
      ctx.strokeStyle = `rgba(226, 246, 255, ${0.5 + pulse * 0.14})`;
      ctx.strokeRect(cx - icon * 0.7, cy - icon * 0.25, icon * 1.4, icon * 0.5);
    } else if (rect.type === 'lockedDoor') {
      const g = ctx.createLinearGradient(px, py, px, py + ph);
      g.addColorStop(0, 'rgba(44, 38, 60, 0.95)');
      g.addColorStop(1, 'rgba(18, 19, 33, 0.98)');
      ctx.fillStyle = g;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = 'rgba(163, 147, 221, 0.44)';
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

      ctx.strokeStyle = `rgba(255, 182, 144, ${0.62 + pulse * 0.16})`;
      ctx.beginPath();
      ctx.moveTo(cx, py + 3);
      ctx.lineTo(cx, py + ph - 3);
      ctx.stroke();

      const lockR = Math.min(pw, ph) * 0.14;
      ctx.strokeStyle = `rgba(255, 210, 170, ${0.64 + pulse * 0.12})`;
      ctx.beginPath();
      ctx.arc(cx, cy, lockR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(cx, cy - lockR - 1.5);
      ctx.lineTo(cx, cy + lockR + 1.5);
      ctx.stroke();
    } else if (rect.type === 'statGenerator') {
      const g = ctx.createLinearGradient(px, py, px + pw, py + ph);
      g.addColorStop(0, 'rgba(20, 47, 69, 0.95)');
      g.addColorStop(1, 'rgba(8, 24, 40, 0.98)');
      ctx.fillStyle = g;
      ctx.fillRect(px, py, pw, ph);
      ctx.strokeStyle = 'rgba(126, 214, 255, 0.44)';
      ctx.strokeRect(px + 0.5, py + 0.5, pw - 1, ph - 1);

      const orbR = Math.min(pw, ph) * 0.16;
      ctx.fillStyle = `rgba(120, 229, 255, ${0.24 + pulse * 0.14})`;
      ctx.strokeStyle = `rgba(196, 247, 255, ${0.72 + pulse * 0.16})`;
      ctx.beginPath();
      ctx.arc(cx, cy, orbR, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(cx - orbR * 2.2, cy);
      ctx.lineTo(cx + orbR * 2.2, cy);
      ctx.moveTo(cx, cy - orbR * 2.2);
      ctx.lineTo(cx, cy + orbR * 2.2);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawOfficeMergedObstacles(ctx, cw, ch, pulse) {
    const rects = this.buildOfficeObstacleRects();
    for (const rect of rects) {
      this.drawMergedOfficeStructure(ctx, rect, cw, ch, pulse);
    }
  }

  blockedCoverType(x, y) {
    const shape = this.worldProfile.shape || 'grid';
    if (shape === 'office') return this.officeObstacleType(x, y) || 'wall';
    if (shape === 'worksite') return ((x + y) % 2 === 0) ? 'scaffold' : 'barrier';
    if (shape === 'corridor') return ((x + y) % 4 === 0) ? 'sealedGate' : 'hallWall';
    if (shape === 'stacks') return 'archiveShelf';
    if (shape === 'market') return ((x + y) % 2 === 0) ? 'stall' : 'crateStack';
    if (shape === 'rift') return ((x + y) % 2 === 0) ? 'riftShard' : 'fracture';
    if (shape === 'meadow') return ((x + y) % 2 === 0) ? 'boulder' : 'thicket';
    if (shape === 'wild') return ((x + y) % 2 === 0) ? 'thicket' : 'boulder';
    return 'voidWall';
  }

  blockedCoverPalette(type) {
    if (type === 'hallWall') {
      return {
        a: 'rgba(10, 24, 38, 0.95)',
        b: 'rgba(6, 14, 24, 0.98)',
        stroke: 'rgba(101, 146, 182, 0.36)',
        hatch: 'rgba(173, 216, 248, 0.15)',
        icon: 'rgba(212, 238, 255, 0.54)'
      };
    }

    if (type === 'sealedGate') {
      return {
        a: 'rgba(31, 36, 57, 0.95)',
        b: 'rgba(15, 18, 32, 0.98)',
        stroke: 'rgba(161, 145, 214, 0.44)',
        hatch: 'rgba(226, 202, 255, 0.12)',
        icon: 'rgba(255, 217, 181, 0.68)'
      };
    }

    if (type === 'archiveShelf') {
      return {
        a: 'rgba(14, 37, 43, 0.95)',
        b: 'rgba(7, 20, 25, 0.98)',
        stroke: 'rgba(121, 193, 184, 0.4)',
        hatch: 'rgba(188, 243, 224, 0.12)',
        icon: 'rgba(214, 255, 242, 0.62)'
      };
    }

    if (type === 'stall' || type === 'crateStack') {
      return {
        a: 'rgba(43, 33, 24, 0.95)',
        b: 'rgba(21, 15, 11, 0.98)',
        stroke: 'rgba(210, 160, 111, 0.42)',
        hatch: 'rgba(255, 222, 176, 0.12)',
        icon: 'rgba(255, 229, 188, 0.64)'
      };
    }

    if (type === 'scaffold' || type === 'barrier') {
      return {
        a: 'rgba(45, 37, 21, 0.95)',
        b: 'rgba(18, 15, 10, 0.98)',
        stroke: 'rgba(230, 184, 92, 0.42)',
        hatch: 'rgba(255, 219, 137, 0.13)',
        icon: 'rgba(255, 226, 156, 0.68)'
      };
    }

    if (type === 'riftShard' || type === 'fracture') {
      return {
        a: 'rgba(34, 16, 49, 0.95)',
        b: 'rgba(14, 7, 23, 0.98)',
        stroke: 'rgba(189, 137, 237, 0.44)',
        hatch: 'rgba(218, 184, 255, 0.12)',
        icon: 'rgba(241, 223, 255, 0.66)'
      };
    }

    if (type === 'boulder' || type === 'thicket') {
      return {
        a: 'rgba(16, 34, 27, 0.95)',
        b: 'rgba(8, 18, 14, 0.98)',
        stroke: 'rgba(133, 188, 145, 0.38)',
        hatch: 'rgba(206, 242, 212, 0.1)',
        icon: 'rgba(220, 252, 226, 0.62)'
      };
    }

    return {
      a: 'rgba(10, 19, 33, 0.95)',
      b: 'rgba(6, 11, 20, 0.98)',
      stroke: 'rgba(98, 130, 164, 0.34)',
      hatch: 'rgba(184, 214, 245, 0.1)',
      icon: 'rgba(212, 234, 255, 0.52)'
    };
  }

  drawBlockedCellIcon(ctx, type, cx, cy, size, pulse, iconColor) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = iconColor;
    ctx.fillStyle = iconColor;

    if (type === 'hallWall' || type === 'voidWall') {
      ctx.strokeRect(-size * 0.42, -size * 0.32, size * 0.84, size * 0.64);
      ctx.beginPath();
      ctx.moveTo(-size * 0.42, -size * 0.04);
      ctx.lineTo(size * 0.42, -size * 0.04);
      ctx.moveTo(-size * 0.42, size * 0.2);
      ctx.lineTo(size * 0.42, size * 0.2);
      ctx.moveTo(-size * 0.12, -size * 0.32);
      ctx.lineTo(-size * 0.12, -size * 0.04);
      ctx.moveTo(size * 0.16, -size * 0.04);
      ctx.lineTo(size * 0.16, size * 0.2);
      ctx.stroke();
    } else if (type === 'sealedGate') {
      ctx.strokeRect(-size * 0.36, -size * 0.38, size * 0.72, size * 0.76);
      ctx.beginPath();
      for (let bx = -2; bx <= 2; bx++) {
        const px = bx * size * 0.13;
        ctx.moveTo(px, -size * 0.32);
        ctx.lineTo(px, size * 0.32);
      }
      ctx.stroke();
      const lockR = size * 0.12;
      ctx.beginPath();
      ctx.arc(0, size * 0.06, lockR, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, size * 0.06 - lockR - 2);
      ctx.lineTo(0, size * 0.06 + lockR + 2);
      ctx.stroke();
    } else if (type === 'archiveShelf') {
      ctx.strokeRect(-size * 0.36, -size * 0.4, size * 0.72, size * 0.8);
      ctx.beginPath();
      ctx.moveTo(-size * 0.36, -size * 0.14);
      ctx.lineTo(size * 0.36, -size * 0.14);
      ctx.moveTo(-size * 0.36, size * 0.12);
      ctx.lineTo(size * 0.36, size * 0.12);
      ctx.stroke();
      ctx.fillRect(-size * 0.26, -size * 0.34, size * 0.08, size * 0.16);
      ctx.fillRect(-size * 0.08, -size * 0.34, size * 0.07, size * 0.16);
      ctx.fillRect(size * 0.1, -size * 0.34, size * 0.09, size * 0.16);
      ctx.fillRect(-size * 0.22, -size * 0.08, size * 0.07, size * 0.16);
      ctx.fillRect(-size * 0.03, -size * 0.08, size * 0.08, size * 0.16);
      ctx.fillRect(size * 0.14, -size * 0.08, size * 0.07, size * 0.16);
    } else if (type === 'stall') {
      ctx.beginPath();
      ctx.moveTo(-size * 0.42, -size * 0.08);
      ctx.lineTo(size * 0.42, -size * 0.08);
      ctx.lineTo(size * 0.3, -size * 0.3);
      ctx.lineTo(-size * 0.3, -size * 0.3);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, -size * 0.08);
      ctx.lineTo(-size * 0.3, size * 0.3);
      ctx.moveTo(size * 0.3, -size * 0.08);
      ctx.lineTo(size * 0.3, size * 0.3);
      ctx.moveTo(-size * 0.2, size * 0.3);
      ctx.lineTo(size * 0.2, size * 0.3);
      ctx.stroke();
    } else if (type === 'crateStack') {
      ctx.strokeRect(-size * 0.36, -size * 0.06, size * 0.34, size * 0.34);
      ctx.strokeRect(size * 0.02, -size * 0.26, size * 0.34, size * 0.34);
      ctx.beginPath();
      ctx.moveTo(-size * 0.28, size * 0.02);
      ctx.lineTo(-size * 0.1, size * 0.2);
      ctx.moveTo(size * 0.1, -size * 0.18);
      ctx.lineTo(size * 0.28, 0);
      ctx.stroke();
    } else if (type === 'scaffold') {
      ctx.beginPath();
      ctx.moveTo(-size * 0.42, size * 0.36);
      ctx.lineTo(-size * 0.1, -size * 0.38);
      ctx.lineTo(size * 0.22, size * 0.36);
      ctx.moveTo(size * 0.42, size * 0.36);
      ctx.lineTo(size * 0.1, -size * 0.38);
      ctx.lineTo(-size * 0.22, size * 0.36);
      ctx.moveTo(-size * 0.34, -size * 0.02);
      ctx.lineTo(size * 0.34, -size * 0.02);
      ctx.moveTo(-size * 0.26, size * 0.18);
      ctx.lineTo(size * 0.26, size * 0.18);
      ctx.stroke();
    } else if (type === 'barrier') {
      ctx.strokeRect(-size * 0.44, -size * 0.14, size * 0.88, size * 0.28);
      ctx.beginPath();
      for (let bx = -3; bx <= 2; bx++) {
        const px = bx * size * 0.16;
        ctx.moveTo(px, size * 0.14);
        ctx.lineTo(px + size * 0.22, -size * 0.14);
      }
      ctx.moveTo(-size * 0.32, size * 0.14);
      ctx.lineTo(-size * 0.32, size * 0.42);
      ctx.moveTo(size * 0.32, size * 0.14);
      ctx.lineTo(size * 0.32, size * 0.42);
      ctx.stroke();
    } else if (type === 'riftShard') {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.46);
      ctx.lineTo(size * 0.32, -size * 0.08);
      ctx.lineTo(size * 0.14, size * 0.44);
      ctx.lineTo(-size * 0.2, size * 0.2);
      ctx.lineTo(-size * 0.34, -size * 0.2);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.08, -size * 0.18);
      ctx.lineTo(size * 0.1, size * 0.14);
      ctx.stroke();
    } else if (type === 'fracture') {
      ctx.beginPath();
      ctx.moveTo(-size * 0.36, -size * 0.26);
      ctx.lineTo(-size * 0.08, -size * 0.06);
      ctx.lineTo(-size * 0.2, size * 0.06);
      ctx.lineTo(size * 0.16, size * 0.26);
      ctx.lineTo(size * 0.02, size * 0.42);
      ctx.lineTo(size * 0.36, size * 0.48);
      ctx.stroke();
    } else if (type === 'boulder') {
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.38, size * 0.28, 0.25, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.14, -size * 0.02);
      ctx.lineTo(size * 0.08, size * 0.04);
      ctx.stroke();
    } else if (type === 'thicket') {
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, size * 0.28);
      ctx.lineTo(-size * 0.06, -size * 0.22);
      ctx.moveTo(0, size * 0.3);
      ctx.lineTo(0.02 * size, -size * 0.3);
      ctx.moveTo(size * 0.2, size * 0.26);
      ctx.lineTo(size * 0.08, -size * 0.18);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.06, -size * 0.22);
      ctx.lineTo(-size * 0.22, -size * 0.3);
      ctx.moveTo(0.02 * size, -size * 0.3);
      ctx.lineTo(size * 0.16, -size * 0.4);
      ctx.moveTo(size * 0.08, -size * 0.18);
      ctx.lineTo(size * 0.24, -size * 0.24);
      ctx.stroke();
    } else {
      const r = size * (0.24 + pulse * 0.04);
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-r, 0);
      ctx.lineTo(r, 0);
      ctx.moveTo(0, -r);
      ctx.lineTo(0, r);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawBlockedCellCover(ctx, x, y, ix, iy, iw, ih, pulse) {
    const type = this.blockedCoverType(x, y);
    const palette = this.blockedCoverPalette(type);

    const g = ctx.createLinearGradient(ix, iy, ix + iw, iy + ih);
    g.addColorStop(0, palette.a);
    g.addColorStop(1, palette.b);
    ctx.fillStyle = g;
    ctx.fillRect(ix, iy, iw, ih);

    ctx.strokeStyle = palette.stroke;
    ctx.lineWidth = 1;
    ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);

    ctx.strokeStyle = palette.hatch;
    ctx.lineWidth = 1;
    const step = Math.max(5, Math.floor(Math.min(iw, ih) * 0.32));
    for (let d = -ih; d < iw + ih; d += step) {
      ctx.beginPath();
      ctx.moveTo(ix + d, iy + ih);
      ctx.lineTo(ix + d + ih, iy);
      ctx.stroke();
    }

    this.drawBlockedCellIcon(ctx, type, ix + iw * 0.5, iy + ih * 0.5, Math.min(iw, ih) * 0.62, pulse, palette.icon);
  }
  drawOfficeFixtureGlyph(ctx, fixture, cx, cy, size, pulse, alpha = 1) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha *= alpha;
    ctx.lineWidth = 1.1;
    ctx.strokeStyle = `rgba(214, 236, 255, ${0.38 + pulse * 0.16})`;
    ctx.fillStyle = `rgba(187, 224, 255, ${0.12 + pulse * 0.1})`;

    if (fixture === 'desk') {
      ctx.fillRect(-size * 0.42, -size * 0.16, size * 0.84, size * 0.34);
      ctx.strokeRect(-size * 0.42, -size * 0.16, size * 0.84, size * 0.34);
      ctx.beginPath();
      ctx.moveTo(-size * 0.28, size * 0.18);
      ctx.lineTo(-size * 0.28, size * 0.42);
      ctx.moveTo(size * 0.28, size * 0.18);
      ctx.lineTo(size * 0.28, size * 0.42);
      ctx.stroke();
    } else if (fixture === 'cabinet') {
      ctx.strokeRect(-size * 0.28, -size * 0.44, size * 0.56, size * 0.88);
      ctx.beginPath();
      ctx.moveTo(-size * 0.28, -size * 0.13);
      ctx.lineTo(size * 0.28, -size * 0.13);
      ctx.moveTo(-size * 0.28, size * 0.17);
      ctx.lineTo(size * 0.28, size * 0.17);
      ctx.stroke();
    } else if (fixture === 'terminal') {
      ctx.strokeRect(-size * 0.3, -size * 0.28, size * 0.6, size * 0.4);
      ctx.beginPath();
      ctx.moveTo(-size * 0.12, size * 0.14);
      ctx.lineTo(size * 0.12, size * 0.14);
      ctx.moveTo(0, size * 0.14);
      ctx.lineTo(0, size * 0.42);
      ctx.stroke();
    } else if (fixture === 'queue') {
      ctx.beginPath();
      ctx.moveTo(-size * 0.42, size * 0.16);
      ctx.lineTo(-size * 0.42, -size * 0.22);
      ctx.moveTo(size * 0.42, size * 0.16);
      ctx.lineTo(size * 0.42, -size * 0.22);
      ctx.moveTo(-size * 0.42, -size * 0.08);
      ctx.bezierCurveTo(-size * 0.2, -size * 0.22, size * 0.2, 0, size * 0.42, -size * 0.08);
      ctx.stroke();
    } else if (fixture === 'window') {
      ctx.strokeRect(-size * 0.42, -size * 0.34, size * 0.84, size * 0.68);
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.34);
      ctx.lineTo(0, size * 0.34);
      ctx.moveTo(-size * 0.42, 0);
      ctx.lineTo(size * 0.42, 0);
      ctx.stroke();
    } else {
      ctx.strokeRect(-size * 0.44, -size * 0.36, size * 0.88, size * 0.72);
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, -size * 0.1);
      ctx.lineTo(size * 0.3, -size * 0.1);
      ctx.moveTo(-size * 0.3, size * 0.1);
      ctx.lineTo(size * 0.3, size * 0.1);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawOfficeTagGlyph(ctx, tag, cx, cy, size, pulse) {
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(226, 244, 255, ${0.46 + pulse * 0.18})`;
    ctx.fillStyle = `rgba(187, 226, 255, ${0.14 + pulse * 0.1})`;

    if (tag === 'clerks') {
      ctx.strokeRect(-size * 0.45, -size * 0.16, size * 0.9, size * 0.34);
      ctx.beginPath();
      ctx.arc(0, size * 0.22, size * 0.14, 0, Math.PI * 2);
      ctx.stroke();
    } else if (tag === 'archive') {
      ctx.strokeRect(-size * 0.3, -size * 0.45, size * 0.6, size * 0.9);
      ctx.beginPath();
      ctx.moveTo(-size * 0.3, -size * 0.14);
      ctx.lineTo(size * 0.3, -size * 0.14);
      ctx.moveTo(-size * 0.3, size * 0.16);
      ctx.lineTo(size * 0.3, size * 0.16);
      ctx.stroke();
    } else if (tag === 'rest') {
      ctx.beginPath();
      ctx.rect(-size * 0.34, -size * 0.12, size * 0.68, size * 0.28);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.22, size * 0.18);
      ctx.lineTo(-size * 0.22, size * 0.42);
      ctx.moveTo(size * 0.22, size * 0.18);
      ctx.lineTo(size * 0.22, size * 0.42);
      ctx.stroke();
    } else if (tag === 'hazard') {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.52);
      ctx.lineTo(size * 0.5, size * 0.42);
      ctx.lineTo(-size * 0.5, size * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.18);
      ctx.lineTo(0, size * 0.18);
      ctx.stroke();
    } else if (tag === 'market') {
      ctx.strokeRect(-size * 0.42, -size * 0.24, size * 0.84, size * 0.5);
      ctx.beginPath();
      ctx.moveTo(-size * 0.42, -size * 0.02);
      ctx.lineTo(size * 0.42, -size * 0.02);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, size * 0.24, size * 0.09, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.5);
      ctx.lineTo(size * 0.3, 0);
      ctx.lineTo(0, size * 0.5);
      ctx.lineTo(-size * 0.3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.22, 0);
      ctx.lineTo(size * 0.22, 0);
      ctx.stroke();
    }

    ctx.restore();
  }

  drawTagGlyph(ctx, tag, cx, cy, size, pulse, world = this.stateRef.state.currentWorld) {
    if (world === 'AFTERLIFE' && this.isOfficeIntakeWorld()) {
      this.drawOfficeTagGlyph(ctx, tag, cx, cy, size, pulse);
      return;
    }

    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = 1.2;
    ctx.strokeStyle = `rgba(226, 242, 255, ${0.3 + pulse * 0.2})`;
    ctx.fillStyle = `rgba(226, 242, 255, ${0.14 + pulse * 0.08})`;

    if (world === 'EARTH_PROLOGUE' && tag === 'worksite') {
      ctx.beginPath();
      ctx.arc(0, -size * 0.05, size * 0.36, Math.PI, Math.PI * 2);
      ctx.lineTo(size * 0.42, size * 0.1);
      ctx.lineTo(-size * 0.42, size * 0.1);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.18, -size * 0.08);
      ctx.lineTo(-size * 0.18, -size * 0.34);
      ctx.moveTo(size * 0.18, -size * 0.08);
      ctx.lineTo(size * 0.18, -size * 0.34);
      ctx.stroke();
    } else if (tag === 'hazard') {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.52);
      ctx.lineTo(size * 0.5, size * 0.42);
      ctx.lineTo(-size * 0.5, size * 0.42);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (tag === 'rest') {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.4, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.17, 0, Math.PI * 2);
      ctx.fill();
    } else if (tag === 'market') {
      ctx.beginPath();
      ctx.rect(-size * 0.44, -size * 0.3, size * 0.88, size * 0.62);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.44, -size * 0.05);
      ctx.lineTo(size * 0.44, -size * 0.05);
      ctx.stroke();
    } else if (tag === 'archive') {
      ctx.beginPath();
      ctx.rect(-size * 0.42, -size * 0.42, size * 0.84, size * 0.84);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.14, -size * 0.42);
      ctx.lineTo(-size * 0.14, size * 0.42);
      ctx.moveTo(size * 0.12, -size * 0.42);
      ctx.lineTo(size * 0.12, size * 0.42);
      ctx.stroke();
    } else if (tag === 'clerks') {
      ctx.beginPath();
      ctx.rect(-size * 0.4, -size * 0.4, size * 0.8, size * 0.8);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.12);
      ctx.lineTo(size * 0.2, -size * 0.12);
      ctx.moveTo(-size * 0.2, size * 0.08);
      ctx.lineTo(size * 0.2, size * 0.08);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.5);
      ctx.lineTo(size * 0.3, 0);
      ctx.lineTo(0, size * 0.5);
      ctx.lineTo(-size * 0.3, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  drawTileCell(ctx, t, x, y, px, py, cw, ch, pulse, active) {
    const world = this.stateRef.state.currentWorld;
    const office = world === 'AFTERLIFE' && this.isOfficeIntakeWorld();
    const tag = t.tags[0];
    const gap = Math.max(2, Math.floor(Math.min(cw, ch) * 0.08));
    const ix = px + gap;
    const iy = py + gap;
    const iw = cw - gap * 2;
    const ih = ch - gap * 2;

    if (!active) {
      if (office) {
        const g = ctx.createLinearGradient(ix, iy, ix + iw, iy + ih);
        g.addColorStop(0, 'rgba(8, 18, 31, 0.86)');
        g.addColorStop(1, 'rgba(6, 13, 24, 0.92)');
        ctx.fillStyle = g;
        ctx.fillRect(ix, iy, iw, ih);
        ctx.strokeStyle = 'rgba(80, 116, 149, 0.2)';
        ctx.lineWidth = 1;
        ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
      } else {
        this.drawBlockedCellCover(ctx, x, y, ix, iy, iw, ih, pulse);
      }
      return;
    }

    if (t.discovered) {
      const fill = TAG_COLORS[tag] || '#24354f';
      ctx.fillStyle = fill;
      ctx.fillRect(ix, iy, iw, ih);

      ctx.strokeStyle = TAG_GLOW[tag] || 'rgba(123, 183, 245, 0.25)';
      ctx.lineWidth = 1.25;
      ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);

      if (office) {
        ctx.strokeStyle = `rgba(196, 227, 255, ${0.09 + pulse * 0.1})`;
        ctx.lineWidth = 1;
        for (let ry = iy + 5; ry < iy + ih - 4; ry += Math.max(6, Math.floor(ih * 0.22))) {
          ctx.beginPath();
          ctx.moveTo(ix + 3, ry);
          ctx.lineTo(ix + iw - 3, ry);
          ctx.stroke();
        }

        const fixture = this.officeFixtureForCell(x, y);
        if (fixture !== 'wall') {
          this.drawOfficeFixtureGlyph(ctx, fixture, ix + iw * 0.78, iy + ih * 0.73, Math.min(iw, ih) * 0.26, pulse, 0.64);
        }
      } else if (world === 'EARTH_PROLOGUE') {
        const beamShade = tag === 'hazard' ? 'rgba(255, 154, 112, 0.22)' : 'rgba(255, 224, 145, 0.12)';
        ctx.strokeStyle = `rgba(255, 230, 176, ${0.1 + pulse * 0.08})`;
        ctx.lineWidth = 1;
        for (let ry = iy + ih * 0.22; ry < iy + ih - 4; ry += Math.max(7, Math.floor(ih * 0.3))) {
          ctx.beginPath();
          ctx.moveTo(ix + 5, ry);
          ctx.lineTo(ix + iw - 5, ry);
          ctx.stroke();
        }
        if (tag === 'hazard') {
          ctx.fillStyle = beamShade;
          ctx.fillRect(ix + iw * 0.08, iy + ih * 0.66, iw * 0.84, ih * 0.12);
          ctx.strokeStyle = `rgba(255, 190, 120, ${0.32 + pulse * 0.1})`;
          ctx.beginPath();
          for (let hx = ix + iw * 0.14; hx < ix + iw * 0.9; hx += iw * 0.16) {
            ctx.moveTo(hx, iy + ih * 0.78);
            ctx.lineTo(hx + iw * 0.12, iy + ih * 0.66);
          }
          ctx.stroke();
        }
      } else {
        ctx.strokeStyle = `rgba(177, 223, 255, ${0.08 + pulse * 0.08})`;
        ctx.beginPath();
        ctx.moveTo(ix + 3, iy + ih - 3);
        ctx.lineTo(ix + iw - 3, iy + 3);
        ctx.stroke();
      }

      const glyphScale = office ? 0.33 : (world === 'EARTH_PROLOGUE' ? 0.3 : 0.25);
      this.drawTagGlyph(ctx, tag, ix + iw * 0.28, iy + ih * 0.3, Math.min(iw, ih) * glyphScale, pulse, world);
    } else {
      ctx.fillStyle = office ? '#0a1626' : '#07101c';
      ctx.fillRect(ix, iy, iw, ih);
      ctx.strokeStyle = office ? 'rgba(95, 132, 165, 0.4)' : 'rgba(74, 102, 134, 0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(ix + 0.5, iy + 0.5, iw - 1, ih - 1);
      if (office) {
        ctx.strokeStyle = 'rgba(178, 214, 246, 0.22)';
        ctx.beginPath();
        ctx.moveTo(ix + iw * 0.2, iy + ih * 0.5);
        ctx.lineTo(ix + iw * 0.8, iy + ih * 0.5);
        ctx.stroke();
      }
    }
  }

  drawLootMarker(ctx, x, y, pulse) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#96f38a';
    ctx.strokeStyle = '#dcffdd';
    ctx.lineWidth = 1.1;
    const r = 4.2 + pulse * 1.3;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawEncounterMarker(ctx, x, y, pulse) {
    ctx.save();
    ctx.translate(x, y);
    ctx.fillStyle = '#ff9a9a';
    ctx.strokeStyle = '#ffd7d7';
    ctx.lineWidth = 1.1;
    const r = 4.4 + pulse * 1.2;
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(r, r * 0.82);
    ctx.lineTo(-r, r * 0.82);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }

  drawSpawnMarkers(ctx, cw, ch, cols, rows, pulse) {
    if (!this.spawnSystem) return;
    ctx.save();
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        if (!this.isCellEnabled(x, y)) continue;
        const t = this.tile(x, y);
        if (!t.discovered) continue;
        const sp = this.spawnSystem.visibleSpawnsAt(x, y);
        if (sp.loot <= 0 && sp.encounter <= 0) continue;

        const px = x * cw;
        const py = y * ch;
        if (sp.loot > 0) this.drawLootMarker(ctx, px + cw - 11, py + 11, pulse);
        if (sp.encounter > 0) this.drawEncounterMarker(ctx, px + cw - 11, py + ch - 11, pulse);
      }
    }
    ctx.restore();
  }

  drawMoveHints(ctx, cw, ch, pulse) {
    if (!this.movementHintsEnabled) return;
    const steps = this.getReachableSteps();
    const hover = this.hoveredTile;
    ctx.save();
    for (const step of steps) {
      const px = step.x * cw;
      const py = step.y * ch;
      const hovered = hover && hover.x === step.x && hover.y === step.y;
      ctx.fillStyle = hovered
        ? `rgba(126, 231, 255, ${0.22 + pulse * 0.1})`
        : `rgba(126, 231, 255, ${0.1 + pulse * 0.06})`;
      ctx.fillRect(px + 4, py + 4, cw - 8, ch - 8);
      ctx.strokeStyle = hovered
        ? `rgba(180, 245, 255, ${0.72 + pulse * 0.18})`
        : `rgba(126, 231, 255, ${0.34 + pulse * 0.22})`;
      ctx.lineWidth = hovered ? 2.2 : 1.6;
      ctx.strokeRect(px + 3.5, py + 3.5, cw - 7, ch - 7);
      if (hovered) {
        ctx.fillStyle = `rgba(220, 248, 255, ${0.82 + pulse * 0.1})`;
        ctx.font = `700 ${Math.max(11, Math.floor(Math.min(cw, ch) * 0.34))}px Rajdhani, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText('GO', px + cw / 2, py + ch / 2);
      }
    }
    ctx.restore();
  }

  drawTaskGlyph(ctx, kind, cx, cy, size, pulse) {
    const s = size;
    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = Math.max(1.2, s * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    if (kind === 'desk') {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.62);
      ctx.lineTo(s * 0.58, 0);
      ctx.lineTo(0, s * 0.62);
      ctx.lineTo(-s * 0.58, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.24, -s * 0.1);
      ctx.lineTo(s * 0.24, -s * 0.1);
      ctx.moveTo(-s * 0.18, s * 0.12);
      ctx.lineTo(s * 0.18, s * 0.12);
      ctx.stroke();
    } else if (kind === 'npc') {
      ctx.beginPath();
      ctx.roundRect?.(-s * 0.58, -s * 0.42, s * 1.16, s * 0.78, s * 0.18);
      if (!ctx.roundRect) ctx.rect(-s * 0.58, -s * 0.42, s * 1.16, s * 0.78);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.12, s * 0.36);
      ctx.lineTo(-s * 0.28, s * 0.58);
      ctx.lineTo(s * 0.12, s * 0.36);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-s * 0.22, -s * 0.04, s * 0.045, 0, Math.PI * 2);
      ctx.arc(0, -s * 0.04, s * 0.045, 0, Math.PI * 2);
      ctx.arc(s * 0.22, -s * 0.04, s * 0.045, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'echo') {
      ctx.beginPath();
      ctx.arc(0, 0, s * (0.42 + pulse * 0.08), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.2, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-s * 0.48, 0);
      ctx.lineTo(s * 0.48, 0);
      ctx.moveTo(0, -s * 0.48);
      ctx.lineTo(0, s * 0.48);
      ctx.stroke();
    } else if (kind === 'side' || kind === 'thread') {
      ctx.beginPath();
      ctx.moveTo(-s * 0.38, -s * 0.54);
      ctx.lineTo(s * 0.2, -s * 0.54);
      ctx.lineTo(s * 0.42, -s * 0.3);
      ctx.lineTo(s * 0.42, s * 0.54);
      ctx.lineTo(-s * 0.38, s * 0.54);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(s * 0.2, -s * 0.54);
      ctx.lineTo(s * 0.2, -s * 0.3);
      ctx.lineTo(s * 0.42, -s * 0.3);
      ctx.moveTo(-s * 0.2, -s * 0.08);
      ctx.lineTo(s * 0.2, -s * 0.08);
      ctx.moveTo(-s * 0.2, s * 0.16);
      ctx.lineTo(s * 0.2, s * 0.16);
      ctx.stroke();
    } else if (kind === 'intel') {
      ctx.beginPath();
      ctx.ellipse(0, 0, s * 0.56, s * 0.34, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.15, 0, Math.PI * 2);
      ctx.fill();
    } else if (kind === 'archive') {
      ctx.strokeRect(-s * 0.44, -s * 0.44, s * 0.88, s * 0.88);
      ctx.beginPath();
      ctx.moveTo(-s * 0.14, -s * 0.44);
      ctx.lineTo(-s * 0.14, s * 0.44);
      ctx.moveTo(s * 0.16, -s * 0.44);
      ctx.lineTo(s * 0.16, s * 0.44);
      ctx.stroke();
    } else if (kind === 'market') {
      ctx.strokeRect(-s * 0.48, -s * 0.26, s * 0.96, s * 0.56);
      ctx.beginPath();
      ctx.moveTo(-s * 0.48, -s * 0.02);
      ctx.lineTo(s * 0.48, -s * 0.02);
      ctx.arc(0, s * 0.3, s * 0.08, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.44, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.16, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawCharacterMarkerGlyph(ctx, key, cx, cy, size, pulse) {
    const style = CHARACTER_MARKER_STYLES[key];
    if (!style) return false;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.lineWidth = Math.max(1.2, size * 0.11);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = rgba(style.stroke, 0.96);
    ctx.fillStyle = rgba(style.fill, 0.78);

    if (key === 'billy') {
      const r = size * 0.5;
      ctx.strokeRect(-r, -r, r * 2, r * 2);
      ctx.beginPath();
      ctx.moveTo(-r * 0.46, 0);
      ctx.lineTo(r * 0.46, 0);
      ctx.moveTo(0, -r * 0.46);
      ctx.lineTo(0, r * 0.46);
      ctx.stroke();
    } else if (key === 'caseworker') {
      ctx.beginPath();
      ctx.moveTo(-size * 0.42, -size * 0.54);
      ctx.lineTo(size * 0.18, -size * 0.54);
      ctx.lineTo(size * 0.42, -size * 0.28);
      ctx.lineTo(size * 0.42, size * 0.54);
      ctx.lineTo(-size * 0.42, size * 0.54);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(-size * 0.2, -size * 0.06);
      ctx.lineTo(size * 0.2, -size * 0.06);
      ctx.moveTo(-size * 0.2, size * 0.18);
      ctx.lineTo(size * 0.1, size * 0.18);
      ctx.stroke();
    } else if (key === 'jinx' || key === 'mara') {
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.52, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, -size * 0.42);
      ctx.lineTo(size * 0.18, 0);
      ctx.lineTo(0, size * 0.42);
      ctx.lineTo(-size * 0.18, 0);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.08, 0, Math.PI * 2);
      ctx.fill();
    } else if (key === 'edgar') {
      ctx.strokeRect(-size * 0.46, -size * 0.42, size * 0.92, size * 0.84);
      ctx.beginPath();
      ctx.moveTo(-size * 0.22, -size * 0.12);
      ctx.lineTo(size * 0.24, -size * 0.12);
      ctx.moveTo(-size * 0.22, size * 0.12);
      ctx.lineTo(size * 0.1, size * 0.12);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(size * 0.34, -size * 0.05);
      ctx.lineTo(size * 0.58, -size * 0.2);
      ctx.lineTo(size * 0.58, size * 0.18);
      ctx.closePath();
      ctx.fill();
    } else if (key === 'nyx') {
      ctx.beginPath();
      ctx.moveTo(-size * 0.52, -size * 0.06);
      ctx.lineTo(-size * 0.18, -size * 0.5);
      ctx.lineTo(size * 0.18, -size * 0.5);
      ctx.lineTo(size * 0.52, -size * 0.06);
      ctx.lineTo(size * 0.28, size * 0.48);
      ctx.lineTo(-size * 0.28, size * 0.48);
      ctx.closePath();
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(-size * 0.17, 0, size * 0.04, 0, Math.PI * 2);
      ctx.arc(size * 0.17, 0, size * 0.04, 0, Math.PI * 2);
      ctx.fill();
    } else if (key === 'nettie') {
      ctx.beginPath();
      ctx.moveTo(0, size * 0.58);
      ctx.lineTo(0, -size * 0.5);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(-size * 0.2, -size * 0.12, size * 0.22, size * 0.42, -0.72, 0, Math.PI * 2);
      ctx.ellipse(size * 0.22, size * 0.08, size * 0.22, size * 0.42, 0.72, 0, Math.PI * 2);
      ctx.stroke();
    } else if (key === 'overseer') {
      ctx.beginPath();
      ctx.arc(0, 0, size * (0.52 + pulse * 0.04), 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.ellipse(0, 0, size * 0.5, size * 0.28, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(0, 0, size * 0.14, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.font = `900 ${Math.max(8, size * 0.9)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(style.label || '?', 0, 0);
    }

    ctx.restore();
    return true;
  }

  drawTaskMarkers(ctx, cw, ch, cols, rows, pulse) {
    const s = this.stateRef.state;
    const pxNow = Number(s.pos.x || 0);
    const pyNow = Number(s.pos.y || 0);
    ctx.save();
    for (const marker of this.taskMarkers || []) {
      const x = Number(marker.x);
      const y = Number(marker.y);
      if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
      if (x < 0 || y < 0 || x >= cols || y >= rows || !this.isCellEnabled(x, y)) continue;

      const tile = this.tile(x, y);
      const distance = Math.abs(pxNow - x) + Math.abs(pyNow - y);
      const known = tile?.discovered || distance <= 2 || marker.required;
      if (!known) continue;

      const px = x * cw;
      const py = y * ch;
      const cx = px + cw * 0.5;
      const cy = py + ch * 0.5;
      const size = Math.max(11, Math.min(cw, ch) * 0.28);
      const characterStyle = CHARACTER_MARKER_STYLES[marker.characterKey];
      const style = characterStyle || MARKER_STYLES[marker.kind] || MARKER_STYLES.thread;
      const dim = !!marker.deemphasize && !marker.completed;
      const alpha = marker.completed ? 0.3 : (dim ? 0.38 : (tile?.discovered ? 0.92 : 0.54));
      const hot = (marker.required || marker.planned || marker.kind === 'desk') && !marker.completed && !dim;
      const near = distance <= 1 && !marker.completed;
      const prereq = this.prerequisiteTarget
        && Number(marker.x) === Number(this.prerequisiteTarget.x)
        && Number(marker.y) === Number(this.prerequisiteTarget.y)
        && !marker.completed;

      if (prereq) {
        ctx.globalAlpha = 0.18 + pulse * 0.22;
        ctx.strokeStyle = 'rgba(255, 196, 120, 0.82)';
        ctx.lineWidth = 2.2;
        ctx.beginPath();
        ctx.arc(cx, cy, size * (2.05 + pulse * 0.28), 0, Math.PI * 2);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(cx, cy, size * (1.48 + pulse * 0.18), 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = alpha;
      ctx.strokeStyle = hot ? rgba(style.stroke, 0.72 + pulse * 0.22) : rgba(style.stroke, 0.5 + pulse * 0.18);
      ctx.fillStyle = rgba(style.fill, hot ? 0.15 + pulse * 0.09 : 0.1 + pulse * 0.06);
      ctx.lineWidth = hot ? 2 : 1.4;
      ctx.beginPath();
      ctx.arc(cx, cy, size * (1.12 + pulse * 0.12), 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();

      if (near) {
        ctx.globalAlpha = 0.24 + pulse * 0.14;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.arc(cx, cy, size * 1.92, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.globalAlpha = Math.min(1, alpha + 0.18);
      ctx.strokeStyle = rgba(style.stroke, hot ? 0.9 : 0.72);
      ctx.fillStyle = rgba(style.fill, 0.72);
      if (!this.drawCharacterMarkerGlyph(ctx, marker.characterKey, cx, cy, size * 0.78, pulse)) {
        this.drawTaskGlyph(ctx, marker.kind || 'thread', cx, cy, size * 0.74, pulse);
      }

      if (!tile?.discovered && !marker.completed) {
        ctx.globalAlpha = 0.3 + pulse * 0.2;
        ctx.strokeStyle = rgba(style.stroke, 0.52);
        ctx.beginPath();
        ctx.arc(cx, cy, size * 1.62, 0, Math.PI * 2);
        ctx.stroke();
      }

      if (marker.mobility === 'roam' && !marker.completed) {
        ctx.globalAlpha = 0.7 + pulse * 0.22;
        ctx.strokeStyle = rgba(style.stroke, 0.72 + pulse * 0.18);
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.54, cy + size * 0.82);
        ctx.quadraticCurveTo(cx, cy + size * (1.04 + pulse * 0.16), cx + size * 0.54, cy + size * 0.82);
        ctx.stroke();
      } else if (marker.mobility === 'desk') {
        ctx.globalAlpha = 0.58;
        ctx.strokeStyle = rgba(style.stroke, 0.68);
        ctx.beginPath();
        ctx.moveTo(cx - size * 0.48, cy + size * 0.72);
        ctx.lineTo(cx + size * 0.48, cy + size * 0.72);
        ctx.stroke();
      }
    }
    ctx.restore();
  }

  drawOfficeCounterSignage(ctx, cw, ch, pulse) {
    if (!this.isOfficeIntakeWorld()) return;
    const counters = (this.taskMarkers || [])
      .filter((marker) => marker.fixedOfficeCounter && marker.ticket && !marker.completed)
      .slice(0, 12);
    if (counters.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const marker of counters) {
      const x = Number(marker.x);
      const y = Number(marker.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !this.inBounds(x, y)) continue;

      const cx = x * cw + cw * 0.5;
      const cy = y * ch + ch * 0.18;
      const w = Math.min(cw * 0.72, 42);
      const h = Math.max(12, Math.min(ch * 0.2, 17));
      const style = CHARACTER_MARKER_STYLES[marker.characterKey] || MARKER_STYLES[marker.kind] || MARKER_STYLES.desk;
      const hot = marker.required || marker.ticket === 'A-001';

      ctx.globalAlpha = hot ? 0.78 + pulse * 0.12 : 0.52;
      ctx.fillStyle = 'rgba(5, 13, 24, 0.78)';
      ctx.strokeStyle = rgba(style.stroke, hot ? 0.72 : 0.42);
      ctx.lineWidth = hot ? 1.2 : 0.8;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 4);
      else ctx.rect(cx - w / 2, cy - h / 2, w, h);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = hot ? 0.95 : 0.72;
      ctx.fillStyle = rgba(style.fill, 0.92);
      ctx.font = `800 ${Math.max(8, Math.min(10, h * 0.68))}px sans-serif`;
      ctx.fillText(String(marker.ticket).replace('-', ''), cx, cy + 0.5);
    }
    ctx.restore();
  }

  drawWorksiteStationSignage(ctx, cw, ch, pulse) {
    if (this.stateRef.state.currentWorld !== 'EARTH_PROLOGUE') return;
    const stations = (this.taskMarkers || [])
      .filter((marker) => marker.ticket && !marker.completed)
      .slice(0, 8);
    if (stations.length === 0) return;

    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (const marker of stations) {
      const x = Number(marker.x);
      const y = Number(marker.y);
      if (!Number.isFinite(x) || !Number.isFinite(y) || !this.inBounds(x, y)) continue;

      const cx = x * cw + cw * 0.5;
      const cy = y * ch + ch * 0.2;
      const label = String(marker.ticket || '').toUpperCase();
      const danger = label.includes('IMPACT') || label.includes('BEAM');
      const w = Math.min(cw * 0.82, Math.max(44, label.length * 8));
      const h = Math.max(14, Math.min(ch * 0.24, 20));
      const style = danger ? MARKER_STYLES.desk : (CHARACTER_MARKER_STYLES[marker.characterKey] || MARKER_STYLES.desk);

      ctx.globalAlpha = danger ? 0.82 + pulse * 0.12 : 0.68 + pulse * 0.08;
      ctx.fillStyle = danger ? 'rgba(54, 29, 21, 0.84)' : 'rgba(25, 28, 19, 0.82)';
      ctx.strokeStyle = danger ? 'rgba(255, 160, 104, 0.72)' : rgba(style.stroke, 0.62);
      ctx.lineWidth = danger ? 1.35 : 1;
      ctx.beginPath();
      if (ctx.roundRect) ctx.roundRect(cx - w / 2, cy - h / 2, w, h, 4);
      else ctx.rect(cx - w / 2, cy - h / 2, w, h);
      ctx.fill();
      ctx.stroke();

      ctx.globalAlpha = 0.96;
      ctx.fillStyle = danger ? 'rgba(255, 224, 174, 0.96)' : rgba(style.fill, 0.92);
      ctx.font = `900 ${Math.max(8, Math.min(11, h * 0.64))}px sans-serif`;
      ctx.fillText(label, cx, cy + 0.5);
    }
    ctx.restore();
  }

  drawNearestSignalPath(ctx, cw, ch, pulse) {
    const s = this.stateRef.state;
    const pxNow = Number(s.pos.x || 0);
    const pyNow = Number(s.pos.y || 0);

    if (this.prerequisiteTarget) {
      const tx = Number(this.prerequisiteTarget.x);
      const ty = Number(this.prerequisiteTarget.y);
      if (this.inBounds(tx, ty) && (tx !== pxNow || ty !== pyNow)) {
        const sx = pxNow * cw + cw * 0.5;
        const sy = pyNow * ch + ch * 0.5;
        const targetX = tx * cw + cw * 0.5;
        const targetY = ty * ch + ch * 0.5;
        const style = MARKER_STYLES.desk || MARKER_STYLES.thread;

        ctx.save();
        ctx.globalAlpha = 0.42 + pulse * 0.24;
        ctx.strokeStyle = rgba(style.stroke, 0.9);
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 6]);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(targetX, sy);
        ctx.lineTo(targetX, targetY);
        ctx.stroke();
        ctx.setLineDash([]);

        ctx.globalAlpha = 0.72 + pulse * 0.2;
        ctx.fillStyle = 'rgba(255, 196, 120, 0.88)';
        const arrow = Math.max(5, Math.min(cw, ch) * 0.1);
        ctx.beginPath();
        ctx.moveTo(targetX, targetY - arrow);
        ctx.lineTo(targetX - arrow * 0.72, targetY + arrow * 0.42);
        ctx.lineTo(targetX + arrow * 0.72, targetY + arrow * 0.42);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
        return;
      }
    }

    const candidates = (this.taskMarkers || [])
      .filter((marker) => !marker.completed)
      .filter((marker) => Number.isFinite(Number(marker.x)) && Number.isFinite(Number(marker.y)))
      .filter((marker) => this.inBounds(Number(marker.x), Number(marker.y)))
      .map((marker) => ({
        marker,
        distance: Math.abs(pxNow - Number(marker.x)) + Math.abs(pyNow - Number(marker.y)),
        rank: marker.required || marker.kind === 'desk' ? 0 : marker.kind === 'npc' ? 1 : 2,
      }))
      .filter((row) => row.distance > 0)
      .sort((a, b) => a.rank - b.rank || a.distance - b.distance);

    const target = candidates[0]?.marker;
    if (!target) return;

    const sx = pxNow * cw + cw * 0.5;
    const sy = pyNow * ch + ch * 0.5;
    const tx = Number(target.x) * cw + cw * 0.5;
    const ty = Number(target.y) * ch + ch * 0.5;
    const style = CHARACTER_MARKER_STYLES[target.characterKey] || MARKER_STYLES[target.kind] || MARKER_STYLES.thread;

    ctx.save();
    ctx.globalAlpha = 0.34 + pulse * 0.18;
    ctx.strokeStyle = rgba(style.stroke, 0.78);
    ctx.lineWidth = 1.6;
    ctx.setLineDash([5, 7]);
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(tx, sy);
    ctx.lineTo(tx, ty);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.globalAlpha = 0.58 + pulse * 0.18;
    ctx.fillStyle = rgba(style.fill, 0.74);
    const arrow = Math.max(4, Math.min(cw, ch) * 0.08);
    ctx.beginPath();
    ctx.arc(tx, ty, arrow, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawPlayerMarker(ctx, cw, ch, pulse) {
    const s = this.stateRef.state;
    const cx = s.pos.x * cw + cw / 2;
    const cy = s.pos.y * ch + ch / 2;

    ctx.save();
    const style = CHARACTER_MARKER_STYLES.billy;
    ctx.strokeStyle = rgba(style.stroke, 0.95);
    ctx.lineWidth = 1.9;

    ctx.globalAlpha = 0.55;
    ctx.beginPath();
    ctx.arc(cx, cy, Math.max(9, Math.min(cw, ch) * (0.32 + pulse * 0.08)), 0, Math.PI * 2);
    ctx.stroke();

    ctx.globalAlpha = 1;
    const tokenSize = Math.max(10, Math.min(cw, ch) * (0.25 + pulse * 0.02));
    this.drawCharacterMarkerGlyph(ctx, 'billy', cx, cy, tokenSize, pulse);
    ctx.restore();
  }

  drawBoardAtmosphere(ctx, W, H, cw, ch, pulse) {
    const shape = this.worldProfile.shape || 'grid';
    ctx.save();

    if (shape === 'office') {
      const queueY = Math.floor(this.h / 2);
      const y = queueY * ch;
      const band = ctx.createLinearGradient(0, y, W, y + ch * 2);
      band.addColorStop(0, 'rgba(255, 207, 125, 0)');
      band.addColorStop(0.5, `rgba(255, 207, 125, ${0.08 + pulse * 0.03})`);
      band.addColorStop(1, 'rgba(255, 207, 125, 0)');
      ctx.fillStyle = band;
      ctx.fillRect(0, y - ch * 0.15, W, ch * 2.3);

      ctx.strokeStyle = `rgba(255, 230, 176, ${0.16 + pulse * 0.08})`;
      ctx.lineWidth = 1.2;
      ctx.setLineDash([Math.max(8, cw * 0.22), Math.max(8, cw * 0.18)]);
      for (let row = queueY; row <= queueY + 1; row++) {
        const ly = row * ch + ch * 0.5;
        ctx.beginPath();
        ctx.moveTo(cw * 0.7, ly);
        ctx.lineTo(W - cw * 0.7, ly);
        ctx.stroke();
      }
      ctx.setLineDash([]);

      ctx.fillStyle = `rgba(126, 231, 255, ${0.08 + pulse * 0.04})`;
      ctx.fillRect(cw * 2, ch * 1.08, Math.max(cw, W - cw * 4), ch * 0.11);
      ctx.fillRect(cw * 2, H - ch * 1.16, Math.max(cw, W - cw * 4), ch * 0.08);
    } else if (shape === 'worksite') {
      const laneY = Math.floor(this.h / 2);
      const y = laneY * ch + ch * 0.5;
      ctx.strokeStyle = `rgba(255, 207, 125, ${0.2 + pulse * 0.08})`;
      ctx.lineWidth = Math.max(2, ch * 0.035);
      ctx.setLineDash([Math.max(10, cw * 0.26), Math.max(7, cw * 0.16)]);
      ctx.beginPath();
      ctx.moveTo(cw * 0.6, y);
      ctx.lineTo(W - cw * 0.6, y);
      ctx.stroke();
      ctx.setLineDash([]);

      const beamX = W * 0.72;
      const beam = ctx.createLinearGradient(beamX - cw * 0.18, ch * 0.6, beamX + cw * 0.18, H - ch * 0.6);
      beam.addColorStop(0, `rgba(255, 128, 128, ${0.1 + pulse * 0.06})`);
      beam.addColorStop(0.5, `rgba(255, 207, 125, ${0.2 + pulse * 0.08})`);
      beam.addColorStop(1, 'rgba(255, 128, 128, 0.06)');
      ctx.fillStyle = beam;
      ctx.fillRect(beamX - cw * 0.18, ch * 0.55, cw * 0.36, H - ch * 1.1);

      ctx.strokeStyle = `rgba(255, 230, 176, ${0.18 + pulse * 0.06})`;
      ctx.lineWidth = 1;
      for (let x = cw; x < W - cw; x += cw) {
        ctx.beginPath();
        ctx.moveTo(x, ch * 1.1);
        ctx.lineTo(x + cw * 0.5, ch * 0.65);
        ctx.stroke();
      }
    } else if (shape === 'meadow' || shape === 'wild') {
      ctx.strokeStyle = `rgba(140, 245, 159, ${0.08 + pulse * 0.04})`;
      ctx.lineWidth = 1.4;
      for (let i = 0; i < 5; i++) {
        ctx.beginPath();
        ctx.ellipse(W * 0.5, H * 0.52, W * (0.2 + i * 0.08), H * (0.13 + i * 0.05), -0.2, 0, Math.PI * 2);
        ctx.stroke();
      }
    } else if (shape === 'rift') {
      ctx.strokeStyle = `rgba(184, 163, 255, ${0.1 + pulse * 0.06})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(W * 0.5, H * 0.04);
      ctx.lineTo(W * 0.58, H * 0.32);
      ctx.lineTo(W * 0.44, H * 0.55);
      ctx.lineTo(W * 0.52, H * 0.96);
      ctx.stroke();
    } else if (shape === 'stacks') {
      ctx.strokeStyle = `rgba(129, 255, 206, ${0.07 + pulse * 0.04})`;
      ctx.lineWidth = 1;
      for (let x = cw; x < W; x += cw * 2) {
        ctx.beginPath();
        ctx.moveTo(x + 0.5, ch * 0.5);
        ctx.lineTo(x + 0.5, H - ch * 0.5);
        ctx.stroke();
      }
    }

    const vignette = ctx.createRadialGradient(W * 0.5, H * 0.45, W * 0.22, W * 0.5, H * 0.48, W * 0.78);
    vignette.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignette.addColorStop(1, 'rgba(0, 0, 0, 0.28)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }

  draw(now = performance.now()) {
    const ctx = this.ctx;
    const W = this.canvas.width;
    const H = this.canvas.height;
    const cols = this.w;
    const rows = this.h;
    const cw = Math.floor(W / cols);
    const ch = Math.floor(H / rows);
    const pulse = (Math.sin(now / 560) + 1) / 2;

    ctx.clearRect(0, 0, W, H);

    const bg = ctx.createLinearGradient(0, 0, W, H);
    bg.addColorStop(0, '#071120');
    bg.addColorStop(0.52, '#0a1d31');
    bg.addColorStop(1, '#06101e');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    const glowA = ctx.createRadialGradient(W * 0.18, H * 0.12, 12, W * 0.18, H * 0.12, W * 0.74);
    glowA.addColorStop(0, 'rgba(104, 226, 255, 0.16)');
    glowA.addColorStop(1, 'rgba(104, 226, 255, 0)');
    ctx.fillStyle = glowA;
    ctx.fillRect(0, 0, W, H);

    const glowB = ctx.createRadialGradient(W * 0.82, H * 0.08, 8, W * 0.82, H * 0.08, W * 0.62);
    glowB.addColorStop(0, 'rgba(255, 207, 125, 0.1)');
    glowB.addColorStop(1, 'rgba(255, 207, 125, 0)');
    ctx.fillStyle = glowB;
    ctx.fillRect(0, 0, W, H);

    ctx.save();
    ctx.strokeStyle = 'rgba(126, 210, 255, 0.045)';
    ctx.lineWidth = 1;
    const gridStep = Math.max(18, Math.floor(Math.min(cw, ch) * 0.52));
    for (let gx = gridStep; gx < W; gx += gridStep) {
      ctx.beginPath();
      ctx.moveTo(gx + 0.5, 0);
      ctx.lineTo(gx + 0.5, H);
      ctx.stroke();
    }
    for (let gy = gridStep; gy < H; gy += gridStep) {
      ctx.beginPath();
      ctx.moveTo(0, gy + 0.5);
      ctx.lineTo(W, gy + 0.5);
      ctx.stroke();
    }
    ctx.restore();

    this.drawBoardAtmosphere(ctx, W, H, cw, ch, pulse);

    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const t = this.tile(x, y);
        const px = x * cw;
        const py = y * ch;
        const active = this.isCellEnabled(x, y);
        this.drawTileCell(ctx, t, x, y, px, py, cw, ch, pulse, active);
      }
    }

    if (this.stateRef.state.currentWorld === 'AFTERLIFE' && this.isOfficeIntakeWorld()) {
      this.drawOfficeMergedObstacles(ctx, cw, ch, pulse);
      this.drawOfficeCounterSignage(ctx, cw, ch, pulse);
    }

    this.drawSpawnMarkers(ctx, cw, ch, cols, rows, pulse);
    this.drawNearestSignalPath(ctx, cw, ch, pulse);
    this.drawTaskMarkers(ctx, cw, ch, cols, rows, pulse);
    this.drawWorksiteStationSignage(ctx, cw, ch, pulse);
    this.drawMoveHints(ctx, cw, ch, pulse);
    this.drawPlayerMarker(ctx, cw, ch, pulse);
  }
}




