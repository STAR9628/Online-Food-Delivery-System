const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;

// Simple in-memory store (we'll upgrade to file-based in a later step)
const DATA = {
  adminCredentials: { username: "admin", password: "admin123" },
  restaurants: [],
  menuItems: [],
  offers: [],
};

// MIME types
const MIME = {
  ".html": "text/html",
  ".css": "text/css",
  ".js": "application/javascript",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<h2>404 - Page Not Found</h2>");
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    res.end(data);
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

function jsonResponse(res, statusCode, data) {
  res.writeHead(statusCode, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split("?")[0];

  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    jsonResponse(res, 200, {});
    return;
  }

  // --- API ROUTES ---

  // POST /api/admin/login
  if (req.method === "POST" && urlPath === "/api/admin/login") {
    const body = await readBody(req);
    const { username, password } = body;
    if (
      username === DATA.adminCredentials.username &&
      password === DATA.adminCredentials.password
    ) {
      jsonResponse(res, 200, { success: true, message: "Login successful" });
    } else {
      jsonResponse(res, 401, { success: false, message: "Invalid credentials" });
    }
    return;
  }

  // --- STATIC FILE SERVING ---
  let filePath;
  if (urlPath === "/" || urlPath === "/splash") {
    filePath = path.join(__dirname, "../frontend/splash.html");
  } else {
    filePath = path.join(__dirname, "../frontend", urlPath);
  }

  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n🍔 Food Delivery Server running at http://localhost:${PORT}`);
  console.log(`📂 Serving frontend from: ${path.join(__dirname, "../frontend")}`);
  console.log(`🔐 Admin login: http://localhost:${PORT}/admin-login.html\n`);
});