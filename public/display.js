const socket = io();
const canvas = document.getElementById("field-canvas");
const ctx = canvas.getContext("2d");
const resetButton = document.getElementById("reset-field");
const qrImage = document.getElementById("qr-image");
const controllerLink = document.getElementById("controller-link");

const CONFIG = {
  BACKGROUND_COLOR: "#05070b", // Adjust background color here.
  GRID_DENSITY: 0.00022, // Adjust grid density here.
  LINE_LENGTH: 11, // Adjust directional line length here.
  LINE_THICKNESS: 1.3, // Adjust directional line thickness here.
  INTENSITY_DECAY: 0.992, // Adjust intensity decay here.
  MEMORY_STRENGTH: 0.04, // Adjust memory strength here.
  NEIGHBOR_INFLUENCE: 0.24, // Adjust neighbor influence strength here.
  BASELINE_FLOW_MOTION: 0.018, // Adjust baseline flow motion here.
  DISTURBANCE_STRENGTH: 1.9, // Adjust disturbance strength here.
  GLOW_AMOUNT: 10, // Adjust glow palette intensity here.
  STROKE_COLOR: "72, 80, 96", // Adjust color palette here.
  HALO_COLOR: "137, 175, 255", // Adjust glow palette here.
  GRID_POINT_COLOR: "170, 182, 205",
  CONNECTION_OPACITY: 0.05,
  DISTURBANCE_RADIUS: 0.11,
  MEMORY_DECAY: 0.998,
  FLOW_DAMPING: 0.965,
  INTENSITY_RESPONSE: 0.2,
  AMBIENT_INTENSITY: 0.08,
  TURBULENCE: 0.22,
  COLOR_DIFFUSION: 0.44, // Adjust user color spreading here.
  COLOR_DECAY: 0.99988, // Adjust user color persistence here.
  COLOR_STRENGTH: 1.34, // Adjust user color strength here.
  GROWTH_STRENGTH: 0.46, // Adjust multi-user growth / shaping here.
  HALO_RADIUS: 12,
  CONNECTION_RENDER_STEP: 2,
  SPIN_MEMORY: 0.028, // Adjust rotational persistence here.
  TINT_MEMORY: 0.48, // Adjust color mixing persistence here.
  SATURATION_FLOOR: 0.92, // Adjust minimum color saturation here.
  GLOW_PERSISTENCE: 0.72, // Adjust long-lived color glow here.
  STRUCTURAL_MEMORY_DECAY: 0.99998, // Adjust long-term structural memory here.
  STRUCTURAL_MEMORY_FLOOR: 0.012,
  STRUCTURAL_RESISTANCE: 0.34,
  STRUCTURAL_COLOR_BIAS: 0.2,
  STRUCTURAL_DIRECTION_INERTIA: 0.045,
  INSTABILITY_DECAY: 0.965,
  CONFLICT_WINDOW: 260,
  CONFLICT_COLOR_DISTANCE: 95
};

let width = window.innerWidth;
let height = window.innerHeight;
let diagonal = Math.hypot(width, height);
let animationTime = 0;
let grid = [];
let cols = 0;
let rows = 0;
let cellSizeX = 0;
let cellSizeY = 0;
const activeInputs = new Map();

resizeCanvas();
createField();
buildQrCode();
animate();

window.addEventListener("resize", handleResize);

resetButton.addEventListener("click", () => {
  socket.emit("field:reset");
  clearField();
});

socket.on("field:disturbance", (payload) => {
  applyControllerInput(payload);
});

socket.on("field:reset", () => {
  clearField();
});

function handleResize() {
  resizeCanvas();
  createField();
}

function resizeCanvas() {
  width = window.innerWidth;
  height = window.innerHeight;
  diagonal = Math.hypot(width, height);

  canvas.width = width * window.devicePixelRatio;
  canvas.height = height * window.devicePixelRatio;
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  ctx.setTransform(window.devicePixelRatio, 0, 0, window.devicePixelRatio, 0, 0);
}

function createField() {
  const targetCount = Math.max(180, Math.floor(width * height * CONFIG.GRID_DENSITY));
  cols = Math.max(14, Math.round(Math.sqrt(targetCount * (width / height))));
  rows = Math.max(12, Math.round(targetCount / cols));
  cellSizeX = width / (cols + 1);
  cellSizeY = height / (rows + 1);
  grid = [];

  for (let row = 0; row < rows; row += 1) {
    const rowCells = [];

    for (let col = 0; col < cols; col += 1) {
      const x = (col + 1) * cellSizeX;
      const y = (row + 1) * cellSizeY;
      const seed = Math.random() * Math.PI * 2;
      const baseline = getBaselineVector(col, row, seed, 0);

      rowCells.push({
        col,
        row,
        x,
        y,
        seed,
        flowX: baseline.x,
        flowY: baseline.y,
        intensity: CONFIG.AMBIENT_INTENSITY,
        memory: 0,
        activeMemory: 0,
        structuralMemory: 0,
        hasStructuralMemory: false,
        memoryX: 0,
        memoryY: 0,
        structuralFlowX: baseline.x,
        structuralFlowY: baseline.y,
        colorR: 0,
        colorG: 0,
        colorB: 0,
        colorWeight: 0,
        tintR: 0,
        tintG: 0,
        tintB: 0,
        structuralTintR: 0,
        structuralTintG: 0,
        structuralTintB: 0,
        instability: 0,
        conflictTintR: 0,
        conflictTintG: 0,
        conflictTintB: 0,
        lastInputTime: 0,
        lastInputUserId: null,
        lastInputColor: null
      });
    }

    grid.push(rowCells);
  }
}

