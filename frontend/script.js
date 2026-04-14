// ===== CONFIG =====
const API_BASE = "http://localhost:3000";

// ===== UTILS =====
function $(id) { return document.getElementById(id); }

function showAlert(id, message, type = "error") {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type} show`;
  setTimeout(() => el.classList.remove("show"), 4000);
}

function setLoading(btnId, on) {
  const btn = $(btnId);
  if (!btn) return;
  btn.classList.toggle("loading", on);
  btn.disabled = on;
}

// ===== ADMIN LOGIN =====
async function handleLogin() {
  const username = $("username")?.value.trim();
  const password = $("password")?.value.trim();

  $("usernameError")?.classList.remove("show");
  $("passwordError")?.classList.remove("show");
  $("username")?.classList.remove("error");
  $("password")?.classList.remove("error");

  let hasError = false;
  if (!username) { $("usernameError")?.classList.add("show"); $("username")?.classList.add("error"); hasError = true; }
  if (!password) { $("passwordError")?.classList.add("show"); $("password")?.classList.add("error"); hasError = true; }
  if (hasError) return;

  setLoading("loginBtn", true);
  try {
    const res = await fetch(`${API_BASE}/api/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    const data = await res.json();
    if (data.success) {
      sessionStorage.setItem("adminLoggedIn", "true");
      sessionStorage.setItem("adminUser", username);
      showAlert("loginSuccess", "✅ Login successful! Redirecting...", "success");
      setTimeout(() => { window.location.href = "admin.html"; }, 1000);
    } else {
      showAlert("loginError", "❌ " + data.message);
    }
  } catch {
    showAlert("loginError", "❌ Cannot connect to server. Is it running?");
  } finally {
    setLoading("loginBtn", false);
  }
}

document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && $("loginBtn")) handleLogin();
});

$("togglePass")?.addEventListener("click", () => {
  const p = $("password");
  const btn = $("togglePass");
  p.type = p.type === "password" ? "text" : "password";
  btn.textContent = p.type === "password" ? "👁" : "🙈";
});

// ===== ADMIN DASHBOARD =====
function logout() {
  sessionStorage.clear();
  window.location.href = "admin-login.html";
}

function toggleSidebar() {
  document.getElementById("sidebar")?.classList.toggle("open");
}

// Sidebar navigation
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", (e) => {
    e.preventDefault();
    const section = item.dataset.section;
    if (!section) return;

    document.querySelectorAll(".nav-item").forEach((n) => n.classList.remove("active"));
    document.querySelectorAll(".admin-section").forEach((s) => s.classList.remove("active"));

    item.classList.add("active");
    $(`section-${section}`)?.classList.add("active");
    if ($("topbarTitle")) $("topbarTitle").textContent = item.querySelector("span:last-child")?.textContent;

    // Close sidebar on mobile
    document.getElementById("sidebar")?.classList.remove("open");
  });
});

// Set admin name in sidebar
const adminUser = sessionStorage.getItem("adminUser");
if ($("adminName") && adminUser) $("adminName").textContent = adminUser;

// ===== MODAL HELPERS =====
function openModal(id) { $(id)?.classList.add("open"); }
function closeModal(id) { $(id)?.classList.remove("open"); }
function closeModalOutside(e, id) { if (e.target.id === id) closeModal(id); }

// ===== RESTAURANTS =====
let allRestaurants = [];
let deleteTargetId = null;

async function loadRestaurants() {
  try {
    const res = await fetch(`${API_BASE}/api/restaurants`);
    const data = await res.json();
    if (data.success) {
      allRestaurants = data.restaurants;
      renderRestaurants(allRestaurants);
      if ($("totalRestaurants")) $("totalRestaurants").textContent = allRestaurants.length;
    }
  } catch {
    showAlert("restError", "❌ Failed to load restaurants. Is server running?");
  }
}

