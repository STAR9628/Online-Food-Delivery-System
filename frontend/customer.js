// ===================================================
//  customer.js  –  Customer UI Logic
//  FoodDash Online Food Delivery System
//
//  Covers:
//    - Restaurant listing + search filter
//    - Restaurant menu modal
//    - Cart (add / remove / qty)
//    - Offers banner + offer code apply
// ===================================================

const API_BASE = "http://localhost:3000";

// ===== STATE =====
let allRestaurants = [];
let allOffers = [];
let cart = [];              // [{ item, qty }]
let activeOffer = null;     // { code, discount, restaurantId }
let currentRestaurant = null;

// ===================================================
// 1. STARTUP — load restaurants + offers on page load
// ===================================================
document.addEventListener("DOMContentLoaded", () => {
  loadRestaurants();
  loadOffers();
});

// ===================================================
// 2. RESTAURANTS
// ===================================================
async function loadRestaurants() {
  try {
    const res  = await fetch(`${API_BASE}/api/restaurants`);
    const data = await res.json();

    if (data.success) {
      allRestaurants = data.restaurants;
      renderRestaurants(allRestaurants);
    } else {
      showError();
    }
  } catch {
    showError();
  }
}

function renderRestaurants(list) {
  const skeleton = document.getElementById("skeletonGrid");
  const grid     = document.getElementById("restaurantGrid");
  const empty    = document.getElementById("emptyState");
  const count    = document.getElementById("restCount");

  // Hide skeleton
  skeleton.style.display = "none";

  if (list.length === 0) {
    grid.style.display  = "none";
    empty.style.display = "block";
    count.textContent   = "";
    return;
  }

  empty.style.display = "none";
  grid.style.display  = "grid";
  count.textContent   = `${list.length} restaurant${list.length !== 1 ? "s" : ""} nearby`;

  grid.innerHTML = list.map(r => `
    <div class="restaurant-card" onclick="openMenu('${r.id}')">
      <div class="card-logo-area">
        ${r.logo
          ? `<img src="${r.logo}" alt="${r.name}" onerror="this.style.display='none'; this.nextElementSibling.style.display='flex';"/>
             <div class="card-logo-placeholder" style="display:none;">${r.name.charAt(0).toUpperCase()}</div>`
          : `<div class="card-logo-placeholder">${r.name.charAt(0).toUpperCase()}</div>`
        }
      </div>
      <div class="card-body">
        <div class="card-name" title="${r.name}">${r.name}</div>
        <div class="card-meta">
          <span class="card-cuisine">${r.cuisine}</span>
          <span class="card-rating">⭐ ${r.rating || "4.0"}</span>
          <span class="card-delivery">🕐 ${r.deliveryTime || "30-40"} min</span>
        </div>
      </div>
    </div>
  `).join("");
}

function showError() {
  document.getElementById("skeletonGrid").style.display = "none";
  document.getElementById("restaurantGrid").style.display = "none";
  document.getElementById("errorState").style.display = "block";
}

// Search / Filter
function filterRestaurants(query) {
  const q = query.toLowerCase().trim();
  if (!q) {
    renderRestaurants(allRestaurants);
    return;
  }
  const filtered = allRestaurants.filter(r =>
    r.name.toLowerCase().includes(q) ||
    r.cuisine.toLowerCase().includes(q)
  );
  renderRestaurants(filtered);
}

// ===================================================
// 3. OFFERS BANNER
// ===================================================
async function loadOffers() {
  try {
    const res  = await fetch(`${API_BASE}/api/offers`);
    const data = await res.json();

    if (data.success && data.offers.length > 0) {
      const today  = new Date().toISOString().split("T")[0];
      // Only show non-expired offers
      allOffers = data.offers.filter(o => o.expiryDate >= today);

      if (allOffers.length > 0) {
        renderOffersBanner(allOffers);
      }
    }
  } catch {
    // Silently fail — offers banner is optional
  }
}

function renderOffersBanner(offers) {
  const banner = document.getElementById("offersBanner");
  const scroll = document.getElementById("offersScroll");

  scroll.innerHTML = offers.map(o => `
    <div class="offer-chip">
      <strong>${o.code}</strong> · ${o.discount}% off at ${o.restaurantName}
    </div>
  `).join("");

  banner.style.display = "block";
}

