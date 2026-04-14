const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const DATA_FILE = path.join(__dirname, "data.json");

// ===== DATA HELPERS =====
function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    const initial = { restaurants: [], menuItems: [], offers: [] };
    fs.writeFileSync(DATA_FILE, JSON.stringify(initial, null, 2));
    return initial;
  }
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf-8"));
  // Ensure offers array exists in older data files
  if (!data.offers) data.offers = [];
  return data;
}

function saveData(data) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

// ===== STATIC FILE SERVING =====
const MIME = {
  ".html": "text/html", ".css": "text/css",
  ".js": "application/javascript", ".json": "application/json",
  ".png": "image/png", ".jpg": "image/jpeg",
  ".svg": "image/svg+xml", ".ico": "image/x-icon",
};

function serveFile(res, filePath) {
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { "Content-Type": "text/html" });
      res.end("<h2>404 – Not Found</h2>");
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
    req.on("end", () => { try { resolve(JSON.parse(body)); } catch { resolve({}); } });
  });
}

function json(res, status, data) {
  res.writeHead(status, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(JSON.stringify(data));
}

// ===== SERVER =====
const server = http.createServer(async (req, res) => {
  const urlPath = req.url.split("?")[0];

  if (req.method === "OPTIONS") { json(res, 200, {}); return; }

  // --- ADMIN LOGIN ---
  if (req.method === "POST" && urlPath === "/api/admin/login") {
    const { username, password } = await readBody(req);
    if (username === "admin" && password === "admin123") {
      json(res, 200, { success: true });
    } else {
      json(res, 401, { success: false, message: "Invalid credentials" });
    }
    return;
  }

  // --- RESTAURANTS ---
  if (urlPath === "/api/restaurants") {
    const data = loadData();
    if (req.method === "GET") {
      json(res, 200, { success: true, restaurants: data.restaurants });
      return;
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      const { name, cuisine, logo, deliveryTime, rating } = body;
      if (!name || !cuisine) { json(res, 400, { success: false, message: "Name and cuisine required" }); return; }
      const restaurant = {
        id: Date.now().toString(),
        name: name.trim(),
        cuisine: cuisine.trim(),
        logo: logo?.trim() || "",
        deliveryTime: deliveryTime || "30-40",
        rating: parseFloat(rating) || 4.0,
        createdAt: new Date().toISOString(),
      };
      data.restaurants.push(restaurant);
      saveData(data);
      json(res, 201, { success: true, restaurant });
      return;
    }
  }

  // DELETE /api/restaurants/:id
  const deleteRestMatch = urlPath.match(/^\/api\/restaurants\/(.+)$/);
  if (req.method === "DELETE" && deleteRestMatch) {
    const id = deleteRestMatch[1];
    const data = loadData();
    const index = data.restaurants.findIndex((r) => r.id === id);
    if (index === -1) { json(res, 404, { success: false, message: "Not found" }); return; }
    data.restaurants.splice(index, 1);
    saveData(data);
    json(res, 200, { success: true, message: "Deleted" });
    return;
  }

  // --- MENU ITEMS ---
  if (urlPath === "/api/menu") {
    const data = loadData();
    if (req.method === "GET") {
      const params = new URLSearchParams(req.url.split("?")[1] || "");
      const restaurantId = params.get("restaurantId");
      const items = restaurantId
        ? data.menuItems.filter((m) => m.restaurantId === restaurantId)
        : data.menuItems;
      json(res, 200, { success: true, menuItems: items });
      return;
    }
    if (req.method === "POST") {
      const body = await readBody(req);
      const { restaurantId, name, price, category, isVeg, description } = body;
      if (!restaurantId || !name || !price) {
        json(res, 400, { success: false, message: "Restaurant, name and price are required" });
        return;
      }
      const restaurant = data.restaurants.find((r) => r.id === restaurantId);
      if (!restaurant) {
        json(res, 404, { success: false, message: "Restaurant not found" });
        return;
      }
      const item = {
        id: Date.now().toString(),
        restaurantId,
        restaurantName: restaurant.name,
        name: name.trim(),
        price: parseFloat(price),
        category: category?.trim() || "Main Course",
        isVeg: isVeg === true || isVeg === "true",
        description: description?.trim() || "",
        createdAt: new Date().toISOString(),
      };
      data.menuItems.push(item);
      saveData(data);
      json(res, 201, { success: true, item });
      return;
    }
  }

  // DELETE /api/menu/:id
  const deleteMenuMatch = urlPath.match(/^\/api\/menu\/(.+)$/);
  if (req.method === "DELETE" && deleteMenuMatch) {
    const id = deleteMenuMatch[1];
    const data = loadData();
    const index = data.menuItems.findIndex((m) => m.id === id);
    if (index === -1) { json(res, 404, { success: false, message: "Item not found" }); return; }
    data.menuItems.splice(index, 1);
    saveData(data);
    json(res, 200, { success: true, message: "Deleted" });
    return;
  }

  // =====================================================
  // --- STEP 4: OFFERS ---
  // =====================================================

  // GET /api/offers  →  list all offers
  // POST /api/offers →  create offer
  if (urlPath === "/api/offers") {
    const data = loadData();

    if (req.method === "GET") {
      json(res, 200, { success: true, offers: data.offers });
      return;
    }

    if (req.method === "POST") {
      const body = await readBody(req);
      const { code, discount, restaurantId, expiryDate } = body;

      // Validation
      if (!code || !discount || !restaurantId || !expiryDate) {
        json(res, 400, { success: false, message: "All fields are required" });
        return;
      }
      if (discount < 1 || discount > 100) {
        json(res, 400, { success: false, message: "Discount must be between 1 and 100" });
        return;
      }

      // Duplicate code check (case-insensitive)
      const duplicate = data.offers.find(
        (o) => o.code.toUpperCase() === code.toUpperCase().trim()
      );
      if (duplicate) {
        json(res, 409, { success: false, message: `Offer code "${code.toUpperCase()}" already exists` });
        return;
      }

      // Restaurant must exist
      const restaurant = data.restaurants.find((r) => r.id === restaurantId);
      if (!restaurant) {
        json(res, 404, { success: false, message: "Restaurant not found" });
        return;
      }

      const offer = {
        id: Date.now().toString(),
        code: code.toUpperCase().trim(),
        discount: parseFloat(discount),
        restaurantId,
        restaurantName: restaurant.name,
        expiryDate,                          // stored as "YYYY-MM-DD"
        createdAt: new Date().toISOString(),
      };

      data.offers.push(offer);
      saveData(data);
      json(res, 201, { success: true, offer });
      return;
    }
  }

  // DELETE /api/offers/:id
  const deleteOfferMatch = urlPath.match(/^\/api\/offers\/(.+)$/);
  if (req.method === "DELETE" && deleteOfferMatch) {
    const id = deleteOfferMatch[1];
    const data = loadData();
    const index = data.offers.findIndex((o) => o.id === id);
    if (index === -1) { json(res, 404, { success: false, message: "Offer not found" }); return; }
    data.offers.splice(index, 1);
    saveData(data);
    json(res, 200, { success: true, message: "Offer deleted" });
    return;
  }

  // --- STATIC FILES ---
  let filePath;
  if (urlPath === "/" || urlPath === "/splash") {
    filePath = path.join(__dirname, "../frontend/splash.html");
  } else {
    filePath = path.join(__dirname, "../frontend", urlPath);
  }
  serveFile(res, filePath);
});

server.listen(PORT, () => {
  console.log(`\n🍔 FoodDash running → http://localhost:${PORT}`);
  console.log(`🔐 Admin login   → http://localhost:${PORT}/admin-login.html\n`);
});