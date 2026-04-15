const socket = io();
const surface = document.getElementById("controller-surface");
const indicator = document.getElementById("touch-indicator");
const colorPicker = document.getElementById("color-picker");
const selectedColorLabel = document.getElementById("selected-color-label");

const activePointers = new Map();
let rafToken = null;
const COLORS = [
  { hex: "#7dd3fc", label: "Blue" },
  { hex: "#fda4af", label: "Rose" },
  { hex: "#fdba74", label: "Amber" },
  { hex: "#86efac", label: "Green" },
  { hex: "#c4b5fd", label: "Violet" }
];
let selectedColor = COLORS[0].hex;

renderColorOptions();
applyControllerColor(selectedColor);
updateSelectedColorLabel();

surface.addEventListener("pointerdown", handlePointerDown);
surface.addEventListener("pointermove", handlePointerMove);
surface.addEventListener("pointerup", handlePointerEnd);
surface.addEventListener("pointercancel", handlePointerEnd);
surface.addEventListener("pointerleave", handlePointerEnd);
colorPicker.addEventListener("pointerdown", stopToolbarInteraction);
colorPicker.addEventListener("pointermove", stopToolbarInteraction);
colorPicker.addEventListener("click", stopToolbarInteraction);

function handlePointerDown(event) {
  surface.setPointerCapture(event.pointerId);
  const point = getNormalizedPoint(event);
  const pointer = {
    x: point.x,
    y: point.y,
    lastX: point.x,
    lastY: point.y,
    pressure: getPressure(event),
    startTime: performance.now()
  };

  activePointers.set(event.pointerId, pointer);
  updateIndicator(point.x, point.y, true);

  sendTouch("start", event.pointerId, point.x, point.y, pointer.pressure, 0, 0, 0);
}

function handlePointerMove(event) {
  if (!activePointers.has(event.pointerId)) {
    return;
  }

  const point = getNormalizedPoint(event);
  const pointer = activePointers.get(event.pointerId);
  const dx = point.x - pointer.lastX;
  const dy = point.y - pointer.lastY;
  const pressure = getPressure(event);

  pointer.x = point.x;
  pointer.y = point.y;
  pointer.lastX = point.x;
  pointer.lastY = point.y;
  pointer.pressure = pressure;

  updateIndicator(point.x, point.y, true);
  sendTouch("move", event.pointerId, point.x, point.y, pressure, dx, dy, getPointerDuration(pointer));
}

function handlePointerEnd(event) {
  if (!activePointers.has(event.pointerId)) {
    return;
  }

  const point = getNormalizedPoint(event);
  const pointer = activePointers.get(event.pointerId);

  activePointers.delete(event.pointerId);
  sendTouch("end", event.pointerId, point.x, point.y, pointer.pressure, 0, 0, getPointerDuration(pointer));

  if (activePointers.size === 0) {
    updateIndicator(point.x, point.y, false);
  }
}

function sendTouch(phase, pointerId, x, y, force, dx, dy, duration = 0) {
  socket.emit("controller:touch", {
    id: `${socket.id || "controller"}:${pointerId}`,
    phase,
    x,
    y,
    force,
    dx,
    dy,
    color: selectedColor,
    duration,
    type: duration >= 150 ? "hold" : "tap"
  });
}

function getNormalizedPoint(event) {
  const rect = surface.getBoundingClientRect();

  return {
    x: clamp((event.clientX - rect.left) / rect.width),
    y: clamp((event.clientY - rect.top) / rect.height)
  };
}

function getPressure(event) {
  if (typeof event.pressure === "number" && event.pressure > 0) {
    return clamp(event.pressure, 0.18, 1);
  }

  return 0.45;
}

function updateIndicator(x, y, isActive) {
  indicator.style.left = `${x * 100}%`;
  indicator.style.top = `${y * 100}%`;
  indicator.classList.toggle("active", isActive);
}

function renderColorOptions() {
  colorPicker.innerHTML = "";

  for (const colorOption of COLORS) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "color-chip";
    button.setAttribute("aria-label", `Choose color ${colorOption.label}`);
    button.title = colorOption.label;
    button.dataset.color = colorOption.hex;
    button.style.setProperty("--chip", colorOption.hex);
    button.classList.toggle("active", colorOption.hex === selectedColor);
    button.addEventListener("click", () => {
      selectedColor = colorOption.hex;
      applyControllerColor(colorOption.hex);
      updateColorSelection();
      updateSelectedColorLabel();
    });
    colorPicker.appendChild(button);
  }
}

function updateColorSelection() {
  const chips = colorPicker.querySelectorAll(".color-chip");

  for (const chip of chips) {
    chip.classList.toggle("active", chip.dataset.color === selectedColor);
  }
}

function applyControllerColor(color) {
  document.documentElement.style.setProperty("--controller-accent", color);
  indicator.style.borderColor = hexToRgba(color, 0.65);
  indicator.style.background = `radial-gradient(circle, ${hexToRgba(color, 0.28)}, ${hexToRgba(color, 0.03)} 65%, transparent 72%)`;
  indicator.style.boxShadow = `0 0 50px ${hexToRgba(color, 0.25)}`;
  selectedColorLabel.style.color = color;
}

function updateSelectedColorLabel() {
  const selected = COLORS.find((colorOption) => colorOption.hex === selectedColor);
  selectedColorLabel.textContent = selected ? selected.label : "Selected";
}

function clamp(value, min = 0, max = 1) {
  return Math.max(min, Math.min(max, value));
}

function getPointerDuration(pointer) {
  return Math.max(0, performance.now() - pointer.startTime);
}

function hexToRgba(hex, alpha) {
  const clean = hex.replace("#", "");
  const r = parseInt(clean.slice(0, 2), 16);
  const g = parseInt(clean.slice(2, 4), 16);
  const b = parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function stopToolbarInteraction(event) {
  event.stopPropagation();
}

function loop() {
  for (const [pointerId, pointer] of activePointers.entries()) {
    sendTouch("hold", pointerId, pointer.x, pointer.y, pointer.pressure, 0, 0, getPointerDuration(pointer));
  }

  rafToken = window.setTimeout(loop, 80);
}

loop();

window.addEventListener("beforeunload", () => {
  if (rafToken) {
    window.clearTimeout(rafToken);
  }
});