// ===================================================
// 4. MENU MODAL
// ===================================================
async function openMenu(restaurantId) {
  currentRestaurant = allRestaurants.find(r => r.id === restaurantId);
  if (!currentRestaurant) return;

  // Set restaurant info in modal
  document.getElementById("menuRestName").textContent    = currentRestaurant.name;
  document.getElementById("menuRestCuisine").textContent = currentRestaurant.cuisine;
  document.getElementById("menuRestLogo").src            = currentRestaurant.logo || "";

  // Show modal, reset state
  document.getElementById("menuModal").classList.add("open");
  document.getElementById("menuLoading").style.display = "flex";
  document.getElementById("menuContent").style.display = "none";
  document.getElementById("menuEmpty").style.display   = "none";

  try {
    const res  = await fetch(`${API_BASE}/api/menu?restaurantId=${restaurantId}`);
    const data = await res.json();

    document.getElementById("menuLoading").style.display = "none";

    if (data.success && data.menuItems.length > 0) {
      renderMenu(data.menuItems);
      document.getElementById("menuContent").style.display = "block";
    } else {
      document.getElementById("menuEmpty").style.display = "block";
    }
  } catch {
    document.getElementById("menuLoading").style.display = "none";
    document.getElementById("menuEmpty").style.display   = "block";
  }
}

function renderMenu(items) {
  // Group items by category
  const groups = {};
  items.forEach(item => {
    const cat = item.category || "Other";
    if (!groups[cat]) groups[cat] = [];
    groups[cat].push(item);
  });

  const content = document.getElementById("menuContent");
  content.innerHTML = Object.entries(groups).map(([category, catItems]) => `
    <div class="menu-category">
      <div class="category-title">${category}</div>
      ${catItems.map(item => `
        <div class="menu-item-row">
          <div class="veg-badge ${item.isVeg ? 'veg' : 'non-veg'}"></div>
          <div class="menu-item-info">
            <div class="menu-item-name">${item.name}</div>
            ${item.description
              ? `<div class="menu-item-desc">${item.description}</div>`
              : ""
            }
          </div>
          <div class="menu-item-price">₹${item.price}</div>
          <button class="add-btn" onclick="addToCart(${JSON.stringify(item).replace(/"/g, '&quot;')})">
            + Add
          </button>
        </div>
      `).join("")}
    </div>
  `).join("");
}

function closeMenuModal(e) {
  // Close only if clicking the overlay background
  if (e.target.id === "menuModal") {
    document.getElementById("menuModal").classList.remove("open");
  }
}

// ===================================================
// 5. CART
// ===================================================
function addToCart(item) {
  const existing = cart.find(c => c.item.id === item.id);
  if (existing) {
    existing.qty++;
  } else {
    cart.push({ item, qty: 1 });
  }

  // Close menu modal and open cart
  document.getElementById("menuModal").classList.remove("open");
  updateCartUI();
  openCart();
}

function removeFromCart(itemId) {
  const index = cart.findIndex(c => c.item.id === itemId);
  if (index === -1) return;

  if (cart[index].qty > 1) {
    cart[index].qty--;
  } else {
    cart.splice(index, 1);
    // If cart is now empty, remove applied offer
    if (cart.length === 0) {
      activeOffer = null;
    }
  }

  updateCartUI();
}

function updateCartUI() {
  const count  = cart.reduce((acc, c) => acc + c.qty, 0);
  const badge  = document.getElementById("cartCount");
  badge.textContent = count;

  const itemsEl    = document.getElementById("cartItems");
  const footer     = document.getElementById("cartFooter");
  const offerSect  = document.getElementById("offerApplySection");

  if (cart.length === 0) {
    itemsEl.innerHTML = `
      <div class="cart-empty">
        <span>🛒</span>
        <p>Your cart is empty</p>
        <small>Add items from a restaurant to get started</small>
      </div>`;
    footer.style.display     = "none";
    offerSect.style.display  = "none";
    activeOffer              = null;
    document.getElementById("offerMsg").textContent = "";
    return;
  }

  // Show offer section + footer
  offerSect.style.display = "block";
  footer.style.display    = "block";

  // Render items
  itemsEl.innerHTML = cart.map(c => `
    <div class="cart-item">
      <div class="cart-item-info">
        <div class="cart-item-name">${c.item.name}</div>
        <div class="cart-item-price">₹${c.item.price} each</div>
      </div>
      <div class="qty-control">
        <button class="qty-btn" onclick="removeFromCart('${c.item.id}')">−</button>
        <span class="qty-num">${c.qty}</span>
        <button class="qty-btn" onclick="addQty('${c.item.id}')">+</button>
      </div>
      <div class="cart-item-total">₹${c.item.price * c.qty}</div>
    </div>
  `).join("");

  // Compute totals
  const subtotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
  let   discount = 0;

  if (activeOffer) {
    discount = Math.round((subtotal * activeOffer.discount) / 100);
  }

  const total = subtotal - discount;

  document.getElementById("cartSubtotal").textContent = `₹${subtotal}`;
  document.getElementById("cartTotal").textContent    = `₹${total}`;

  const discountRow = document.getElementById("discountRow");
  if (discount > 0) {
    discountRow.style.display = "flex";
    document.getElementById("discountLabel").textContent  = `${activeOffer.code} (${activeOffer.discount}% off)`;
    document.getElementById("cartDiscount").textContent   = `-₹${discount}`;
  } else {
    discountRow.style.display = "none";
  }
}

