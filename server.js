const path = require("path");
const http = require("http");
const express = require("express");
const { Server } = require("socket.io");
const QRCode = require("qrcode");

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (_req, res) => {
  res.redirect("/display");
});

app.get("/display", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "display.html"));
});

app.get("/controller", (_req, res) => {
  res.sendFile(path.join(__dirname, "public", "controller.html"));
});

app.get("/qr", async (req, res) => {
  const host = req.query.host;

  if (!host) {
    res.status(400).json({ error: "Missing host query parameter." });
    return;
  }

  const controllerUrl = `${host.replace(/\/$/, "")}/controller`;

  try {
    const dataUrl = await QRCode.toDataURL(controllerUrl, {
      margin: 1,
      width: 280,
      color: {
        dark: "#f4f1e8",
        light: "#0000"
      }
    });

    res.json({ dataUrl, controllerUrl });
  } catch (error) {
    res.status(500).json({ error: "Failed to generate QR code." });
  }
});

io.on("connection", (socket) => {
  socket.on("controller:touch", (payload = {}) => {
    const normalizedPayload = {
      id: typeof payload.id === "string" ? payload.id : socket.id,
      phase: payload.phase,
      x: clampNumber(payload.x),
      y: clampNumber(payload.y),
      force: clampNumber(payload.force, 0, 1),
      dx: clampSignedNumber(payload.dx),
      dy: clampSignedNumber(payload.dy),
      color: sanitizeColor(payload.color),
      duration: clampDuration(payload.duration),
      type: payload.type === "hold" ? "hold" : "tap",
      time: Date.now()
    };

    if (!normalizedPayload.phase) {
      return;
    }

    io.emit("field:disturbance", normalizedPayload);
  });

  socket.on("field:reset", () => {
    io.emit("field:reset");
  });
});

server.listen(PORT, () => {
  console.log(`Shared relational field listening on http://localhost:${PORT}`);
});

function clampNumber(value, min = 0, max = 1) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(min, Math.min(max, numeric));
}

function clampSignedNumber(value, limit = 1) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(-limit, Math.min(limit, numeric));
}

function sanitizeColor(value) {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();

  if (/^#[0-9a-fA-F]{6}$/.test(trimmed)) {
    return trimmed.toLowerCase();
  }

  return null;
}

function clampDuration(value) {
  const numeric = Number(value);

  if (!Number.isFinite(numeric)) {
    return 0;
  }

  return Math.max(0, Math.min(60000, numeric));
}