function renderRestaurants(list) {
  const container = $("restaurantList");
  if (!container) return;

  if (list.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span>🏪</span>
        <p>No restaurants yet</p>
        <small>Click "Add Restaurant" to get started</small>
      </div>`;
    return;
  }

  container.innerHTML = list.map((r) => `
    <div class="restaurant-row" id="rest-${r.id}">
      <div class="rest-logo">
        ${r.logo
          ? `<img src="${r.logo}" alt="${r.name}" onerror="this.parentElement.textContent='${r.name.charAt(0)}'"/>`
          : r.name.charAt(0)
        }
      </div>
      <div class="rest-info">
        <div class="rest-name">${r.name}</div>
        <div class="rest-meta">
          <span>🍽️ ${r.cuisine}</span>
          <span>⏱️ ${r.deliveryTime} mins</span>
          <span>⭐ ${r.rating}</span>
        </div>
      </div>
      <div class="rest-actions">
        <button class="icon-btn delete" onclick="askDelete('${r.id}', '${r.name.replace(/'/g, "\\'")}')">🗑️</button>
      </div>
    </div>
  `).join("");
}

function filterRestaurants(query) {
  const q = query.toLowerCase();
  const filtered = allRestaurants.filter(
    (r) => r.name.toLowerCase().includes(q) || r.cuisine.toLowerCase().includes(q)
  );
  renderRestaurants(filtered);
}

async function saveRestaurant() {
  const name = $("restName")?.value.trim();
  const cuisine = $("restCuisine")?.value.trim();
  const logo = $("restLogo")?.value.trim();
  const deliveryTime = $("restDelivery")?.value;
  const rating = $("restRating")?.value;

  // Validate
  let hasError = false;
  $("restNameErr")?.classList.remove("show");
  $("restCuisineErr")?.classList.remove("show");
  if (!name) { $("restNameErr")?.classList.add("show"); hasError = true; }
  if (!cuisine) { $("restCuisineErr")?.classList.add("show"); hasError = true; }
  if (hasError) return;

  setLoading("saveRestBtn", true);
  try {
    const res = await fetch(`${API_BASE}/api/restaurants`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, cuisine, logo, deliveryTime, rating }),
    });
    const data = await res.json();
    if (data.success) {
      closeModal("addRestaurantModal");
      clearRestaurantForm();
      showAlert("restSuccess", `✅ "${name}" added successfully!`, "success");
      loadRestaurants();
    } else {
      showAlert("restError", "❌ " + data.message);
    }
  } catch {
    showAlert("restError", "❌ Failed to save. Is server running?");
  } finally {
    setLoading("saveRestBtn", false);
  }
}

function clearRestaurantForm() {
  ["restName", "restCuisine", "restLogo", "restRating"].forEach((id) => {
    if ($(id)) $(id).value = id === "restRating" ? "4.0" : "";
  });
  if ($("restDelivery")) $("restDelivery").value = "30-40";
}

function askDelete(id, name) {
  deleteTargetId = id;
  if ($("deleteRestName")) $("deleteRestName").textContent = name;
  openModal("deleteModal");
}

async function confirmDelete() {
  if (!deleteTargetId) return;
  setLoading("confirmDeleteBtn", true);
  try {
    const res = await fetch(`${API_BASE}/api/restaurants/${deleteTargetId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      closeModal("deleteModal");
      showAlert("restSuccess", "✅ Restaurant deleted.", "success");
      loadRestaurants();
    } else {
      showAlert("restError", "❌ " + data.message);
    }
  } catch {
    showAlert("restError", "❌ Failed to delete.");
  } finally {
    setLoading("confirmDeleteBtn", false);
    deleteTargetId = null;
  }
}

// ===== INIT =====
if ($("restaurantList")) loadRestaurants();
// ===== MENU ITEMS =====
let allMenuItems = [];
let deleteMenuTargetId = null;
let menuSearchQuery = "";
let menuRestFilterValue = "";

function openMenuModal() {
  // Populate restaurant dropdown
  const sel = $("menuRestaurant");
  if (sel) {
    sel.innerHTML = `<option value="">-- Select Restaurant --</option>` +
      allRestaurants.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");
  }
  openModal("addMenuModal");
}

async function loadMenuItems() {
  try {
    const res = await fetch(`${API_BASE}/api/menu`);
    const data = await res.json();
    if (data.success) {
      allMenuItems = data.menuItems;
      renderMenuStats();
      renderMenuList();
      populateMenuRestFilter();
    }
  } catch {
    showAlert("menuError", "❌ Failed to load menu items.");
  }
}

function renderMenuStats() {
  const veg = allMenuItems.filter((i) => i.isVeg).length;
  if ($("totalMenuItems")) $("totalMenuItems").textContent = allMenuItems.length;
  if ($("totalVegItems")) $("totalVegItems").textContent = veg;
  if ($("totalNonVegItems")) $("totalNonVegItems").textContent = allMenuItems.length - veg;
}