function addQty(itemId) {
  const entry = cart.find(c => c.item.id === itemId);
  if (entry) {
    entry.qty++;
    updateCartUI();
  }
}

// ===================================================
// 6. CART PANEL TOGGLE
// ===================================================
function toggleCart() {
  const panel   = document.getElementById("cartPanel");
  const overlay = document.getElementById("cartOverlay");
  const isOpen  = panel.classList.contains("open");

  if (isOpen) {
    panel.classList.remove("open");
    overlay.classList.remove("open");
  } else {
    panel.classList.add("open");
    overlay.classList.add("open");
  }
}

function openCart() {
  document.getElementById("cartPanel").classList.add("open");
  document.getElementById("cartOverlay").classList.add("open");
}

// ===================================================
// 7. OFFER CODE APPLY
// ===================================================
function applyOffer() {
  const code    = document.getElementById("offerCodeInput").value.trim().toUpperCase();
  const msgEl   = document.getElementById("offerMsg");

  if (!code) {
    msgEl.textContent  = "⚠️ Please enter an offer code.";
    msgEl.className    = "offer-msg error";
    return;
  }

  const today   = new Date().toISOString().split("T")[0];
  const matched = allOffers.find(
    o => o.code.toUpperCase() === code && o.expiryDate >= today
  );

  if (!matched) {
    msgEl.textContent = "❌ Invalid or expired code.";
    msgEl.className   = "offer-msg error";
    activeOffer       = null;
    updateCartUI();
    return;
  }

  activeOffer        = matched;
  msgEl.textContent  = `✅ ${matched.discount}% off applied!`;
  msgEl.className    = "offer-msg success";
  updateCartUI();
}

// ===================================================
// 8. CHECKOUT (simple clear cart for now)
// ===================================================
// ===================================================
// 8. CHECKOUT (simple clear cart for now)
// ===================================================
// ===================================================
// 8. PLACE ORDER — sends cart to backend
// ===================================================
async function checkout() {
  if (cart.length === 0) return;

  // Build order payload
  const subtotal = cart.reduce((sum, c) => sum + c.item.price * c.qty, 0);
  const discount = activeOffer
    ? Math.round((subtotal * activeOffer.discount) / 100)
    : 0;
  const total = subtotal - discount;

  // Flatten items for storage
  const items = cart.map(c => ({
    id:    c.item.id,
    name:  c.item.name,
    price: c.item.price,
    qty:   c.qty,
    isVeg: c.item.isVeg,
  }));

  const orderPayload = {
    restaurantId:   currentRestaurant ? currentRestaurant.id   : null,
    restaurantName: currentRestaurant ? currentRestaurant.name : "Multiple",
    items,
    subtotal,
    discount,
    total,
    offerCode: activeOffer ? activeOffer.code : null,
  };

  // Disable button to prevent double-click
  const placeBtn = document.querySelector(".checkout-btn");
  if (placeBtn) { placeBtn.disabled = true; placeBtn.textContent = "Placing..."; }

  try {
    const res  = await fetch(`${API_BASE}/api/orders`, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(orderPayload),
    });
    const data = await res.json();

    if (data.success) {
      // Clear cart state
      cart        = [];
      activeOffer = null;
      document.getElementById("offerCodeInput").value = "";
      document.getElementById("offerMsg").textContent  = "";

      updateCartUI();
      toggleCart();

      // Show success toast with Order ID
      const toast = document.getElementById("successToast");
      toast.textContent = `✅ Order placed! ID: ${data.order.id}`;
      toast.classList.add("show");
      setTimeout(() => {
        toast.classList.remove("show");
        toast.textContent = "✅ Order placed successfully!"; // reset
      }, 4000);
    } else {
      alert("❌ Failed to place order: " + data.message);
    }
  } catch {
    alert("❌ Cannot reach server. Is it running?");
  } finally {
    if (placeBtn) { placeBtn.disabled = false; placeBtn.textContent = "Place Order →"; }
  }
}