// ===================== GLOBAL CONFIG =====================
window.ADMIN_TOKEN_KEY = "admin_jwt_token";
window.ADMIN_ROLE = "admin";

// ===================== UI UTILITIES =====================
window.showToast = function (message, isError = false) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.className = `fixed bottom-5 right-5 px-4 py-3 rounded-md text-white font-medium shadow-lg z-50 transition-all duration-500 ${
    isError ? "bg-red-500" : "bg-green-500"
  }`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

window.showLoading = function () {
  document.getElementById("loading-spinner")?.classList.remove("hidden");
};
window.hideLoading = function () {
  document.getElementById("loading-spinner")?.classList.add("hidden");
};

// ===================== CORE REQUEST FUNCTION =====================
window.apiRequestCore = async function (
  tokenKey,
  endpoint,
  method = "GET",
  body = null
) {
  const url = `${window.location.origin}${endpoint}`;
  const token = tokenKey ? localStorage.getItem(tokenKey) : null;

  const options = {
    method: method?.toString().toUpperCase() || "GET",
    headers: { "Content-Type": "application/json" },
  };

  if (token) options.headers["Authorization"] = `Bearer ${token}`;
  if (body) options.body = JSON.stringify(body);

  try {
    showLoading();
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      console.error("API Error:", data);
      window.showToast(data.message || "Lỗi hệ thống!", true);
      throw new Error(data.message || "API Error");
    }

    return data;
  } catch (err) {
    console.error("🚨 API Request Error:", err);
    window.showToast("Không thể kết nối máy chủ!", true);
    throw err;
  } finally {
    hideLoading();
  }
};

// ===================== ADMIN FUNCTIONS =====================
const loginPage = document.getElementById("admin-login-page");
const dashboardPage = document.getElementById("dashboard");

function adminLogout() {
  localStorage.removeItem(window.ADMIN_TOKEN_KEY);
  window.showToast("Bạn đã đăng xuất.");
  loginPage.classList.remove("hidden");
  dashboardPage.classList.add("hidden");
}

function showDashboard() {
  loginPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");
  loadAllUsers();
}

// ===================== LOGIN HANDLER =====================
document
  .getElementById("admin-login-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email_username = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;

    try {
      const data = await window.apiRequestCore(
        null,
        "/user/api/login",
        "POST",
        { email_username, password }
      );
      const token = data.access_token;

      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role !== window.ADMIN_ROLE) {
        adminLogout();
        window.showToast("Bạn không có quyền truy cập trang quản trị.", true);
        return;
      }

      localStorage.setItem(window.ADMIN_TOKEN_KEY, token);
      window.showToast("Đăng nhập quản trị thành công!");
      showDashboard();
    } catch (error) {
      console.error("Login failed:", error);
    }
  });

// ===================== LOAD USERS =====================
async function loadAllUsers() {
  try {
    const users = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/user/api/admin/users"
    );
    const tbody = document.getElementById("users-table-body");
    tbody.innerHTML = "";

    if (!users || users.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="text-center text-gray-500 py-4">Không có người dùng.</td></tr>`;
      return;
    }

    tbody.innerHTML = users
      .map(
        (u) => `
      <tr>
        <td class="px-6 py-4 text-sm">${u.user_id}</td>
        <td class="px-6 py-4 text-sm">${u.username}</td>
        <td class="px-6 py-4 text-sm">${u.email}</td>
        <td class="px-6 py-4 text-sm">${u.role}</td>
        <td class="px-6 py-4 text-sm">${u.status}</td>
        <td class="px-6 py-4 text-center space-x-2">
          <button onclick="toggleUserLock(${
            u.user_id
          })" class="text-indigo-600 hover:text-indigo-900">
            ${u.status === "active" ? "Lock" : "Unlock"}
          </button>
          <button onclick="deleteUser(${
            u.user_id
          })" class="text-red-600 hover:text-red-900">Delete</button>
        </td>
      </tr>`
      )
      .join("");
  } catch (err) {
    console.error(err);
    document.getElementById(
      "users-table-body"
    ).innerHTML = `<tr><td colspan="6" class="text-center text-red-500 py-4">Lỗi khi tải dữ liệu người dùng.</td></tr>`;
  }
}

async function toggleUserLock(userId) {
  if (!confirm("Thay đổi trạng thái người dùng này?")) return;
  await window.apiRequestCore(
    window.ADMIN_TOKEN_KEY,
    `/user/api/admin/users/${userId}/toggle-lock`,
    "POST"
  );
  window.showToast("Cập nhật thành công!");
  loadAllUsers();
}

async function deleteUser(userId) {
  if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;
  await window.apiRequestCore(
    window.ADMIN_TOKEN_KEY,
    `/user/api/admin/users/${userId}`,
    "DELETE"
  );
  window.showToast("Đã xóa người dùng!");
  loadAllUsers();
}

// ===================== INIT =====================
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem(window.ADMIN_TOKEN_KEY);
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const valid = payload.exp * 1000 > Date.now();
    if (valid && payload.role === window.ADMIN_ROLE) showDashboard();
    else adminLogout();
  } catch {
    adminLogout();
  }
});