function populateMenuRestFilter() {
  const sel = $("menuRestFilter");
  if (!sel) return;
  const current = sel.value;
  sel.innerHTML = `<option value="">🏪 All Restaurants</option>` +
    allRestaurants.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");
  sel.value = current;
}

function filterMenuByRestaurant(val) {
  menuRestFilterValue = val;
  renderMenuList();
}

function filterMenuBySearch(val) {
  menuSearchQuery = val.toLowerCase();
  renderMenuList();
}

function renderMenuList() {
  const container = $("menuList");
  if (!container) return;

  let items = allMenuItems;

  if (menuRestFilterValue) {
    items = items.filter((i) => i.restaurantId === menuRestFilterValue);
  }
  if (menuSearchQuery) {
    items = items.filter(
      (i) =>
        i.name.toLowerCase().includes(menuSearchQuery) ||
        i.category.toLowerCase().includes(menuSearchQuery)
    );
  }

  if (items.length === 0) {
    container.innerHTML = `
      <div class="card">
        <div class="empty-state">
          <span>🍽️</span>
          <p>No menu items found</p>
          <small>Add items using the "+ Add Menu Item" button</small>
        </div>
      </div>`;
    return;
  }

  // Group by restaurant
  const groups = {};
  items.forEach((item) => {
    if (!groups[item.restaurantId]) {
      groups[item.restaurantId] = {
        name: item.restaurantName,
        items: [],
      };
    }
    groups[item.restaurantId].items.push(item);
  });

  container.innerHTML = Object.entries(groups).map(([restId, group]) => `
    <div class="menu-group">
      <div class="menu-group-header">
        <span>🏪</span>
        <span>${group.name}</span>
        <span class="menu-group-count">${group.items.length} items</span>
      </div>
      ${group.items.map((item) => `
        <div class="menu-item-row" id="menu-${item.id}">
          <div class="veg-dot ${item.isVeg ? "veg" : "nonveg"}"></div>
          <div class="menu-item-info">
            <div class="menu-item-name">${item.name}</div>
            <div class="menu-item-meta">
              <span>📂 ${item.category}</span>
              ${item.description ? `<span>• ${item.description}</span>` : ""}
            </div>
          </div>
          <div class="menu-item-price">₹${item.price}</div>
          <div class="rest-actions">
            <button class="icon-btn delete" onclick="askDeleteMenu('${item.id}', '${item.name.replace(/'/g, "\\'")}')">🗑️</button>
          </div>
        </div>
      `).join("")}
    </div>
  `).join("");
}

async function saveMenuItem() {
  const restaurantId = $("menuRestaurant")?.value;
  const name = $("menuName")?.value.trim();
  const price = $("menuPrice")?.value;
  const category = $("menuCategory")?.value;
  const description = $("menuDescription")?.value.trim();
  const isVeg = document.querySelector('input[name="vegType"]:checked')?.value === "true";

  // Clear errors
  ["menuRestErr", "menuNameErr", "menuPriceErr"].forEach((id) => $(`${id}`)?.classList.remove("show"));

  let hasError = false;
  if (!restaurantId) { $("menuRestErr")?.classList.add("show"); hasError = true; }
  if (!name) { $("menuNameErr")?.classList.add("show"); hasError = true; }
  if (!price || parseFloat(price) <= 0) { $("menuPriceErr")?.classList.add("show"); hasError = true; }
  if (hasError) return;

  setLoading("saveMenuBtn", true);
  try {
    const res = await fetch(`${API_BASE}/api/menu`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ restaurantId, name, price, category, isVeg, description }),
    });
    const data = await res.json();
    if (data.success) {
      closeModal("addMenuModal");
      clearMenuForm();
      showAlert("menuSuccess", `✅ "${name}" added successfully!`, "success");
      loadMenuItems();
    } else {
      showAlert("menuError", "❌ " + data.message);
    }
  } catch {
    showAlert("menuError", "❌ Failed to save. Is server running?");
  } finally {
    setLoading("saveMenuBtn", false);
  }
}

function clearMenuForm() {
  ["menuName", "menuPrice", "menuDescription"].forEach((id) => { if ($(id)) $(id).value = ""; });
  if ($("menuRestaurant")) $("menuRestaurant").value = "";
  if ($("menuCategory")) $("menuCategory").value = "Main Course";
  const vegRadio = document.querySelector('input[name="vegType"][value="true"]');
  if (vegRadio) vegRadio.checked = true;
}

