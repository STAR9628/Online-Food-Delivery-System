// ===== CONFIGURATION =====
const API_BASE = "http://localhost:3000";

// ===== UTILITY FUNCTIONS =====
function $(id) { return document.getElementById(id); }

function showAlert(id, message, type = "error") {
  const el = $(id);
  if (!el) return;
  el.textContent = message;
  el.className = `alert alert-${type} show`;
  setTimeout(() => el.classList.remove("show"), 4000);
}

function setLoading(btnId, isLoading) {
  const btn = $(btnId);
  if (!btn) return;
  btn.classList.toggle("loading", isLoading);
  btn.disabled = isLoading;
}

// ===== ADMIN LOGIN =====
async function handleLogin() {
  const username = $("username")?.value.trim();
  const password = $("password")?.value.trim();

  // Clear previous errors
  $("usernameError")?.classList.remove("show");
  $("passwordError")?.classList.remove("show");
  $("username")?.classList.remove("error");
  $("password")?.classList.remove("error");

  // Validate
  let hasError = false;
  if (!username) {
    $("usernameError")?.classList.add("show");
    $("username")?.classList.add("error");
    hasError = true;
  }
  if (!password) {
    $("passwordError")?.classList.add("show");
    $("password")?.classList.add("error");
    hasError = true;
  }
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
      // Save session
      sessionStorage.setItem("adminLoggedIn", "true");
      sessionStorage.setItem("adminUser", username);

      showAlert("loginSuccess", "✅ Login successful! Redirecting...", "success");
      setTimeout(() => {
        window.location.href = "admin.html";
      }, 1000);
    } else {
      showAlert("loginError", "❌ " + data.message);
    }
  } catch (err) {
    showAlert("loginError", "❌ Cannot connect to server. Is it running?");
  } finally {
    setLoading("loginBtn", false);
  }
}

// Allow Enter key on login form
document.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && $("loginBtn")) handleLogin();
});

// Toggle password visibility
$("togglePass")?.addEventListener("click", () => {
  const passInput = $("password");
  const btn = $("togglePass");
  if (passInput.type === "password") {
    passInput.type = "text";
    btn.textContent = "🙈";
  } else {
    passInput.type = "password";
    btn.textContent = "👁";
  }
});