function clearField() {
  activeInputs.clear();

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = grid[row][col];
      const baseline = getBaselineVector(col, row, cell.seed, animationTime * 0.001);

      cell.flowX = baseline.x;
      cell.flowY = baseline.y;
      cell.intensity = CONFIG.AMBIENT_INTENSITY;
      cell.memory = 0;
      cell.activeMemory = 0;
      cell.structuralMemory = 0;
      cell.hasStructuralMemory = false;
      cell.memoryX = 0;
      cell.memoryY = 0;
      cell.structuralFlowX = baseline.x;
      cell.structuralFlowY = baseline.y;
      cell.colorR = 0;
      cell.colorG = 0;
      cell.colorB = 0;
      cell.colorWeight = 0;
      cell.tintR = 0;
      cell.tintG = 0;
      cell.tintB = 0;
      cell.structuralTintR = 0;
      cell.structuralTintG = 0;
      cell.structuralTintB = 0;
      cell.instability = 0;
      cell.conflictTintR = 0;
      cell.conflictTintG = 0;
      cell.conflictTintB = 0;
      cell.lastInputTime = 0;
      cell.lastInputUserId = null;
      cell.lastInputColor = null;
    }
  }
}

function applyControllerInput(payload) {
  if (!payload || typeof payload.x !== "number" || typeof payload.y !== "number") {
    return;
  }

  if (payload.phase === "end" || payload.phase === "cancel") {
    activeInputs.delete(payload.id);
    return;
  }

  activeInputs.set(payload.id, {
    userId: getUserId(payload.id),
    x: payload.x,
    y: payload.y,
    force: payload.force || 0.5,
    dx: payload.dx || 0,
    dy: payload.dy || 0,
    phase: payload.phase,
    duration: payload.duration || 0,
    type: payload.type === "hold" ? "hold" : "tap",
    lastSeen: performance.now(),
    color: getPayloadColor(payload)
  });

  injectDisturbance(payload);
}

function injectDisturbance(payload) {
  const xNorm = payload.x;
  const yNorm = payload.y;
  const force = payload.force || 0.5;
  const dx = payload.dx || 0;
  const dy = payload.dy || 0;
  const phase = payload.phase || "tap";
  const duration = payload.duration || 0;
  const interactionType = payload.type === "hold" || duration >= 150 ? "hold" : "tap";
  const userColor = normalizeColorPayload(payload.color) || getPayloadColor(payload);
  const userId = payload.userId || getUserId(payload.id);
  const px = xNorm * width;
  const py = yNorm * height;
  const dragMagnitude = Math.hypot(dx, dy);
  const directionalWeight = Math.min(1, dragMagnitude * 20);
  const closestCell = getClosestCell(px, py);

  if (!closestCell) {
    return;
  }

  const directionAngle =
    directionalWeight > 0.001
      ? Math.atan2(dy, dx)
      : Math.atan2(closestCell.y - height * 0.5, closestCell.x - width * 0.5) + Math.PI / 2;
  const directionX = Math.cos(directionAngle);
  const directionY = Math.sin(directionAngle);
  const strength =
    CONFIG.DISTURBANCE_STRENGTH *
    getDurationWeight(duration, interactionType, phase) *
    (0.55 + force * 1.35);

  const cell = closestCell;
  detectConflict(cell, userId, userColor);

  const resistance = clamp(cell.structuralMemory * CONFIG.STRUCTURAL_RESISTANCE, 0, 0.62);
  const applied = strength * (1 - resistance);
  const memoryGain = interactionType === "hold" ? 1.35 : 0.42;
  const structuralGain = interactionType === "hold" ? 0.026 : 0.004;

  cell.flowX += directionX * applied * 0.45;
  cell.flowY += directionY * applied * 0.45;
  cell.intensity = Math.min(3, cell.intensity + applied * 0.92);
  cell.activeMemory = Math.min(2.6, cell.activeMemory + CONFIG.MEMORY_STRENGTH * 14 * memoryGain);
  cell.memory = cell.activeMemory;
  cell.structuralMemory = Math.min(1.8, cell.structuralMemory + structuralGain * (0.65 + force));
  cell.hasStructuralMemory = true;
  cell.memoryX = mixValue(cell.memoryX, directionX, 0.4);
  cell.memoryY = mixValue(cell.memoryY, directionY, 0.4);
  cell.structuralFlowX = mixValue(cell.structuralFlowX, directionX, structuralGain * 2.4);
  cell.structuralFlowY = mixValue(cell.structuralFlowY, directionY, structuralGain * 2.4);

  if (userColor) {
    const colorApplied = applied * CONFIG.COLOR_STRENGTH * 1.25;
    const biasedColor = getStructurallyBiasedColor(cell, userColor);
    cell.colorR += userColor.r01 * colorApplied;
    cell.colorG += userColor.g01 * colorApplied;
    cell.colorB += userColor.b01 * colorApplied;
    cell.colorWeight = Math.min(5, cell.colorWeight + 1 + force * 0.6);
    cell.tintR = cell.tintR > 0 ? mixValue(cell.tintR, biasedColor.r, 0.45) : biasedColor.r;
    cell.tintG = cell.tintG > 0 ? mixValue(cell.tintG, biasedColor.g, 0.45) : biasedColor.g;
    cell.tintB = cell.tintB > 0 ? mixValue(cell.tintB, biasedColor.b, 0.45) : biasedColor.b;
    cell.structuralTintR = mixValue(cell.structuralTintR, userColor.r, structuralGain * 8);
    cell.structuralTintG = mixValue(cell.structuralTintG, userColor.g, structuralGain * 8);
    cell.structuralTintB = mixValue(cell.structuralTintB, userColor.b, structuralGain * 8);
  }
}

