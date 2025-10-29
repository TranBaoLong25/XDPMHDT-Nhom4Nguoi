// ============================================================
// File: frontend/utils.js
// ✅ Phiên bản tối ưu cho môi trường Docker + Nginx Gateway
// ============================================================

// Khi frontend và API Gateway (nginx) cùng host → dùng relative path
const apiBaseUrl = "";

// In log kiểm tra để debug nhanh
console.log("🌐 API Base URL:", apiBaseUrl);

// ✅ Định nghĩa hằng số cho key Token & Role
const TOKEN_KEY = "jwt_token";
const ADMIN_TOKEN_KEY = "admin_jwt_token";
const ADMIN_ROLE = "admin";

const loadingSpinner = document.getElementById("loading-spinner");

// --- Loading Spinner ---
const showLoading = () => {
  if (loadingSpinner) loadingSpinner.classList.remove("hidden");
};
const hideLoading = () => {
  if (loadingSpinner) loadingSpinner.classList.add("hidden");
};

// --- Toast Notification ---
const showToast = (message, isError = false) => {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.className = `fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white ${
    isError ? "bg-red-500" : "bg-green-500"
  } z-50`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
};

/**
 * Hàm gọi API tổng quát (Core Function)
 * @param {string | null} tokenKey - Key JWT trong localStorage (TOKEN_KEY hoặc ADMIN_TOKEN_KEY)
 * @param {string} endpoint - Đường dẫn API (VD: "/user/api/login")
 * @param {string} method - Phương thức HTTP
 * @param {object|null} body - Dữ liệu gửi lên
 */
async function apiRequestCore(tokenKey, endpoint, method = "GET", body = null) {
  showLoading();
  try {
    const headers = { "Content-Type": "application/json" };

    // Thêm token nếu có
    if (tokenKey) {
      const token = localStorage.getItem(tokenKey);
      if (token) headers["Authorization"] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) options.body = JSON.stringify(body);

    // 🔗 Gọi API Gateway qua đường tương đối (ví dụ: /user/api/login)
    const response = await fetch(`${apiBaseUrl}${endpoint}`, options);

    const responseText = await response.text();
    let responseData;

    try {
      responseData = JSON.parse(responseText);
    } catch {
      responseData = {
        message: response.ok
          ? "Operation successful"
          : responseText || "Unknown error",
        error: responseText,
        status: response.status,
      };
    }

    if (!response.ok) {
      const errorMessage =
        responseData.error ||
        responseData.msg ||
        responseData.message ||
        `HTTP error! status: ${response.status}`;
      if (response.status === 401) {
        // Token hết hạn hoặc không hợp lệ
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(ADMIN_TOKEN_KEY);
      }
      throw { message: errorMessage, status: response.status };
    }

    return responseData;
  } catch (error) {
    console.error("🚨 API Request Error:", error);
    showToast(error.message || "Đã xảy ra lỗi không xác định.", true);
    throw error;
  } finally {
    hideLoading();
  }
}

// --- Xuất ra global scope ---
window.apiRequestCore = apiRequestCore;
window.showToast = showToast;
window.showLoading = showLoading;
window.hideLoading = hideLoading;
window.TOKEN_KEY = TOKEN_KEY;
window.ADMIN_TOKEN_KEY = ADMIN_TOKEN_KEY;
window.ADMIN_ROLE = ADMIN_ROLE;

// --- Hàm tiện ích cho Member ---
window.apiRequest = async (endpoint, method = "GET", body = null) => {
  return window.apiRequestCore(TOKEN_KEY, endpoint, method, body);
};
