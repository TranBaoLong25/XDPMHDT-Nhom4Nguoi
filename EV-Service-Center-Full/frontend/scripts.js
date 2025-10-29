// ============================================================
// ✅ GỘP utils.js + scripts.js thành 1 file duy nhất
// ============================================================

// --- GLOBAL CONFIG ---
const API_BASE_URL = "http://localhost"; // nếu chạy qua nginx gateway, để trống là đúng
const TOKEN_KEY = "jwt_token";
const ADMIN_TOKEN_KEY = "admin_jwt_token";
let currentUserId = null;

// --- GLOBAL ELEMENTS ---
const navAuthLinks = document.getElementById("nav-auth-links");
let currentPageElement = document.getElementById("login-page");

// --- LOADING SPINNER ---
function showLoading() {
  const loader = document.getElementById("loading-spinner");
  if (loader) loader.classList.remove("hidden");
}
function hideLoading() {
  const loader = document.getElementById("loading-spinner");
  if (loader) loader.classList.add("hidden");
}

// --- TOAST ---
function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.className = `fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white z-50 ${
    isError ? "bg-red-500" : "bg-green-500"
  }`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

// --- CORE API REQUEST ---
async function apiRequestCore(tokenKey, endpoint, method = "GET", body = null) {
  showLoading();
  try {
    const headers = { "Content-Type": "application/json" };

    const token = localStorage.getItem(tokenKey || TOKEN_KEY);
    if (token) headers["Authorization"] = `Bearer ${token}`;

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    const url = endpoint.startsWith("http")
      ? endpoint
      : `${API_BASE_URL}${endpoint}`;

    const response = await fetch(url, options);

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }

    if (!response.ok) {
      const errMsg =
        data.error || data.message || `HTTP Error ${response.status}`;
      throw { message: errMsg, status: response.status };
    }

    return data;
  } catch (err) {
    console.error("🚨 API Request Error:", err);
    showToast(err.message || "Lỗi không xác định!", true);
    throw err;
  } finally {
    hideLoading();
  }
}

// --- API WRAPPER ---
async function apiRequest(endpoint, method = "GET", body = null) {
  return apiRequestCore(TOKEN_KEY, endpoint, method, body);
}

// --- NAVIGATION ---
function navigateTo(pageId) {
  const nextPageElement = document.getElementById(`${pageId}-page`);
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.add("hidden");
    p.classList.remove("active");
  });

  if (nextPageElement) {
    nextPageElement.classList.remove("hidden");
    nextPageElement.classList.add("active");
  }
  currentPageElement = nextPageElement;

  if (pageId === "profile") loadProfileDetails();
  if (pageId === "forget-password") resetForgetForm?.();
}

// --- AUTH NAVIGATION ---
function updateNav() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!navAuthLinks) return;

  navAuthLinks.innerHTML = token
    ? `
      <a href="#" onclick="navigateTo('profile')" class="nav-link text-gray-600 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Hồ Sơ</a>
      <a href="#" onclick="logout()" class="ml-4 bg-red-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-600">Đăng Xuất</a>
    `
    : `
      <a href="#" onclick="navigateTo('login')" class="nav-link text-gray-600 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Đăng Nhập</a>
      <a href="#" onclick="navigateTo('register')" class="ml-4 bg-green-500 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-600">Đăng Ký</a>
    `;
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  showToast("Đã đăng xuất!");
  updateNav();
  navigateTo("login");
}

// --- PROFILE HANDLERS ---
function toggleProfileForm(forceShow) {
  const form = document.getElementById("profile-update-form");
  const btnBox = document.getElementById("update-profile-button-container");
  if (!form || !btnBox) return;

  const show = forceShow ?? form.classList.contains("hidden");
  if (show) {
    form.classList.remove("hidden");
    btnBox.classList.add("hidden");
  } else {
    form.classList.add("hidden");
    btnBox.classList.remove("hidden");
  }
}

async function loadProfileDetails() {
  try {
    const profile = await apiRequest("/user/api/profile-details", "POST", {
      subject: currentUserId?.toString(),
    });

    const div = document.getElementById("profile-details");
    if (!div) return;

    div.innerHTML = `
      <p><strong>Họ và tên:</strong> ${profile.full_name || "Chưa cập nhật"}</p>
      <p><strong>Điện thoại:</strong> ${
        profile.phone_number || "Chưa cập nhật"
      }</p>
      <p><strong>Địa chỉ:</strong> ${profile.address || "Chưa cập nhật"}</p>
      <p><strong>Model Xe:</strong> ${
        profile.vehicle_model || "Chưa cập nhật"
      }</p>
      <p><strong>Số VIN:</strong> ${profile.vin_number || "Chưa cập nhật"}</p>
    `;

    const fields = [
      ["profile-fullname", "full_name"],
      ["profile-phone", "phone_number"],
      ["profile-address", "address"],
      ["profile-vehicle-model", "vehicle_model"],
      ["profile-vin-number", "vin_number"],
    ];

    fields.forEach(([id, key]) => {
      const input = document.getElementById(id);
      if (input) input.value = profile[key] || "";
    });

    toggleProfileForm(false);
  } catch (err) {
    console.error("❌ Failed to load profile:", err);
    const div = document.getElementById("profile-details");
    if (div)
      div.innerHTML = "<p>Chưa có thông tin hồ sơ. Vui lòng cập nhật.</p>";
    toggleProfileForm(true);
  }
}

// --- FORM HANDLERS ---
document.getElementById("login-form")?.addEventListener("submit", async (e) => {
  e.preventDefault();
  const email_username = document.getElementById("login-email-username")?.value;
  const password = document.getElementById("login-password")?.value;

  try {
    const data = await apiRequestCore(null, "/user/api/login", "POST", {
      email_username,
      password,
    });

    if (data?.access_token) {
      localStorage.setItem(TOKEN_KEY, data.access_token);
      showToast("Đăng nhập thành công!");
      updateNav();

      const token = data.access_token;
      const payload = JSON.parse(atob(token.split(".")[1]));
      currentUserId = payload.sub;

      navigateTo("home");
    }
  } catch (error) {
    console.error("Login failed:", error);
    showToast("Sai tài khoản hoặc mật khẩu!", true);
  }
});

document
  .getElementById("register-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = document.getElementById("register-username")?.value;
    const email = document.getElementById("register-email")?.value;
    const password = document.getElementById("register-password")?.value;

    try {
      const data = await apiRequest("/user/api/register", "POST", {
        username,
        email,
        password,
      });
      showToast(data.message || "Đăng ký thành công!");
      e.target.reset();
      navigateTo("login");
    } catch (error) {
      console.error("Register failed:", error);
      showToast("Lỗi đăng ký!", true);
    }
  });

document
  .getElementById("profile-update-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const body = {
      full_name: document.getElementById("profile-fullname")?.value,
      phone: document.getElementById("profile-phone")?.value,
      address: document.getElementById("profile-address")?.value,
      vehicle_model: document.getElementById("profile-vehicle-model")?.value,
      vin_number: document.getElementById("profile-vin-number")?.value,
    };

    try {
      await apiRequest("/user/api/profile", "PUT", body);
      showToast("Cập nhật hồ sơ thành công!");
      loadProfileDetails();
      toggleProfileForm(false);
    } catch (error) {
      console.error("Update profile failed:", error);
      showToast("Cập nhật thất bại!", true);
    }
  });

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  updateNav();
  const token = localStorage.getItem(TOKEN_KEY);

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      currentUserId = payload.sub;
      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) logout();
      else navigateTo("home");
    } catch {
      logout();
    }
  } else {
    navigateTo("login");
  }
});