function askDeleteMenu(id, name) {
  deleteMenuTargetId = id;
  if ($("deleteMenuName")) $("deleteMenuName").textContent = name;
  openModal("deleteMenuModal");
}

async function confirmDeleteMenu() {
  if (!deleteMenuTargetId) return;
  setLoading("confirmDeleteMenuBtn", true);
  try {
    const res = await fetch(`${API_BASE}/api/menu/${deleteMenuTargetId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      closeModal("deleteMenuModal");
      showAlert("menuSuccess", "✅ Item deleted.", "success");
      loadMenuItems();
    } else {
      showAlert("menuError", "❌ " + data.message);
    }
  } catch {
    showAlert("menuError", "❌ Failed to delete.");
  } finally {
    setLoading("confirmDeleteMenuBtn", false);
    deleteMenuTargetId = null;
  }
}

// Load menu items when menu section becomes active
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    if (item.dataset.section === "menu") loadMenuItems();
  });
});

// Also init if already on menu section
if ($("menuList")) loadMenuItems();

// =====================================================
// ===== STEP 4: OFFERS & DISCOUNTS =====
// Append this entire block to the END of script.js
// =====================================================

let allOffers = [];
let offerSearchQuery = "";
let deleteOfferTargetId = null;

// ── Load offers from backend ──────────────────────────
async function loadOffers() {
  try {
    const res = await fetch(`${API_BASE}/api/offers`);
    const data = await res.json();
    if (data.success) {
      allOffers = data.offers;
      renderOfferStats();
      renderOffers();
    }
  } catch {
    showAlert("offerError", "❌ Failed to load offers. Is server running?");
  }
}

// ── Open the Add Offer modal ──────────────────────────
function openOfferModal() {
  // Set minimum expiry date to today
  const today = new Date().toISOString().split("T")[0];
  const expiryInput = $("offerExpiry");
  if (expiryInput) expiryInput.min = today;

  // Populate restaurant dropdown from already-loaded allRestaurants
  const sel = $("offerRestaurant");
  if (sel) {
    sel.innerHTML =
      `<option value="">-- Select Restaurant --</option>` +
      allRestaurants.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");
  }

  openModal("addOfferModal");
}

// ── Save a new offer ──────────────────────────────────
async function saveOffer() {
  const code         = $("offerCode")?.value.trim().toUpperCase();
  const discount     = parseFloat($("offerDiscount")?.value);
  const restaurantId = $("offerRestaurant")?.value;
  const expiryDate   = $("offerExpiry")?.value;

  // Clear previous errors
  ["offerCodeErr", "offerDiscountErr", "offerRestErr", "offerExpiryErr"].forEach(
    (id) => $(id)?.classList.remove("show")
  );

  let hasError = false;
  if (!code)                          { $("offerCodeErr")?.classList.add("show");     hasError = true; }
  if (!discount || discount < 1 || discount > 100) { $("offerDiscountErr")?.classList.add("show"); hasError = true; }
  if (!restaurantId)                  { $("offerRestErr")?.classList.add("show");     hasError = true; }
  if (!expiryDate)                    { $("offerExpiryErr")?.classList.add("show");   hasError = true; }
  if (hasError) return;

  setLoading("saveOfferBtn", true);
  try {
    const res = await fetch(`${API_BASE}/api/offers`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ code, discount, restaurantId, expiryDate }),
    });
    const data = await res.json();

    if (data.success) {
      closeModal("addOfferModal");
      clearOfferForm();
      showAlert("offerSuccess", `✅ Offer "${code}" created successfully!`, "success");
      loadOffers();
    } else {
      showAlert("offerError", "❌ " + data.message);
    }
  } catch {
    showAlert("offerError", "❌ Failed to save. Is server running?");
  } finally {
    setLoading("saveOfferBtn", false);
  }
}

// ── Clear the form inputs ────────────────────────────
function clearOfferForm() {
  ["offerCode", "offerDiscount", "offerExpiry"].forEach((id) => {
    if ($(id)) $(id).value = "";
  });
  if ($("offerRestaurant")) $("offerRestaurant").value = "";
}

// ── Helper: is an offer expired? ─────────────────────
function isOfferExpired(expiryDate) {
  const today  = new Date();
  today.setHours(0, 0, 0, 0);
  const expiry = new Date(expiryDate);
  return expiry < today;
}

// ── Render stats row ─────────────────────────────────
function renderOfferStats() {
  const active  = allOffers.filter((o) => !isOfferExpired(o.expiryDate)).length;
  const expired = allOffers.length - active;
  if ($("totalOffers"))   $("totalOffers").textContent   = allOffers.length;
  if ($("activeOffers"))  $("activeOffers").textContent  = active;
  if ($("expiredOffers")) $("expiredOffers").textContent = expired;
}

// ── Filter by search query ───────────────────────────
function filterOffersBySearch(val) {
  offerSearchQuery = val.toLowerCase();
  renderOffers();
}

// ── Render the offers table ───────────────────────────
function renderOffers() {
  const container = $("offersList");
  if (!container) return;

  const statusFilter = $("offerStatusFilter")?.value || "";

  let items = allOffers.filter((o) => {
    const expired = isOfferExpired(o.expiryDate);

    // Status filter
    if (statusFilter === "active"  &&  expired) return false;
    if (statusFilter === "expired" && !expired) return false;

    // Search filter
    if (offerSearchQuery) {
      const inCode = o.code.toLowerCase().includes(offerSearchQuery);
      const inRest = o.restaurantName.toLowerCase().includes(offerSearchQuery);
      if (!inCode && !inRest) return false;
    }

    return true;
  });

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <span>🏷️</span>
        <p>No offers found</p>
        <small>Click "+ Add Offer" to create your first discount</small>
      </div>`;
    return;
  }

  // Format date nicely
  function fmtDate(str) {
    return new Date(str).toLocaleDateString("en-IN", {
      day: "2-digit", month: "short", year: "numeric",
    });
  }

  container.innerHTML = `
    <table class="offers-table">
      <thead>
        <tr>
          <th>#</th>
          <th>Code</th>
          <th>Discount</th>
          <th>Restaurant</th>
          <th>Expiry Date</th>
          <th>Status</th>
          <th>Action</th>
        </tr>
      </thead>
      <tbody>
        ${items.map((o, i) => {
          const expired = isOfferExpired(o.expiryDate);
          return `
          <tr>
            <td style="color:var(--grey-3);font-size:13px;">${i + 1}</td>
            <td><span class="offer-code-badge">${o.code}</span></td>
            <td><span class="discount-pill">🏷️ ${o.discount}% OFF</span></td>
            <td style="font-weight:500;">${o.restaurantName}</td>
            <td style="color:var(--grey-2);font-size:13px;">${fmtDate(o.expiryDate)}</td>
            <td>
              ${expired
                ? `<span class="status-badge expired">❌ Expired</span>`
                : `<span class="status-badge active">✅ Active</span>`
              }
            </td>
            <td>
              <button class="icon-btn delete" title="Delete offer"
                onclick="askDeleteOffer('${o.id}', '${o.code}')">🗑️</button>
            </td>
          </tr>`;
        }).join("")}
      </tbody>
    </table>`;
}

// ── Delete flow ───────────────────────────────────────
function askDeleteOffer(id, code) {
  deleteOfferTargetId = id;
  if ($("deleteOfferCode")) $("deleteOfferCode").textContent = code;
  openModal("deleteOfferModal");
}

async function confirmDeleteOffer() {
  if (!deleteOfferTargetId) return;
  setLoading("confirmDeleteOfferBtn", true);
  try {
    const res  = await fetch(`${API_BASE}/api/offers/${deleteOfferTargetId}`, { method: "DELETE" });
    const data = await res.json();
    if (data.success) {
      closeModal("deleteOfferModal");
      showAlert("offerSuccess", "✅ Offer deleted.", "success");
      loadOffers();
    } else {
      showAlert("offerError", "❌ " + data.message);
    }
  } catch {
    showAlert("offerError", "❌ Failed to delete.");
  } finally {
    setLoading("confirmDeleteOfferBtn", false);
    deleteOfferTargetId = null;
  }
}

// ── Hook into sidebar nav click ───────────────────────
document.querySelectorAll(".nav-item").forEach((item) => {
  item.addEventListener("click", () => {
    if (item.dataset.section === "offers") {
      loadOffers();
      // Re-populate restaurant list in case it changed
      const sel = $("offerRestaurant");
      if (sel) {
        sel.innerHTML =
          `<option value="">-- Select Restaurant --</option>` +
          allRestaurants.map((r) => `<option value="${r.id}">${r.name}</option>`).join("");
      }
    }
  });
});

// Also wire the "+ Add Offer" button to use openOfferModal
// (it is called directly from onclick in HTML, see offers_section.html)