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