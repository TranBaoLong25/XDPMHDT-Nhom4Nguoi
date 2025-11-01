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

async function apiRequest(endpoint, method = "GET", body = null) {
  showLoading();
  try {
    const headers = { "Content-Type": "application/json" };
    const token = localStorage.getItem("jwt_token");
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const options = { method, headers };
    if (body) {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    const responseData = await response
      .json()
      .catch(() => ({ message: "Operation successful" }));

    if (!response.ok) {
      throw new Error(
        responseData.error ||
          responseData.msg ||
          `HTTP error! status: ${response.status}`
      );
    }
    return responseData;
  } catch (error) {
    console.error("API Request Error:", error);
    showToast(error.message, true);
    throw error;
  } finally {
    hideLoading();
  }
}

// --- NAVIGATION (Định nghĩa DUY NHẤT một lần) ---
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

  // ✅ LOGIC MỚI: Tải danh sách vật tư khi chuyển trang
  if (pageId === "inventory-list") loadInventoryList();
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
// Dán hàm này vào file frontend/scripts.js

function resetForgetForm() {
  // 1. Lấy các ô input bằng ID (khớp với HTML của bạn)
  const emailInput = document.getElementById("forget-email");
  const otpInput = document.getElementById("otp-code");
  const newPasswordInput = document.getElementById("new-password");

  // 2. Đặt giá trị của chúng về rỗng
  if (emailInput) {
    emailInput.value = "";
  }
  if (otpInput) {
    otpInput.value = "";
  }
  if (newPasswordInput) {
    newPasswordInput.value = "";
  }

  // 3. (Quan trọng) Ẩn form reset và hiện lại form gửi OTP
  // Điều này đảm bảo trang "Quên mật khẩu" quay về trạng thái ban đầu
  const forgetForm = document.getElementById("forget-password-form");
  const resetForm = document.getElementById("reset-password-form");

  if (forgetForm) {
    forgetForm.classList.remove("hidden"); // Hiện form gửi email
  }
  if (resetForm) {
    resetForm.classList.add("hidden"); // Ẩn form nhập OTP/pass mới
  }

  // (Tùy chọn: Ẩn các thông báo lỗi nếu bạn có)
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
    const profile = await apiRequest("/api/profile-details", "POST", {
      subject: currentUserId?.toString(),
    });

    const div = document.getElementById("profile-details");
    if (!div) return;

    div.innerHTML = `
        <p><strong>Họ và tên:</strong> ${
          profile.full_name || "Chưa cập nhật"
        }</p>
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
    const data = await apiRequestCore(null, "/api/login", "POST", {
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
      const data = await apiRequest("/api/register", "POST", {
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
      await apiRequest("/api/profile", "PUT", body);
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
document.addEventListener("DOMContentLoaded", () => {
  // --- Bộ não cho Form 1: Gửi Mã OTP ---
  const forgetForm = document.getElementById("forget-password-form");
  if (forgetForm) {
    forgetForm.addEventListener("submit", async (event) => {
      event.preventDefault(); // Ngăn trang tải lại

      const emailInput = document.getElementById("forget-email");
      const email = emailInput.value;
      const submitButton = forgetForm.querySelector('button[type="submit"]');

      if (!email) {
        // Thay alert bằng showToast
        showToast("Vui lòng nhập email của bạn.", true);
        return;
      }

      // Vô hiệu hóa nút để tránh nhấn đúp
      submitButton.disabled = true;
      submitButton.textContent = "Đang gửi...";

      try {
        // 1. Gọi API (giả sử bạn có hàm apiRequestCore)
        const data = await window.apiRequestCore(
          null,
          "/api/send-otp",
          "POST",
          { email: email }
        );

        // 2. Xử lý thành công
        showToast(
          data.message || "Gửi OTP thành công! Vui lòng kiểm tra email."
        );

        // Ẩn form gửi, hiện form reset
        forgetForm.classList.add("hidden");
        document
          .getElementById("reset-password-form")
          .classList.remove("hidden");

        // Lưu email vào ô input ẩn
        document.getElementById("reset-email-hidden").value = email;
      } catch (error) {
        // 3. Xử lý lỗi
        console.error("Lỗi khi gửi OTP:", error);
        showToast(
          "Gửi OTP thất bại. Email không tồn tại hoặc có lỗi xảy ra.",
          true
        );
      } finally {
        // 4. Kích hoạt lại nút
        submitButton.disabled = false;
        submitButton.textContent = "Gửi Mã OTP";
      }
    });
  }

  // --- Bộ não cho Form 2: Đặt Lại Mật Khẩu ---
  const resetForm = document.getElementById("reset-password-form");
  if (resetForm) {
    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault(); // Ngăn trang tải lại

      // 1. Lấy dữ liệu
      const email = document.getElementById("reset-email-hidden").value;
      const otp = document.getElementById("otp-code").value;
      const newPassword = document.getElementById("new-password").value;
      const submitButton = resetForm.querySelector('button[type="submit"]');

      if (!otp || !newPassword) {
        showToast("Vui lòng nhập Mã OTP và Mật khẩu mới.", true);
        return;
      }

      // Vô hiệu hóa nút
      submitButton.disabled = true;
      submitButton.textContent = "Đang xử lý...";

      try {
        // 2. Gọi API
        const data = await window.apiRequestCore(
          null,
          "/api/reset-password",
          "POST",
          {
            email: email,
            otp: otp,
            new_password: newPassword,
          }
        );

        // 3. Xử lý thành công
        showToast(
          data.message || "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập."
        );

        // Chuyển về trang đăng nhập
        navigateTo("login"); // Sử dụng navigateTo đã sửa lỗi
        resetForgetForm(); // Gọi hàm reset (bạn đã thêm ở bước trước)
      } catch (error) {
        // 4. Xử lý lỗi
        console.error("Lỗi khi reset mật khẩu:", error);
        showToast(
          "Đặt lại mật khẩu thất bại. Mã OTP không đúng hoặc đã hết hạn.",
          true
        );
      } finally {
        // 5. Kích hoạt lại nút
        submitButton.disabled = false;
        submitButton.textContent = "Đặt Lại Mật Khẩu";
      }
    });
  }
});

// ========================================================
// ✅ LOGIC INVENTORY MỚI
// ========================================================

function renderItemCard(item) {
  // Sử dụng Tailwind CSS cho một card đẹp mắt
  return `
        <div class="bg-white p-5 rounded-lg shadow-md border border-gray-200 hover:shadow-lg transition duration-200">
            <h3 class="text-xl font-semibold text-indigo-700">${item.name}</h3>
            <p class="text-gray-500 text-sm mt-1">Mã Part: <span class="font-mono text-gray-700">${
              item.part_number
            }</span></p>
            
            <div class="mt-4 flex justify-between items-center">
                <div>
                    <p class="text-lg font-bold text-green-600">
                        ${new Intl.NumberFormat("vi-VN").format(item.price)}₫
                    </p>
                    <p class="text-xs text-gray-400">Giá tham khảo</p>
                </div>
                <div class="text-right">
                    <span class="text-sm font-medium text-gray-800 p-2 bg-indigo-100 rounded-full">
                        Còn: ${item.quantity || "Liên hệ"}
                    </span>
                </div>
            </div>
        </div>
    `;
}

async function loadInventoryList() {
  const container = document.getElementById("inventory-list-container");
  const loadingMessage = document.getElementById("inventory-loading-message");
  if (!container || !loadingMessage) return;

  // Hiển thị thông báo tải
  loadingMessage.classList.remove("hidden");
  container.innerHTML = "";

  try {
    // Gọi API Inventory Service (GET /api/inventory/items)
    const items = await apiRequestCore(
      null, // Không cần token JWT cho user thường xem danh sách
      "/api/inventory/items"
    );

    loadingMessage.classList.add("hidden");

    if (!items || items.length === 0) {
      container.innerHTML = `
                <div class="text-center py-12 bg-gray-50 rounded-lg">
                    <p class="text-lg text-gray-500">Hiện tại chưa có phụ tùng nào được niêm yết.</p>
                </div>
            `;
      return;
    }

    // Render các card vật tư
    container.innerHTML = items.map(renderItemCard).join("");
  } catch (error) {
    loadingMessage.classList.add("hidden");
    container.innerHTML = `
            <div class="text-center py-12 bg-red-100 text-red-700 rounded-lg border border-red-300">
                <p>Lỗi khi tải danh sách vật tư. Vui lòng thử lại sau.</p>
            </div>
        `;
    console.error("Failed to load inventory list:", error);
  }
}