function animate(now = 0) {
  const elapsed = Math.min(40, now - animationTime || 16.67);
  animationTime = now;

  stepField(elapsed);
  renderField();

  requestAnimationFrame(animate);
}

function stepField(elapsed) {
  const time = animationTime * 0.001;
  const stepScale = elapsed / 16.67;

  for (const [id, input] of activeInputs.entries()) {
    if (performance.now() - input.lastSeen > 180) {
      activeInputs.delete(id);
      continue;
    }

    injectDisturbance({
      id,
      userId: input.userId,
      x: input.x,
      y: input.y,
      force: input.force * 0.42,
      dx: input.dx * 0.7,
      dy: input.dy * 0.7,
      phase: input.phase,
      duration: input.duration,
      type: input.type,
      color: input.color
    });
  }

  const nextFlowX = create2DArray(cols, rows);
  const nextFlowY = create2DArray(cols, rows);
  const nextIntensity = create2DArray(cols, rows);
  const nextMemory = create2DArray(cols, rows);
  const nextMemoryX = create2DArray(cols, rows);
  const nextMemoryY = create2DArray(cols, rows);
  const nextColorR = create2DArray(cols, rows);
  const nextColorG = create2DArray(cols, rows);
  const nextColorB = create2DArray(cols, rows);
  const nextColorWeight = create2DArray(cols, rows);
  const nextTintR = create2DArray(cols, rows);
  const nextTintG = create2DArray(cols, rows);
  const nextTintB = create2DArray(cols, rows);
  const nextStructuralMemory = create2DArray(cols, rows);
  const nextStructuralFlowX = create2DArray(cols, rows);
  const nextStructuralFlowY = create2DArray(cols, rows);
  const nextStructuralTintR = create2DArray(cols, rows);
  const nextStructuralTintG = create2DArray(cols, rows);
  const nextStructuralTintB = create2DArray(cols, rows);
  const nextInstability = create2DArray(cols, rows);
  const nextConflictTintR = create2DArray(cols, rows);
  const nextConflictTintG = create2DArray(cols, rows);
  const nextConflictTintB = create2DArray(cols, rows);

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = grid[row][col];
      const baseline = getBaselineVector(col, row, cell.seed, time);
      const neighborhood = getNeighborField(col, row);
      const combinedNeighborX = neighborhood.flowX + neighborhood.intensityX * 0.14;
      const combinedNeighborY = neighborhood.flowY + neighborhood.intensityY * 0.14;

      let flowX = cell.flowX * CONFIG.FLOW_DAMPING;
      let flowY = cell.flowY * CONFIG.FLOW_DAMPING;

      flowX = mixValue(flowX, combinedNeighborX, CONFIG.NEIGHBOR_INFLUENCE);
      flowY = mixValue(flowY, combinedNeighborY, CONFIG.NEIGHBOR_INFLUENCE);
      flowX = mixValue(flowX, baseline.x, CONFIG.BASELINE_FLOW_MOTION);
      flowY = mixValue(flowY, baseline.y, CONFIG.BASELINE_FLOW_MOTION);
      flowX += cell.memoryX * cell.activeMemory * CONFIG.MEMORY_STRENGTH;
      flowY += cell.memoryY * cell.activeMemory * CONFIG.MEMORY_STRENGTH;
      flowX += cell.structuralFlowX * cell.structuralMemory * CONFIG.STRUCTURAL_DIRECTION_INERTIA;
      flowY += cell.structuralFlowY * cell.structuralMemory * CONFIG.STRUCTURAL_DIRECTION_INERTIA;

      const magnitude = Math.hypot(flowX, flowY) || 1;
      const conflictNoise = (Math.random() - 0.5) * cell.instability * 0.9;
      const turbulence =
        Math.sin(cell.seed + time * 0.22 + row * 0.31 - col * 0.24) * CONFIG.TURBULENCE +
        conflictNoise;
      const twistStrength = (0.03 + cell.intensity * 0.02 + cell.instability * 0.08) * stepScale;
      const rotatedX = -flowY / magnitude;
      const rotatedY = flowX / magnitude;
      flowX += rotatedX * turbulence * twistStrength;
      flowY += rotatedY * turbulence * twistStrength;

      const normalized = normalizeVector(flowX, flowY, 1);
      const averageIntensity = neighborhood.intensity;
      const coherence = vectorDot(normalized.x, normalized.y, neighborhood.flowX, neighborhood.flowY);
      const memoryBoost = cell.activeMemory * 0.22 + cell.structuralMemory * 0.08;
      const colorGrowth = Math.min(0.42, neighborhood.colorWeight * CONFIG.GROWTH_STRENGTH * 0.22);
      const intensityTarget = clamp(
        CONFIG.AMBIENT_INTENSITY +
          averageIntensity * 0.44 +
          Math.max(0, coherence) * CONFIG.INTENSITY_RESPONSE +
          memoryBoost +
          colorGrowth,
        0,
        2.8
      );

      nextFlowX[row][col] = normalized.x;
      nextFlowY[row][col] = normalized.y;
      nextIntensity[row][col] = mixValue(cell.intensity, intensityTarget, (1 - CONFIG.INTENSITY_DECAY) * stepScale);
      nextMemory[row][col] = Math.max(
        cell.activeMemory * CONFIG.MEMORY_DECAY,
        neighborhood.colorWeight * CONFIG.SPIN_MEMORY
      );
      nextMemoryX[row][col] = mixValue(cell.memoryX, baseline.x, 0.015);
      nextMemoryY[row][col] = mixValue(cell.memoryY, baseline.y, 0.015);
      nextColorR[row][col] = mixValue(cell.colorR, neighborhood.colorR, CONFIG.COLOR_DIFFUSION) * CONFIG.COLOR_DECAY;
      nextColorG[row][col] = mixValue(cell.colorG, neighborhood.colorG, CONFIG.COLOR_DIFFUSION) * CONFIG.COLOR_DECAY;
      nextColorB[row][col] = mixValue(cell.colorB, neighborhood.colorB, CONFIG.COLOR_DIFFUSION) * CONFIG.COLOR_DECAY;
      nextColorWeight[row][col] = clamp(
        mixValue(cell.colorWeight, neighborhood.colorWeight, CONFIG.COLOR_DIFFUSION) * CONFIG.COLOR_DECAY,
        0,
        4.5
      );
      nextTintR[row][col] = mixValue(cell.tintR, neighborhood.tintR, CONFIG.COLOR_DIFFUSION);
      nextTintG[row][col] = mixValue(cell.tintG, neighborhood.tintG, CONFIG.COLOR_DIFFUSION);
      nextTintB[row][col] = mixValue(cell.tintB, neighborhood.tintB, CONFIG.COLOR_DIFFUSION);
      nextTintR[row][col] = mixValue(nextTintR[row][col], neighborhood.tintR, CONFIG.TINT_MEMORY);
      nextTintG[row][col] = mixValue(nextTintG[row][col], neighborhood.tintG, CONFIG.TINT_MEMORY);
      nextTintB[row][col] = mixValue(nextTintB[row][col], neighborhood.tintB, CONFIG.TINT_MEMORY);
      nextStructuralMemory[row][col] = cell.hasStructuralMemory
        ? Math.max(
            CONFIG.STRUCTURAL_MEMORY_FLOOR,
            mixValue(cell.structuralMemory, neighborhood.structuralMemory, 0.015) *
              CONFIG.STRUCTURAL_MEMORY_DECAY
          )
        : 0;
      nextStructuralFlowX[row][col] = mixValue(cell.structuralFlowX, neighborhood.structuralFlowX, 0.025);
      nextStructuralFlowY[row][col] = mixValue(cell.structuralFlowY, neighborhood.structuralFlowY, 0.025);
      nextStructuralTintR[row][col] = mixValue(cell.structuralTintR, neighborhood.structuralTintR, 0.018);
      nextStructuralTintG[row][col] = mixValue(cell.structuralTintG, neighborhood.structuralTintG, 0.018);
      nextStructuralTintB[row][col] = mixValue(cell.structuralTintB, neighborhood.structuralTintB, 0.018);
      nextInstability[row][col] = Math.max(
        neighborhood.instability * 0.08,
        cell.instability * CONFIG.INSTABILITY_DECAY
      );
      nextConflictTintR[row][col] = mixValue(cell.conflictTintR, neighborhood.conflictTintR, 0.05);
      nextConflictTintG[row][col] = mixValue(cell.conflictTintG, neighborhood.conflictTintG, 0.05);
      nextConflictTintB[row][col] = mixValue(cell.conflictTintB, neighborhood.conflictTintB, 0.05);
    }
  }

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = grid[row][col];
      cell.flowX = nextFlowX[row][col];
      cell.flowY = nextFlowY[row][col];
      cell.intensity = nextIntensity[row][col];
      cell.activeMemory = nextMemory[row][col];
      cell.memory = cell.activeMemory;
      cell.memoryX = nextMemoryX[row][col];
      cell.memoryY = nextMemoryY[row][col];
      cell.colorR = nextColorR[row][col];
      cell.colorG = nextColorG[row][col];
      cell.colorB = nextColorB[row][col];
      cell.colorWeight = nextColorWeight[row][col];
      cell.tintR = nextTintR[row][col];
      cell.tintG = nextTintG[row][col];
      cell.tintB = nextTintB[row][col];
      cell.structuralMemory = nextStructuralMemory[row][col];
      cell.hasStructuralMemory = cell.hasStructuralMemory || cell.structuralMemory > 0;
      cell.structuralFlowX = nextStructuralFlowX[row][col];
      cell.structuralFlowY = nextStructuralFlowY[row][col];
      cell.structuralTintR = nextStructuralTintR[row][col];
      cell.structuralTintG = nextStructuralTintG[row][col];
      cell.structuralTintB = nextStructuralTintB[row][col];
      cell.instability = nextInstability[row][col];
      cell.conflictTintR = nextConflictTintR[row][col];
      cell.conflictTintG = nextConflictTintG[row][col];
      cell.conflictTintB = nextConflictTintB[row][col];
    }
  }
}

