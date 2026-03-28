// js/auth.js — Authentication helpers

async function getCurrentUser() {
  const { data } = await _supabase.auth.getUser();
  return data?.user || null;
}

async function requireAuth() {
  const user = await getCurrentUser();
  if (!user) {
    window.location.href = "index.html";
    return null;
  }
  return user;
}

async function handleSignup() {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;
  const name     = document.getElementById("name")?.value.trim() || "";

  if (!email || !password) return showToast("Please fill in all fields", "error");
  if (password.length < 6)  return showToast("Password must be at least 6 characters", "error");

  setAuthLoading(true);

  const { error } = await _supabase.auth.signUp({
    email, password,
    options: { data: { full_name: name } }
  });

  setAuthLoading(false);

  if (error) return showToast(error.message, "error");

  showToast("Account created! Check your email to confirm.", "success");
  setTimeout(() => window.location.href = "dashboard.html", 1500);
}

async function handleLogin() {
  const email    = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value;

  if (!email || !password) return showToast("Please fill in all fields", "error");

  setAuthLoading(true);

  const { error } = await _supabase.auth.signInWithPassword({ email, password });

  setAuthLoading(false);

  if (error) return showToast("Invalid email or password", "error");

  window.location.href = "dashboard.html";
}

async function handleLogout() {
  await _supabase.auth.signOut();
  window.location.href = "index.html";
}

function setAuthLoading(loading) {
  const btn = document.getElementById("authBtn");
  if (!btn) return;
  btn.disabled = loading;
  btn.innerHTML = loading
    ? '<span class="spinner"></span> Please wait...'
    : btn.dataset.label || "Continue";
}

// ── Toast Notification ──
function showToast(message, type = "info") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const icons = { success: "✓", error: "✕", info: "ℹ" };
  const toast = document.createElement("div");
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || "ℹ"}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateX(20px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

// Attach enter-key support on auth pages
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("password")?.addEventListener("keydown", e => {
    if (e.key === "Enter") {
      const isSignup = document.getElementById("name") !== null;
      isSignup ? handleSignup() : handleLogin();
    }
  });
});