function renderField() {
  ctx.clearRect(0, 0, width, height);
  renderBackground();
  renderArchitecturalGrid();
  renderConnections();
  renderDirectionalStrokes();
  renderInputEchoes();
}

function renderBackground() {
  const gradient = ctx.createRadialGradient(
    width * 0.5,
    height * 0.42,
    diagonal * 0.08,
    width * 0.5,
    height * 0.5,
    diagonal * 0.7
  );

  gradient.addColorStop(0, "rgba(16, 22, 34, 0.92)");
  gradient.addColorStop(1, CONFIG.BACKGROUND_COLOR);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

function renderArchitecturalGrid() {
  ctx.save();
  ctx.strokeStyle = "rgba(210, 225, 245, 0.045)";
  ctx.lineWidth = 1;

  for (let col = 0; col < cols; col += 1) {
    const x = (col + 1) * cellSizeX;
    ctx.beginPath();
    ctx.moveTo(x, cellSizeY * 0.6);
    ctx.lineTo(x, height - cellSizeY * 0.6);
    ctx.stroke();
  }

  for (let row = 0; row < rows; row += 1) {
    const y = (row + 1) * cellSizeY;
    ctx.beginPath();
    ctx.moveTo(cellSizeX * 0.6, y);
    ctx.lineTo(width - cellSizeX * 0.6, y);
    ctx.stroke();
  }

  ctx.restore();
}

function renderConnections() {
  ctx.save();
  ctx.lineWidth = 1;
  ctx.shadowBlur = 0;

  for (let row = 0; row < rows; row += CONFIG.CONNECTION_RENDER_STEP) {
    for (let col = 0; col < cols; col += CONFIG.CONNECTION_RENDER_STEP) {
      const cell = grid[row][col];

      if (col + 1 < cols) {
        drawConnection(cell, grid[row][col + 1]);
      }

      if (row + 1 < rows) {
        drawConnection(cell, grid[row + 1][col]);
      }
    }
  }

  ctx.restore();
}

function drawConnection(a, b) {
  const avgIntensity = (a.intensity + b.intensity) * 0.5;
  const coherence = Math.max(0, vectorDot(a.flowX, a.flowY, b.flowX, b.flowY));
  const activeWeight = Math.max(a.colorWeight, b.colorWeight);
  const alpha = CONFIG.CONNECTION_OPACITY * coherence + avgIntensity * 0.045 + activeWeight * 0.04;
  const mixedColor = blendColors(getCellColor(a), getCellColor(b), 0.5);

  if (alpha < 0.02) {
    return;
  }

  ctx.strokeStyle = `rgba(${mixedColor.r}, ${mixedColor.g}, ${mixedColor.b}, ${Math.min(0.42, alpha).toFixed(3)})`;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}

function renderDirectionalStrokes() {
  ctx.save();
  ctx.lineCap = "round";

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < cols; col += 1) {
      const cell = grid[row][col];
      const magnitude = Math.max(0.18, Math.hypot(cell.flowX, cell.flowY));
      const jitterAngle = (Math.random() - 0.5) * cell.instability * 0.9;
      const cosJitter = Math.cos(jitterAngle);
      const sinJitter = Math.sin(jitterAngle);
      const jitteredFlowX = cell.flowX * cosJitter - cell.flowY * sinJitter;
      const jitteredFlowY = cell.flowX * sinJitter + cell.flowY * cosJitter;
      const dir = normalizeVector(jitteredFlowX, jitteredFlowY, 1);
      const length = CONFIG.LINE_LENGTH + cell.intensity * 8 + cell.memory * 4;
      const half = length * 0.5;
      const x1 = cell.x - dir.x * half;
      const y1 = cell.y - dir.y * half;
      const x2 = cell.x + dir.x * half;
      const y2 = cell.y + dir.y * half;
      const isColored = cell.colorWeight > 0.02;
      const flicker = cell.instability > 0.02 ? 0.72 + Math.random() * 0.55 * cell.instability : 1;
      const alpha = isColored
        ? clamp((0.42 + cell.intensity * 0.34 + cell.colorWeight * 0.08) * flicker, 0.24, 1)
        : clamp(0.07 + cell.intensity * 0.18 + cell.memory * 0.06, 0.05, 0.26);
      const cellColor = getCellColor(cell);
      const haloAlpha = Math.min(
        isColored ? 0.68 : 0.18,
        cell.intensity * 0.16 +
          cell.colorWeight * 0.14 +
          cell.memory * CONFIG.GLOW_PERSISTENCE * 0.1 +
          cell.instability * 0.16
      );

      ctx.shadowBlur = isColored
        ? CONFIG.GLOW_AMOUNT + cell.intensity * 10 + cell.colorWeight * 4
        : CONFIG.GLOW_AMOUNT * 0.35;
      ctx.shadowColor = `rgba(${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${
        (isColored ? 0.28 + cell.intensity * 0.26 + cell.instability * 0.22 : 0.06).toFixed(3)
      })`;

      if (haloAlpha > 0.02) {
        ctx.fillStyle = `rgba(${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${haloAlpha.toFixed(3)})`;
        ctx.beginPath();
        ctx.arc(
          cell.x,
          cell.y,
          CONFIG.HALO_RADIUS + cell.intensity * 5 + cell.colorWeight * 2.6,
          0,
          Math.PI * 2
        );
        ctx.fill();
      }

      ctx.lineWidth = CONFIG.LINE_THICKNESS + cell.intensity * 0.9;
      ctx.strokeStyle = `rgba(${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();

      ctx.shadowBlur = 0;
      ctx.fillStyle = `rgba(${cellColor.r}, ${cellColor.g}, ${cellColor.b}, ${
        (isColored ? 0.34 + cell.intensity * 0.16 : 0.08).toFixed(3)
      })`;
      ctx.beginPath();
      ctx.arc(cell.x, cell.y, 1 + cell.intensity * 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.restore();
}

function renderInputEchoes() {
  ctx.save();
  ctx.shadowBlur = CONFIG.GLOW_AMOUNT * 1.4;
  ctx.shadowColor = `rgba(${CONFIG.HALO_COLOR}, 0.18)`;

  for (const input of activeInputs.values()) {
    const x = input.x * width;
    const y = input.y * height;
    const radius = 18 + input.force * 44;
    const color = input.color || parseRgb(CONFIG.STROKE_COLOR);

    ctx.strokeStyle = `rgba(${color.r}, ${color.g}, ${color.b}, ${(0.12 + input.force * 0.16).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();
}

function getNeighborField(col, row) {
  let sumX = 0;
  let sumY = 0;
  let intensity = 0;
  let intensityX = 0;
  let intensityY = 0;
  let colorR = 0;
  let colorG = 0;
  let colorB = 0;
  let colorWeight = 0;
  let tintR = 0;
  let tintG = 0;
  let tintB = 0;
  let structuralMemory = 0;
  let structuralFlowX = 0;
  let structuralFlowY = 0;
  let structuralTintR = 0;
  let structuralTintG = 0;
  let structuralTintB = 0;
  let instability = 0;
  let conflictTintR = 0;
  let conflictTintG = 0;
  let conflictTintB = 0;
  let count = 0;

  for (let y = row - 1; y <= row + 1; y += 1) {
    for (let x = col - 1; x <= col + 1; x += 1) {
      if (x < 0 || x >= cols || y < 0 || y >= rows || (x === col && y === row)) {
        continue;
      }

      const neighbor = grid[y][x];
      sumX += neighbor.flowX;
      sumY += neighbor.flowY;
      intensity += neighbor.intensity;
      intensityX += neighbor.flowX * neighbor.intensity;
      intensityY += neighbor.flowY * neighbor.intensity;
      colorR += neighbor.colorR;
      colorG += neighbor.colorG;
      colorB += neighbor.colorB;
      colorWeight += neighbor.colorWeight;
      tintR += neighbor.tintR;
      tintG += neighbor.tintG;
      tintB += neighbor.tintB;
      structuralMemory += neighbor.structuralMemory;
      structuralFlowX += neighbor.structuralFlowX;
      structuralFlowY += neighbor.structuralFlowY;
      structuralTintR += neighbor.structuralTintR;
      structuralTintG += neighbor.structuralTintG;
      structuralTintB += neighbor.structuralTintB;
      instability += neighbor.instability;
      conflictTintR += neighbor.conflictTintR;
      conflictTintG += neighbor.conflictTintG;
      conflictTintB += neighbor.conflictTintB;
      count += 1;
    }
  }

  if (count === 0) {
    return {
      flowX: 0,
      flowY: 0,
      intensity: 0,
      intensityX: 0,
      intensityY: 0,
      colorR: 0,
      colorG: 0,
      colorB: 0,
      colorWeight: 0,
      tintR: 0,
      tintG: 0,
      tintB: 0,
      structuralMemory: 0,
      structuralFlowX: 0,
      structuralFlowY: 0,
      structuralTintR: 0,
      structuralTintG: 0,
      structuralTintB: 0,
      instability: 0,
      conflictTintR: 0,
      conflictTintG: 0,
      conflictTintB: 0
    };
  }

  const averageFlow = normalizeVector(sumX / count, sumY / count, 1);

  return {
    flowX: averageFlow.x,
    flowY: averageFlow.y,
    intensity: intensity / count,
    intensityX: intensityX / count,
    intensityY: intensityY / count,
    colorR: colorR / count,
    colorG: colorG / count,
    colorB: colorB / count,
    colorWeight: colorWeight / count,
    tintR: tintR / count,
    tintG: tintG / count,
    tintB: tintB / count,
    structuralMemory: structuralMemory / count,
    structuralFlowX: structuralFlowX / count,
    structuralFlowY: structuralFlowY / count,
    structuralTintR: structuralTintR / count,
    structuralTintG: structuralTintG / count,
    structuralTintB: structuralTintB / count,
    instability: instability / count,
    conflictTintR: conflictTintR / count,
    conflictTintG: conflictTintG / count,
    conflictTintB: conflictTintB / count
  };
}

function getClosestCell(px, py) {
  const col = clamp(Math.round(px / cellSizeX) - 1, 0, cols - 1);
  const row = clamp(Math.round(py / cellSizeY) - 1, 0, rows - 1);
  return grid[row]?.[col] || null;
}

function detectConflict(cell, userId, color) {
  const now = performance.now();
  const recent = now - cell.lastInputTime < CONFIG.CONFLICT_WINDOW;
  const differentUser = cell.lastInputUserId && cell.lastInputUserId !== userId;
  const colorConflict =
    cell.lastInputColor && colorDistance(cell.lastInputColor, color) > CONFIG.CONFLICT_COLOR_DISTANCE;

  if (recent && (differentUser || colorConflict)) {
    const conflictAmount = differentUser && colorConflict ? 0.38 : 0.24;
    cell.instability = Math.min(1, cell.instability + conflictAmount);
    cell.conflictTintR = mixValue(cell.conflictTintR || color.r, color.r, 0.5);
    cell.conflictTintG = mixValue(cell.conflictTintG || color.g, color.g, 0.5);
    cell.conflictTintB = mixValue(cell.conflictTintB || color.b, color.b, 0.5);
    cell.structuralMemory = Math.min(1.8, cell.structuralMemory + 0.012);
    cell.hasStructuralMemory = true;
  }

  cell.lastInputTime = now;
  cell.lastInputUserId = userId;
  cell.lastInputColor = color;
}

function getDurationWeight(duration, type, phase) {
  if (type !== "hold") {
    return phase === "move" ? 0.74 : 0.42;
  }

  const holdScale = clamp(duration / 1800, 0.25, 1.8);
  return 0.72 + holdScale * 0.62;
}

function getStructurallyBiasedColor(cell, color) {
  if (!cell.hasStructuralMemory || cell.structuralMemory <= 0.02) {
    return color;
  }

  const bias = clamp(cell.structuralMemory * CONFIG.STRUCTURAL_COLOR_BIAS, 0, 0.42);

  return {
    r: mixValue(color.r, cell.structuralTintR || color.r, bias),
    g: mixValue(color.g, cell.structuralTintG || color.g, bias),
    b: mixValue(color.b, cell.structuralTintB || color.b, bias),
    r01: color.r01,
    g01: color.g01,
    b01: color.b01
  };
}

function colorDistance(a, b) {
  if (!a || !b) {
    return 0;
  }

  return Math.hypot(a.r - b.r, a.g - b.g, a.b - b.b);
}

function getBaselineVector(col, row, seed, time) {
  const angle =
    Math.sin(col * 0.31 + time * 0.09 + seed) * 0.55 +
    Math.cos(row * 0.27 - time * 0.07 + seed * 0.7) * 0.5 +
    Math.sin((col + row) * 0.12 + time * 0.04) * 0.24;

  return {
    x: Math.cos(angle),
    y: Math.sin(angle)
  };
}

function create2DArray(widthCount, heightCount) {
  return Array.from({ length: heightCount }, () => new Array(widthCount).fill(0));
}

function normalizeVector(x, y, fallbackLength = 1) {
  const magnitude = Math.hypot(x, y);

  if (magnitude < 0.0001) {
    return { x: fallbackLength, y: 0 };
  }

  return { x: x / magnitude, y: y / magnitude };
}

function vectorDot(ax, ay, bx, by) {
  const a = normalizeVector(ax, ay, 1);
  const b = normalizeVector(bx, by, 1);
  return a.x * b.x + a.y * b.y;
}

function mixValue(current, target, amount) {
  return current + (target - current) * amount;
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function getUserId(pointerId) {
  return String(pointerId || "controller").split(":")[0];
}

function getUserColor(userId) {
  const hue = hashString(userId) % 360;
  return hslToRgb(hue, 68, 72);
}

function getCellColor(cell) {
  if (cell.colorWeight < 0.02) {
    return parseRgb(CONFIG.STROKE_COLOR);
  }

  const saturationBoost = clamp(1.05 + cell.intensity * 0.24 + cell.colorWeight * 0.12, 1.05, 1.45);
  const weightedR = cell.colorWeight > 0.001 ? (cell.colorR / cell.colorWeight) * 255 : 0;
  const weightedG = cell.colorWeight > 0.001 ? (cell.colorG / cell.colorWeight) * 255 : 0;
  const weightedB = cell.colorWeight > 0.001 ? (cell.colorB / cell.colorWeight) * 255 : 0;
  const sourceR = cell.tintR || weightedR || cell.structuralTintR || 0;
  const sourceG = cell.tintG || weightedG || cell.structuralTintG || 0;
  const sourceB = cell.tintB || weightedB || cell.structuralTintB || 0;
  const conflictMix = clamp(cell.instability * 0.75, 0, 0.65);
  const unstableR = mixValue(sourceR, cell.conflictTintR || sourceR, conflictMix);
  const unstableG = mixValue(sourceG, cell.conflictTintG || sourceG, conflictMix);
  const unstableB = mixValue(sourceB, cell.conflictTintB || sourceB, conflictMix);
  const desaturation = clamp(1 - cell.instability * 0.45, 0.55, 1);
  const unstableAverage = (unstableR + unstableG + unstableB) / 3;
  const neutral = parseRgb(CONFIG.STROKE_COLOR);
  const blend = clamp(CONFIG.SATURATION_FLOOR + cell.colorWeight / 5, CONFIG.SATURATION_FLOOR, 1);

  return {
    r: Math.round(
      clamp(mixValue(neutral.r, mixValue(unstableAverage, unstableR, desaturation) * saturationBoost, blend), 0, 255)
    ),
    g: Math.round(
      clamp(mixValue(neutral.g, mixValue(unstableAverage, unstableG, desaturation) * saturationBoost, blend), 0, 255)
    ),
    b: Math.round(
      clamp(mixValue(neutral.b, mixValue(unstableAverage, unstableB, desaturation) * saturationBoost, blend), 0, 255)
    )
  };
}

function getPayloadColor(payload) {
  return normalizeColorPayload(payload?.color) || getUserColor(getUserId(payload?.id));
}

function normalizeColorPayload(color) {
  if (color && typeof color === "object" && Number.isFinite(color.r) && Number.isFinite(color.g) && Number.isFinite(color.b)) {
    return {
      r: color.r,
      g: color.g,
      b: color.b,
      r01: Number.isFinite(color.r01) ? color.r01 : color.r / 255,
      g01: Number.isFinite(color.g01) ? color.g01 : color.g / 255,
      b01: Number.isFinite(color.b01) ? color.b01 : color.b / 255
    };
  }

  if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) {
    return hexToRgb(color);
  }

  return null;
}

function blendColors(a, b, amount) {
  return {
    r: Math.round(mixValue(a.r, b.r, amount)),
    g: Math.round(mixValue(a.g, b.g, amount)),
    b: Math.round(mixValue(a.b, b.b, amount))
  };
}

function parseRgb(value) {
  const [r, g, b] = value.split(",").map((channel) => Number(channel.trim()));
  return { r, g, b };
}

function hexToRgb(hex) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return { r, g, b, r01: r / 255, g01: g / 255, b01: b / 255 };
}

function hashString(input) {
  let hash = 0;

  for (let i = 0; i < input.length; i += 1) {
    hash = (hash * 31 + input.charCodeAt(i)) >>> 0;
  }

  return hash;
}

function hslToRgb(h, s, l) {
  const hue = h / 360;
  const sat = s / 100;
  const light = l / 100;

  if (sat === 0) {
    const gray = Math.round(light * 255);
    return { r: gray, g: gray, b: gray };
  }

  const q = light < 0.5 ? light * (1 + sat) : light + sat - light * sat;
  const p = 2 * light - q;

  return {
    r: Math.round(hueToRgb(p, q, hue + 1 / 3) * 255),
    g: Math.round(hueToRgb(p, q, hue) * 255),
    b: Math.round(hueToRgb(p, q, hue - 1 / 3) * 255),
    r01: hueToRgb(p, q, hue + 1 / 3),
    g01: hueToRgb(p, q, hue),
    b01: hueToRgb(p, q, hue - 1 / 3)
  };
}

function hueToRgb(p, q, t) {
  let value = t;

  if (value < 0) {
    value += 1;
  }

  if (value > 1) {
    value -= 1;
  }

  if (value < 1 / 6) {
    return p + (q - p) * 6 * value;
  }

  if (value < 1 / 2) {
    return q;
  }

  if (value < 2 / 3) {
    return p + (q - p) * (2 / 3 - value) * 6;
  }

  return p;
}

async function buildQrCode() {
  const base = `${window.location.protocol}//${window.location.host}`;

  try {
    const response = await fetch(`/qr?host=${encodeURIComponent(base)}`);
    const data = await response.json();

    if (data.dataUrl) {
      qrImage.src = data.dataUrl;
    }

    if (data.controllerUrl) {
      controllerLink.href = data.controllerUrl;
      controllerLink.textContent = data.controllerUrl;
    }
  } catch (error) {
    controllerLink.textContent = `${base}/controller`;
    controllerLink.href = `${base}/controller`;
  }
}
