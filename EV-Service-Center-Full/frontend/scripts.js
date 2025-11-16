// --- GLOBAL CONFIG ---
const API_BASE_URL = "http://localhost"; // nếu chạy qua nginx gateway, để trống là đúng
const TOKEN_KEY = "jwt_token";
const ADMIN_TOKEN_KEY = "admin_jwt_token";
let currentUserId = null;

// --- GLOBAL ELEMENTS ---
const navAuthLinks = document.getElementById("nav-auth-links");
let currentPageElement = document.getElementById("login-page");

// --- UTILITIES (Show/Hide/Toast) ---
function showLoading() {
  const loader = document.getElementById("loading-spinner");
  if (loader) loader.classList.remove("hidden");
}
function hideLoading() {
  const loader = document.getElementById("loading-spinner");
  if (loader) loader.classList.add("hidden");
}

function showToast(message, isError = false) {
  const toast = document.createElement("div");
  toast.textContent = message;
  toast.className = `fixed bottom-5 right-5 p-4 rounded-lg shadow-lg text-white z-50 ${
    isError ? "bg-red-500" : "bg-green-500"
  }`;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}
window.showToast = showToast;

// Helper: Định dạng tiền tệ
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

// Helper: Định dạng trạng thái Hóa đơn
function formatInvoiceStatus(status) {
  switch (status) {
    case "pending":
      return { text: "Chờ thanh toán", class: "bg-yellow-100 text-yellow-800" };
    case "issued":
      return { text: "Đã xuất", class: "bg-blue-100 text-blue-800" };
    case "paid":
      return { text: "Đã thanh toán", class: "bg-green-100 text-green-800" };
    case "canceled":
      return { text: "Đã hủy", class: "bg-red-100 text-red-800" };
    case "success":
      return { text: "Thành công", class: "bg-green-100 text-green-800" };
    case "failed":
      return { text: "Thất bại", class: "bg-red-100 text-red-800" };
    case "expired":
      return { text: "Đã Hủy", class: "bg-gray-100 text-gray-800" };
    default:
      return { text: status, class: "bg-gray-100 text-gray-800" };
  }
}

// --- AUTH & NAVIGATION HELPERS (ĐÃ SỬA DARK MODE) ---
function updateNav() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!navAuthLinks) return;

  // CẬP NHẬT: Màu chữ (text-gray-300), màu hover, và dropdown styles cho Dark Mode
  navAuthLinks.innerHTML = token
    ? `
        <a href="#" onclick="navigateTo('booking')" class="nav-link text-gray-300 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Đặt Lịch</a>
        <a href="#" onclick="navigateTo('my-tasks')" class="nav-link text-gray-300 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Công Việc</a>
        <a href="#" onclick="navigateTo('invoice-history')" class="nav-link text-gray-300 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Hóa Đơn</a>
        <a href="#" onclick="navigateTo('profile')" class="nav-link text-gray-300 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Hồ Sơ</a>

        <div class="relative ml-4">
          <button onclick="toggleNotificationDropdown()" class="relative text-gray-300 hover:text-indigo-400 focus:outline-none">
            <svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"></path>
            </svg>
            <span id="notification-badge" class="hidden absolute -top-1 -right-1 bg-red-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">0</span>
          </button>

          <div id="notification-dropdown" class="hidden absolute right-0 mt-2 w-80 bg-gray-800 rounded-lg shadow-2xl border border-gray-700 z-50">
            <div class="p-4 border-b border-gray-700">
              <h3 class="font-semibold text-white">Thông báo</h3>
            </div>
            <div id="notification-list" class="max-h-96 overflow-y-auto">
              <div class="p-4 text-center text-gray-400">Đang tải...</div>
            </div>
            <div class="p-2 border-t border-gray-700 text-center">
              <a href="#" onclick="markAllNotificationsAsRead(); return false;" class="text-sm text-indigo-400 hover:text-indigo-300">Đánh dấu tất cả đã đọc</a>
            </div>
          </div>
        </div>

        <a href="#" onclick="logout()" class="ml-4 bg-red-700 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-red-600">Đăng Xuất</a>
        `
    : `
        <a href="#" onclick="navigateTo('login')" class="nav-link text-gray-300 hover:bg-indigo-600 hover:text-white px-3 py-2 rounded-md text-sm font-medium">Đăng Nhập</a>
        <a href="#" onclick="navigateTo('register')" class="ml-4 bg-green-600 text-white px-3 py-2 rounded-md text-sm font-medium hover:bg-green-700">Đăng Ký</a>
        `;

  if (token) {
    setTimeout(() => loadUserNotifications(), 500);
  }
}

function logout() {
  localStorage.removeItem(TOKEN_KEY);
  showToast("Đã đăng xuất!");
  updateNav();
  navigateTo("login");
}
window.logout = logout;

// --- CORE API REQUEST (GIỮ NGUYÊN) ---
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
      // XỬ LÝ 401: Tự động đăng xuất
      if (response.status === 401) {
        if ((tokenKey || TOKEN_KEY) === TOKEN_KEY) {
          logout();
          throw {
            message: "Phiên làm việc hết hạn. Vui lòng đăng nhập lại.",
            status: 401,
          };
        }
      }

      const errMsg =
        data.error || data.message || `HTTP Error ${response.status}`;
      throw { message: errMsg, status: response.status };
    }

    return data;
  } catch (err) {
    const errMsg = err.message || "Lỗi không xác định!";
    console.error("🚨 API Request Error:", err);
    showToast(errMsg, true);
    throw err;
  } finally {
    hideLoading();
  }
}

// ✅ NEW FUNCTION: Đặt loại dịch vụ khi chuyển từ trang Inventory (GIỮ NGUYÊN)
function setServiceType(itemName) {
  // Chờ 1 chút để trang booking được tải và các element hiện ra
  setTimeout(() => {
    const selectElement = document.getElementById("service-type");
    const newOptionValue = `Yêu cầu thay thế/lắp đặt: ${itemName}`; // 1. Kiểm tra xem option đã tồn tại chưa

    let optionExists = false;
    for (let i = 0; i < selectElement.options.length; i++) {
      if (selectElement.options[i].value === newOptionValue) {
        selectElement.value = newOptionValue;
        optionExists = true;
        break;
      }
    } // 2. Nếu chưa tồn tại, thêm option mới và chọn nó

    if (!optionExists) {
      const newOption = document.createElement("option");
      newOption.value = newOptionValue;
      newOption.textContent = newOptionValue;
      selectElement.appendChild(newOption);
      selectElement.value = newOptionValue;
    } // Tùy chọn: Scroll đến form đặt lịch nếu cần

    document
      .getElementById("booking-form")
      ?.scrollIntoView({ behavior: "smooth" });
  }, 100);
}
window.setServiceType = setServiceType;

// --- NAVIGATION (GIỮ NGUYÊN) ---
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

  if (pageId === "profile") loadProfileDetails(); // ✅ Trigger tải Profile và Lịch sử
  if (pageId === "forget-password") resetForgetForm?.(); // Tải dữ liệu tùy thuộc vào section

  if (pageId === "inventory-list") loadInventoryList();
  if (pageId === "booking") {
    loadMyBookings(); // Tải lịch hẹn cho trang đặt lịch
  }
  if (pageId === "invoice-history") {
    // Khi vào trang hóa đơn, mặc định hiển thị tab Hóa đơn
    showHistory("invoices", document.getElementById("tab-invoices"));
  } // ✅ TẢI CÔNG VIỆC BẢO TRÌ
  if (pageId === "my-tasks") {
    loadMyTasks();
  } // Gọi updateNav sau khi điều hướng

  updateNav();
}
window.navigateTo = navigateTo;

// --- NAVIGATION HELPERS (GIỮ NGUYÊN) ---
function resetForgetForm() {
  const emailInput = document.getElementById("forget-email");
  const otpInput = document.getElementById("otp-code");
  const newPasswordInput = document.getElementById("new-password");

  if (emailInput) {
    emailInput.value = "";
  }
  if (otpInput) {
    otpInput.value = "";
  }
  if (newPasswordInput) {
    newPasswordInput.value = "";
  }

  const forgetForm = document.getElementById("forget-password-form");
  const resetForm = document.getElementById("reset-password-form");

  if (forgetForm) {
    forgetForm.classList.remove("hidden"); // Hiện form gửi email
  }
  if (resetForm) {
    resetForm.classList.add("hidden"); // Ẩn form nhập OTP/pass mới
  }
}

// --- PROFILE HANDLERS (ĐÃ SỬA DARK MODE) ---
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
window.toggleProfileForm = toggleProfileForm;

// ✅ HÀM TẢI PROFILE MỚI: Tải cả thông tin cá nhân và lịch sử (ĐÃ SỬA DARK MODE)
async function loadProfileDetails() {
  const bookingListEl = document.getElementById("profile-booking-list");
  if (bookingListEl) {
    // ĐÃ SỬA: Màu loading box
    bookingListEl.innerHTML =
      '<div class="bg-gray-800 p-6 rounded-lg shadow-md text-gray-400">Đang tải lịch sử đặt lịch...</div>';
  }

  try {
    // 1. Tải Profile (GIỮ NGUYÊN LOGIC)
    const profile = await apiRequestCore(TOKEN_KEY, "/api/profile", "GET");

    const div = document.getElementById("profile-details");
    if (!div) return;

    div.innerHTML = `
            <p><strong>Họ và tên:</strong> ${
              profile.full_name || "Chưa cập nhật"
            }</p>
            <p><strong>Điện thoại:</strong> ${
              profile.phone_number || "Chưa cập nhật"
            }</p>
            <p><strong>Địa chỉ:</strong> ${
              profile.address || "Chưa cập nhật"
            }</p>
            <p><strong>Model Xe:</strong> ${
              profile.vehicle_model || "Chưa cập nhật"
            }</p>
            <p><strong>Số VIN:</strong> ${
              profile.vin_number || "Chưa cập nhật"
            }</p>
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

    toggleProfileForm(false); // 2. Tải Lịch sử Đặt Lịch

    await loadBookingsForProfile();
  } catch (err) {
    if (err.status === 404) {
      const div = document.getElementById("profile-details");
      if (div)
        div.innerHTML = "<p>Chưa có thông tin hồ sơ. Vui lòng cập nhật.</p>";
      toggleProfileForm(true);
      return;
    }

    console.error("❌ Failed to load profile:", err);
    const div = document.getElementById("profile-details");
    if (div) div.innerHTML = "<p>Lỗi tải hồ sơ. Vui lòng thử lại sau.</p>";
    toggleProfileForm(false);

    if (bookingListEl) {
      // ĐÃ SỬA: Màu error box
      bookingListEl.innerHTML =
        '<div class="bg-red-800 p-6 rounded-lg shadow-md text-red-400">Lỗi: Không thể tải lịch sử đặt lịch.</div>';
    }
  }
}

// --- FORM HANDLERS (ĐÃ SỬA LOGIN ROLE HANDLER) ---
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

      const token = data.access_token;
      const payload = JSON.parse(atob(token.split(".")[1]));
      currentUserId = payload.sub;

      // CẬP NHẬT: Redirect dựa trên role
      if (payload.role === "admin") {
        window.location.href = "/admin.html";
      } else if (payload.role === "technician") {
        localStorage.setItem("tech_access_token", data.access_token);
        window.location.href = "/technician.html";
      } else {
        updateNav();
        navigateTo("home");
      }
    }
  } catch (error) {
    console.error("Login failed:", error);
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
      // SỬ DỤNG apiRequestCore
      const data = await apiRequestCore(null, "/api/register", "POST", {
        username,
        email,
        password,
      });
      showToast(data.message || "Đăng ký thành công!");
      e.target.reset();
      navigateTo("login");
    } catch (error) {
      console.error("Register failed:", error);
    }
  });

// Event listener cho form cập nhật hồ sơ
document
  .getElementById("profile-update-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const data = {
      full_name: document.getElementById("profile-fullname")?.value,
      phone_number: document.getElementById("profile-phone")?.value,
      address: document.getElementById("profile-address")?.value,
      vehicle_model: document.getElementById("profile-vehicle-model")?.value,
      vin_number: document.getElementById("profile-vin-number")?.value,
    };

    try {
      const result = await apiRequestCore(
        TOKEN_KEY,
        "/api/profile",
        "PUT",
        data
      );
      showToast(result.message || "Cập nhật hồ sơ thành công!");
      loadProfileDetails(); // Tải lại thông tin sau khi cập nhật
    } catch (error) {
      console.error("Lỗi khi cập nhật hồ sơ:", error);
    }
  });

document
  .getElementById("booking-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault(); // 1. Lấy dữ liệu từ form

    const service_type = document.getElementById("service-type")?.value;
    const technician_id = parseInt(
      document.getElementById("technician-id")?.value
    );
    const station_id = parseInt(document.getElementById("station-id")?.value);

    const startTimeInput = document.getElementById("start-time")?.value;
    const endTimeInput = document.getElementById("end-time")?.value;

    if (!startTimeInput || !endTimeInput) {
      showToast("Vui lòng nhập đầy đủ thời gian.", true);
      return;
    } // Logic kiểm tra thời gian

    if (new Date(startTimeInput) >= new Date(endTimeInput)) {
      showToast("Thời gian kết thúc phải sau thời gian bắt đầu.", true);
      return;
    }

    const bookingData = {
      service_type,
      technician_id,
      station_id, // Backend Flask/Python cần định dạng ISO 8601 (như datetime-local cung cấp)
      start_time: startTimeInput + ":00",
      end_time: endTimeInput + ":00",
    };

    try {
      // 2. Gọi API CREATE BOOKING (Endpoint: /api/bookings/items)
      const data = await apiRequestCore(
        TOKEN_KEY,
        "/api/bookings/items",
        "POST",
        bookingData
      ); // 3. Xử lý thành công

      showToast(data.message || "Đặt lịch thành công!");
      e.target.reset(); // Tải lại danh sách lịch hẹn sau khi đặt thành công

      loadMyBookings();
    } catch (error) {
      // Lỗi đã được xử lý trong apiRequestCore
      console.error("Lỗi khi đặt lịch:", error);
    }
  });

// --- INIT (GIỮ NGUYÊN) ---
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

// Thêm lại event listener cho form quên mật khẩu (GIỮ NGUYÊN)
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
        showToast("Vui lòng nhập email của bạn.", true);
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Đang gửi...";

      try {
        const data = await apiRequestCore(null, "/api/send-otp", "POST", {
          email: email,
        });

        showToast(
          data.message || "Gửi OTP thành công! Vui lòng kiểm tra email."
        );

        forgetForm.classList.add("hidden");
        document
          .getElementById("reset-password-form")
          .classList.remove("hidden");

        document.getElementById("reset-email-hidden").value = email;
      } catch (error) {
        console.error("Lỗi khi gửi OTP:", error); // Lỗi đã được xử lý trong apiRequestCore
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Gửi Mã OTP";
      }
    });
  } // --- Bộ não cho Form 2: Đặt Lại Mật Khẩu ---

  const resetForm = document.getElementById("reset-password-form");
  if (resetForm) {
    resetForm.addEventListener("submit", async (event) => {
      event.preventDefault(); // Ngăn trang tải lại

      const email = document.getElementById("reset-email-hidden").value;
      const otp = document.getElementById("otp-code").value;
      const newPassword = document.getElementById("new-password").value;
      const submitButton = resetForm.querySelector('button[type="submit"]');

      if (!otp || !newPassword) {
        showToast("Vui lòng nhập Mã OTP và Mật khẩu mới.", true);
        return;
      }

      submitButton.disabled = true;
      submitButton.textContent = "Đang xử lý...";

      try {
        const data = await apiRequestCore(null, "/api/reset-password", "POST", {
          email: email,
          otp: otp,
          new_password: newPassword,
        });

        showToast(
          data.message || "Đặt lại mật khẩu thành công! Bạn có thể đăng nhập."
        );

        navigateTo("login");
        resetForgetForm();
      } catch (error) {
        console.error("Lỗi khi reset mật khẩu:", error); // Lỗi đã được xử lý trong apiRequestCore
      } finally {
        submitButton.disabled = false;
        submitButton.textContent = "Đặt Lại Mật Khẩu";
      }
    });
  }
});

// ========================================================
// LOGIC CHỨC NĂNG (INVENTORY VÀ BOOKING)
// ========================================================

// ✅ Cập nhật renderItemCard (ĐÃ SỬA DARK MODE)
function renderItemCard(item) {
  return `
    <div class="bg-gray-800 p-5 rounded-lg shadow-md border border-gray-700 hover:shadow-lg transition duration-200">
        <h3 class="text-xl font-semibold text-indigo-400">${item.name}</h3>
        <p class="text-gray-400 text-sm mt-1">Mã Part: <span class="font-mono text-gray-300">${
          item.part_number
        }</span></p>
        
        <div class="mt-4 flex justify-between items-center">
            <div>
                <p class="text-lg font-bold text-green-500">
                    ${formatCurrency(item.price)}
                </p>
                <p class="text-xs text-gray-500">Giá tham khảo</p>
            </div>
            <div class="text-right">
                <span class="text-sm font-medium text-white p-2 bg-indigo-700 rounded-full">
                    Còn: ${item.quantity || "Liên hệ"}
                </span>
            </div>
        </div>
        
        <div class="mt-4 pt-4 border-t border-gray-700">
            <button 
                onclick="navigateTo('booking'); setServiceType('${item.name}')" 
                class="w-full bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg hover:bg-indigo-700 transition"
            >
                Đặt Lịch Dịch Vụ Liên Quan
            </button>
        </div>
        
    </div>
  `;
}

async function loadInventoryList() {
  const container = document.getElementById("inventory-list-container");
  const loadingMessage = document.getElementById("inventory-loading-message");
  if (!container || !loadingMessage) return;

  // Hiển thị thông báo tải (ĐÃ SỬA DARK MODE)
  loadingMessage.classList.remove("hidden");
  container.innerHTML = "";

  try {
    // Gọi API Inventory Service (GIỮ NGUYÊN)
    const items = await apiRequestCore(
      null, // Không cần token JWT cho user thường xem danh sách
      "/api/inventory/items"
    );

    loadingMessage.classList.add("hidden");

    if (!items || items.length === 0) {
      // ĐÃ SỬA: Màu box rỗng
      container.innerHTML = `
        <div class="text-center py-12 bg-gray-700 rounded-lg">
            <p class="text-lg text-gray-400">Hiện tại chưa có phụ tùng nào được niêm yết.</p>
        </div>
    `;
      return;
    }

    // Render các card vật tư
    container.innerHTML = items.map(renderItemCard).join("");
  } catch (error) {
    loadingMessage.classList.add("hidden");
    // ĐÃ SỬA: Màu error box
    container.innerHTML = `
        <div class="text-center py-12 bg-red-800 text-red-400 rounded-lg border border-red-700">
            <p>Lỗi khi tải danh sách vật tư. Vui lòng thử lại sau.</p>
        </div>
    `;
    console.error("Failed to load inventory list:", error);
  }
}

// Logic Booking
function formatBookingStatus(status) {
  switch (status) {
    case "pending":
      return { text: "Chờ xác nhận", class: "bg-yellow-100 text-yellow-800" };
    case "confirmed":
      return { text: "Đã xác nhận", class: "bg-green-100 text-green-800" };
    case "completed":
      return { text: "Hoàn thành", class: "bg-indigo-100 text-indigo-800" };
    case "canceled":
      return { text: "Đã hủy", class: "bg-red-100 text-red-800" };
    default:
      return { text: status, class: "bg-gray-100 text-gray-800" };
  }
}

// ✅ HÀM MỚI: Tải lịch hẹn cho trang profile (ĐÃ SỬA DARK MODE)
async function loadBookingsForProfile() {
  const bookingListEl = document.getElementById("profile-booking-list");
  if (!bookingListEl) return;

  try {
    const bookings = await apiRequestCore(
      TOKEN_KEY,
      "/api/bookings/my-bookings",
      "GET"
    );

    if (bookings.length === 0) {
      // ĐÃ SỬA: Màu box rỗng
      bookingListEl.innerHTML =
        '<div class="bg-gray-800 p-6 rounded-lg shadow-md text-center text-gray-400">Bạn chưa có lịch hẹn nào.</div>';
      return;
    }

    let html = "";
    bookings.forEach((booking) => {
      const startDate = new Date(booking.start_time).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      });
      const endDate = new Date(booking.end_time).toLocaleTimeString("vi-VN", {
        timeStyle: "short",
      });
      const status = formatBookingStatus(booking.status);

      html += `
                <div class="booking-item bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
                    <p class="font-bold text-lg text-white">${booking.service_type}</p>
                    <p class="text-gray-400">Lịch ID: ${booking.id} | KTV: ID ${booking.technician_id} | Trạm: ID ${booking.station_id}</p>
                    <p class="text-sm text-gray-500">Thời gian: ${startDate} - ${endDate}</p>
                    <span class="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${status.class}">
                        Trạng thái: ${status.text}
                    </span>
                </div>
            `;
    });
    bookingListEl.innerHTML = html;
  } catch (error) {
    // ĐÃ SỬA: Màu error box
    bookingListEl.innerHTML =
      '<div class="bg-red-800 p-6 rounded-lg shadow-md text-center text-red-400">Lỗi: Không thể tải lịch hẹn.</div>';
    console.error("Lỗi khi tải lịch hẹn cho profile:", error);
  }
}

async function loadMyBookings() {
  const bookingListEl = document.getElementById("booking-list");
  if (!bookingListEl) return;
  // ĐÃ SỬA: Màu loading box
  bookingListEl.innerHTML =
    '<div class="bg-gray-800 p-6 rounded-lg shadow-md text-center text-gray-400">Đang tải lịch hẹn...</div>';

  try {
    // Gọi API GET MY BOOKINGS (GIỮ NGUYÊN)
    const bookings = await apiRequestCore(
      TOKEN_KEY,
      "/api/bookings/my-bookings",
      "GET"
    );

    if (bookings.length === 0) {
      // ĐÃ SỬA: Màu box rỗng
      bookingListEl.innerHTML =
        '<div class="bg-gray-800 p-6 rounded-lg shadow-md text-center text-gray-400">Bạn chưa có lịch hẹn nào.</div>';
      return;
    }

    let html = "";
    bookings.forEach((booking) => {
      const startDate = new Date(booking.start_time).toLocaleString("vi-VN", {
        dateStyle: "short",
        timeStyle: "short",
      });
      const endDate = new Date(booking.end_time).toLocaleTimeString("vi-VN", {
        timeStyle: "short",
      });
      const status = formatBookingStatus(booking.status);

      html += `
        <div class="booking-item bg-gray-800 p-6 rounded-lg shadow-md border-l-4 border-indigo-500">
            <p class="font-bold text-lg text-white">${booking.service_type}</p>
            <p class="text-gray-400">Lịch ID: ${booking.id} | KTV: ID ${booking.technician_id} | Trạm: ID ${booking.station_id}</p>
            <p class="text-sm text-gray-500">Thời gian: ${startDate} - ${endDate}</p>
            <span class="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium ${status.class}">
                Trạng thái: ${status.text}
            </span>
        </div>
    `;
    });
    bookingListEl.innerHTML = html;
  } catch (error) {
    // ĐÃ SỬA: Màu error box
    bookingListEl.innerHTML =
      '<div class="bg-red-800 p-6 rounded-lg shadow-md text-center text-red-400">Lỗi: Không thể tải lịch hẹn.</div>';
    console.error("Lỗi khi tải lịch hẹn:", error);
  }
}

// ========================================================
// ✅ LOGIC CHỨC NĂNG (MY TASKS - USER) (ĐÃ SỬA DARK MODE)
// ========================================================

/**
 * Helper: Định dạng trạng thái công việc (GIỮ NGUYÊN)
 */
function formatMaintenanceStatus(status) {
  switch (status) {
    case "pending":
      return { text: "Chờ thực hiện", class: "bg-yellow-100 text-yellow-800" };
    case "in_progress":
      return { text: "Đang tiến hành", class: "bg-blue-100 text-blue-800" };
    case "completed":
      return { text: "Hoàn thành", class: "bg-green-100 text-green-800" };
    case "failed":
      return { text: "Thất bại/Hủy", class: "bg-red-100 text-red-800" };
    default:
      return { text: status, class: "bg-gray-100 text-gray-800" };
  }
}

/**
 * Tải danh sách công việc bảo trì của người dùng hiện tại (ĐÃ SỬA DARK MODE)
 */
async function loadMyTasks() {
  const container = document.getElementById("my-tasks-list-container");
  if (!container) return;

  // ĐÃ SỬA: Màu loading box
  container.innerHTML =
    '<div class="bg-gray-800 p-6 rounded-lg shadow-md text-center text-gray-400">Đang tải danh sách công việc...</div>';

  try {
    const tasks = await apiRequestCore(
      TOKEN_KEY,
      "/api/maintenance/my-tasks", // Endpoint GET MY TASKS
      "GET"
    );

    if (!tasks || tasks.length === 0) {
      // ĐÃ SỬA: Màu box rỗng
      container.innerHTML =
        '<div class="bg-gray-800 p-6 rounded-lg shadow-md text-center text-gray-400">Bạn chưa có công việc bảo trì nào.</div>';
      return;
    }

    container.innerHTML = tasks.map(renderTaskCard).join("");
  } catch (error) {
    // ĐÃ SỬA: Màu error box
    container.innerHTML = `
            <div class="text-center py-8 bg-red-800 text-red-400 rounded-lg border border-red-700">
                <p>Lỗi khi tải danh sách công việc. Vui lòng thử lại sau.</p>
            </div>
        `;
    console.error("Failed to load my tasks:", error);
  }
}
window.loadMyTasks = loadMyTasks;

function renderTaskCard(task) {
  const statusInfo = formatMaintenanceStatus(task.status);
  const date = new Date(task.created_at).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  return `
        <div class="bg-gray-800 p-5 rounded-lg shadow-md border-l-4 border-${
          statusInfo.class.includes("green")
            ? "green-500"
            : statusInfo.class.includes("blue")
            ? "blue-500"
            : statusInfo.class.includes("yellow")
            ? "yellow-500"
            : "red-500"
        } flex justify-between items-center">
            <div>
                <h3 class="text-xl font-bold text-white">${
                  task.description
                }</h3>
                <p class="text-sm text-gray-400 mt-1">Booking ID: ${
                  task.booking_id
                } | Task ID: ${task.id} | KTV ID: ${task.technician_id}</p>
                <p class="text-sm text-gray-300 mt-1">VIN Xe: <span class="font-mono text-indigo-400">${
                  task.vehicle_vin
                }</span></p>
                <p class="text-xs text-gray-500 mt-2">Ngày khởi tạo: ${date}</p>
            </div>
            <div class="text-right space-y-2">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
                  statusInfo.class
                }">
                    Trạng thái: ${statusInfo.text}
                </span>
                <p class="text-sm text-gray-400">
                    ${
                      task.status === "completed"
                        ? "Hoàn thành!"
                        : task.status === "pending"
                        ? "Công việc chờ được xử lý."
                        : "Đang được tiến hành..."
                    }
                </p>
            </div>
        </div>
    `;
}

// ========================================================
// ✅ LOGIC CHỨC NĂNG (INVOICE - USER) (ĐÃ SỬA DARK MODE)
// ========================================================

// --- Tab Navigation Logic (ĐÃ SỬA DARK MODE) ---
function showHistory(type, element) {
  // CẬP NHẬT: Thay đổi màu tab cho Dark Mode
  document
    .querySelectorAll('#invoice-history-page a[id^="tab-"]')
    .forEach((tab) => {
      tab.classList.remove(
        "bg-gray-800",
        "text-indigo-400",
        "border-l",
        "border-t",
        "border-r"
      );
      // ĐÃ SỬA: Màu tab inactive
      tab.classList.add("bg-gray-700", "text-gray-400", "hover:text-gray-200");
    });

  element.classList.add(
    "bg-gray-800",
    "text-indigo-400",
    "border-l",
    "border-t",
    "border-r"
  );
  element.classList.remove(
    "bg-gray-700",
    "text-gray-400",
    "hover:text-gray-200"
  );
  // CẬP NHẬT: Đảm bảo border dưới vẫn là màu tối
  document
    .querySelectorAll("#invoice-history-page ul")
    .forEach((ul) => ul.classList.add("border-gray-700"));

  // Ẩn/Hiện nội dung (GIỮ NGUYÊN LOGIC)
  document.querySelectorAll(".history-content").forEach((content) => {
    content.classList.add("hidden");
  });
  document.getElementById(`history-content-${type}`).classList.remove("hidden");

  // Tải dữ liệu tương ứng (GIỮ NGUYÊN LOGIC)
  if (type === "invoices") {
    loadMyInvoicesList();
  } else if (type === "payments") {
    loadMyPaymentHistoryList();
  }
}
window.showHistory = showHistory;

// --- TẢI DANH SÁCH HÓA ĐƠN (Invoice List) (ĐÃ SỬA DARK MODE) ---
async function loadMyInvoicesList() {
  const container = document.getElementById("invoice-list-container");
  if (!container) return;

  // ĐÃ SỬA: Màu loading box
  container.innerHTML =
    '<div class="bg-gray-800 p-6 rounded-lg shadow-md text-center text-gray-400">Đang tải lịch sử hóa đơn...</div>';

  try {
    const invoices = await apiRequestCore(
      TOKEN_KEY,
      "/api/invoices/my", // Endpoint GET MY INVOICES
      "GET"
    );

    if (!invoices || invoices.length === 0) {
      // ĐÃ SỬA: Màu box rỗng
      container.innerHTML =
        '<div class="bg-gray-800 p-6 rounded-lg shadow-md text-center text-gray-400">Bạn chưa có hóa đơn nào.</div>';
      return;
    }

    container.innerHTML = invoices.map(renderInvoiceCard).join("");
  } catch (error) {
    // ĐÃ SỬA: Màu error box
    container.innerHTML = `
              <div class="text-center py-8 bg-red-800 text-red-400 rounded-lg border border-red-700">
                  <p>Lỗi khi tải lịch sử hóa đơn. Vui lòng thử lại sau.</p>
              </div>
          `;
    console.error("Failed to load invoice history:", error);
  }
}

// --- TẢI DANH SÁCH GIAO DỊCH (Payment History List) (ĐÃ SỬA DARK MODE) ---
async function loadMyPaymentHistoryList() {
  const container = document.getElementById("payment-history-list-container");
  if (!container) return;

  // ĐÃ SỬA: Màu loading box
  container.innerHTML =
    '<div class="bg-gray-800 p-6 rounded-lg shadow-md text-center text-gray-400">Đang tải lịch sử giao dịch...</div>';

  try {
    const history = await apiRequestCore(
      TOKEN_KEY,
      "/api/payments/history/my", // Endpoint GET MY HISTORY
      "GET"
    );

    if (!history || history.length === 0) {
      // ĐÃ SỬA: Màu box rỗng
      container.innerHTML =
        '<div class="bg-gray-800 p-6 rounded-lg shadow-md text-center text-gray-400">Bạn chưa có giao dịch thanh toán nào.</div>';
      return;
    }

    // Sử dụng lại hàm renderPaymentCard đã định nghĩa
    container.innerHTML = history.map(renderPaymentCard).join("");
  } catch (error) {
    // ĐÃ SỬA: Màu error box
    container.innerHTML = `
              <div class="text-center py-8 bg-red-800 text-red-400 rounded-lg border border-red-700">
                  <p>Lỗi khi tải lịch sử giao dịch. Vui lòng thử lại sau.</p>
              </div>
          `;
    console.error("Failed to load payment history:", error);
  }
}

// --- Render Invoice Card (ĐÃ SỬA DARK MODE) ---
function renderInvoiceCard(invoice) {
  const statusInfo = formatInvoiceStatus(invoice.status);
  const date = new Date(invoice.created_at).toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });

  const isPaid = invoice.status === "paid";
  // ĐÃ SỬA: Màu nút Thanh Toán/Đã Thanh Toán
  const payButton = isPaid
    ? '<span class="block w-full text-sm text-center text-green-500 font-bold py-2">ĐÃ THANH TOÁN</span>'
    : `<button 
          onclick="showPaymentModal(${invoice.id}, ${invoice.total_amount}, '${invoice.status}')" 
          class="block w-full bg-green-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-green-700 transition"
        >
          Thanh Toán Ngay
        </button>`;

  return `
        <div class="bg-gray-800 p-5 rounded-lg shadow-md border-l-4 border-indigo-500 flex justify-between items-center hover:shadow-lg transition duration-200">
            <div>
                <h3 class="text-xl font-bold text-white">Hóa Đơn #${
                  invoice.id
                }</h3>
                <p class="text-sm text-gray-400 mt-1">Lịch hẹn ID: ${
                  invoice.booking_id
                } | Ngày tạo: ${date}</p>
                <p class="text-2xl font-bold ${
                  isPaid ? "text-green-500" : "text-red-500"
                } mt-2">
                    ${formatCurrency(invoice.total_amount)}
                </p>
            </div>
            <div class="text-right space-y-2">
                <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                  statusInfo.class
                }">
                    ${statusInfo.text}
                </span>
                <button 
                    onclick="showInvoiceDetails(${invoice.id})" 
                    class="block w-full bg-indigo-600 text-white text-sm font-medium py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
                >
                    Xem Chi Tiết
                </button>
                ${payButton}
            </div>
        </div>
    `;
}

// --- Render Payment Card (ĐÃ SỬA DARK MODE) ---
function renderPaymentCard(transaction) {
  const statusInfo = formatInvoiceStatus(transaction.status);
  const date = new Date(transaction.created_at).toLocaleString("vi-VN", {
    dateStyle: "short",
    timeStyle: "short",
  });

  return `
          <div class="bg-gray-800 p-5 rounded-lg shadow-md border-l-4 border-indigo-500 flex justify-between items-center hover:shadow-lg transition duration-200">
              <div>
                  <h3 class="text-xl font-bold text-white">Giao dịch #${
                    transaction.id
                  }</h3>
                  <p class="text-sm text-gray-400 mt-1">Hóa đơn ID: ${
                    transaction.invoice_id
                  } | Ngày: ${date}</p>
                  <p class="text-sm text-gray-400 mt-1">Phương thức: ${transaction.method.toUpperCase()} | PG ID: ${
    transaction.pg_transaction_id
  }</p>
                  <p class="text-2xl font-bold ${
                    transaction.status === "success"
                      ? "text-green-500"
                      : "text-red-500"
                  } mt-2">
                      ${formatCurrency(transaction.amount)}
                  </p>
              </div>
              <div class="text-right space-y-2">
                  <span class="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                    statusInfo.class
                  }">
                      ${statusInfo.text}
                  </span>
              </div>
          </div>
      `;
}

// --- LOGIC MODAL CHI TIẾT (ĐÃ SỬA DARK MODE) ---

const invoiceDetailModal = document.getElementById("invoice-detail-modal");

function closeInvoiceDetailModal() {
  if (invoiceDetailModal) invoiceDetailModal.classList.add("hidden");
}
window.closeInvoiceDetailModal = closeInvoiceDetailModal; // Export ra window

async function showInvoiceDetails(invoiceId) {
  try {
    const detail = await apiRequestCore(
      TOKEN_KEY,
      `/api/invoices/${invoiceId}`,
      "GET"
    );

    if (!detail) throw new Error("Không tìm thấy chi tiết hóa đơn.");

    // 1. Cập nhật header/footer (GIỮ NGUYÊN LOGIC)
    const statusInfo = formatInvoiceStatus(detail.status);
    const date = new Date(detail.created_at).toLocaleString("vi-VN");

    document.getElementById("invoice-detail-id").textContent = detail.id;
    document.getElementById("invoice-detail-date").textContent = date;
    document.getElementById("invoice-detail-status").textContent =
      statusInfo.text;
    document.getElementById(
      "invoice-detail-status"
    ).className = `font-bold ${statusInfo.class} p-1 rounded`;
    document.getElementById("invoice-detail-total").textContent =
      formatCurrency(detail.total_amount);

    // 2. Cập nhật danh sách items (ĐÃ SỬA DARK MODE)
    const tbody = document.getElementById("invoice-items-table-body");
    tbody.innerHTML = detail.items
      .map(
        (item) => `
            <tr>
                <td class="px-3 py-2 text-sm text-white">${
                  item.description
                }</td>
                <td class="px-3 py-2 text-sm text-right">${item.quantity}</td>
                <td class="px-3 py-2 text-sm text-right">${formatCurrency(
                  item.unit_price
                )}</td>
                <td class="px-3 py-2 text-sm text-right font-medium">${formatCurrency(
                  item.sub_total
                )}</td>
            </tr>
        `
      )
      .join("");

    if (invoiceDetailModal) invoiceDetailModal.classList.remove("hidden");
  } catch (error) {
    console.error("Lỗi khi tải chi tiết hóa đơn:", error);
  }
}
window.showInvoiceDetails = showInvoiceDetails; // Export ra window

// --- PAYMENT HANDLERS (ĐÃ SỬA: Logic lưu amount vào dataset) ---
window.currentTransaction = null;

function showPaymentModal(invoiceId, amount, status) {
  if (status === "paid") {
    showToast("Hóa đơn này đã được thanh toán.", true);
    return;
  } // Reset và hiển thị modal

  document.getElementById("payment-modal").classList.remove("hidden");
  document
    .getElementById("payment-method-selection")
    .classList.remove("hidden");
  document.getElementById("payment-details-container").classList.add("hidden");
  document.getElementById("qr-code-display").classList.add("hidden");
  document.getElementById("bank-info-display").classList.add("hidden"); // Cập nhật thông tin hóa đơn

  document.getElementById("payment-invoice-id").textContent = invoiceId;
  document.getElementById("payment-amount").textContent =
    formatCurrency(amount);

  // LƯU Ý SỬA: Gán cả invoiceId VÀ amount vào dataset của modal
  const paymentModalEl = document.getElementById("payment-modal");
  paymentModalEl.dataset.invoiceId = invoiceId;
  paymentModalEl.dataset.amount = amount;
}
window.showPaymentModal = showPaymentModal;

function closePaymentModal() {
  document.getElementById("payment-modal").classList.add("hidden");
  window.currentTransaction = null;
  showHistory("invoices", document.getElementById("tab-invoices")); // Quay lại tab Hóa đơn và tải lại
}
window.closePaymentModal = closePaymentModal;

async function processPayment(method) {
  const paymentModalEl = document.getElementById("payment-modal");
  const invoiceId = paymentModalEl.dataset.invoiceId;
  // LẤY AMOUNT TỪ DATASET ĐÃ LƯU
  const amount = parseFloat(paymentModalEl.dataset.amount);

  try {
    // 1. Gọi Finance Service để tạo giao dịch (GIỮ NGUYÊN LOGIC)
    const response = await apiRequestCore(
      TOKEN_KEY,
      `/api/invoices/${invoiceId}/pay`,
      "POST",
      { method, amount }
    );

    showToast(response.message || "Đang chờ thanh toán...");
    window.currentTransaction = response.transaction;

    const rawDetails = response.transaction.payment_data;
    const details = JSON.parse(rawDetails);

    // 2. Cập nhật UI (ĐÃ SỬA DARK MODE)
    document.getElementById("payment-method-selection").classList.add("hidden");
    document
      .getElementById("payment-details-container")
      .classList.remove("hidden");
    document.getElementById("payment-detail-title").textContent =
      method === "momo_qr"
        ? "Thông Tin Thanh Toán QR"
        : "Thông Tin Chuyển Khoản Ngân Hàng";

    const testCodeToDisplay =
      details.test_code || response.transaction.pg_transaction_id;
    document.getElementById("test-code-display").textContent =
      testCodeToDisplay;

    if (method === "momo_qr") {
      document.getElementById("bank-info-display").classList.add("hidden");
      document.getElementById("qr-code-display").classList.remove("hidden");

      // CẬP NHẬT: Gán URL từ backend (vẫn giữ nguyên logic)
      document.getElementById("qr-image").src = details.qr_code_url;
      document.getElementById("payment-note-qr").textContent =
        details.payment_text;
    } else if (method === "bank_transfer") {
      document.getElementById("qr-code-display").classList.add("hidden");
      document.getElementById("bank-info-display").classList.remove("hidden");
      document.getElementById("bank-name").textContent = details.bank_name;
      document.getElementById("account-name").textContent =
        details.account_name;
      document.getElementById("account-number").textContent =
        details.account_number;
      document.getElementById("amount-bank").textContent = formatCurrency(
        details.amount
      );
      document.getElementById("payment-note-bank").textContent = details.note;
    }
  } catch (error) {
    console.error("Lỗi khi tạo giao dịch thanh toán:", error);
  }
}
window.processPayment = processPayment;

async function simulatePaymentSuccess() {
  if (!window.currentTransaction) {
    showToast("Lỗi mô phỏng: Không có giao dịch đang chờ.", true);
    return;
  } // FIX: Lấy PG ID từ object đã parse

  const pgTransactionId = window.currentTransaction.pg_transaction_id;

  if (
    !confirm(
      "Bạn có chắc chắn muốn mô phỏng giao dịch thành công? Hành động này sẽ cập nhật hóa đơn thành 'paid'."
    )
  )
    return;

  try {
    // Gọi Mock Webhook API (Endpoint public của Payment Service)
    await apiRequestCore(null, "/api/payments/webhook", "POST", {
      pg_transaction_id: pgTransactionId,
      status: "success",
    });

    showToast("✅ Mô phỏng thanh toán thành công! Hóa đơn đã được cập nhật.");
    closePaymentModal();
  } catch (error) {
    console.error("Lỗi mô phỏng webhook:", error);
  }
}
window.simulatePaymentSuccess = simulatePaymentSuccess;

// ===================== NOTIFICATION FUNCTIONS (ĐÃ SỬA DARK MODE) =====================

// Toggle notification dropdown (GIỮ NGUYÊN)
function toggleNotificationDropdown() {
  const dropdown = document.getElementById("notification-dropdown");
  if (dropdown) {
    dropdown.classList.toggle("hidden");
    if (!dropdown.classList.contains("hidden")) {
      loadUserNotifications();
    }
  }
}
window.toggleNotificationDropdown = toggleNotificationDropdown;

// Close dropdown when clicking outside (GIỮ NGUYÊN)
document.addEventListener("click", function (event) {
  const dropdown = document.getElementById("notification-dropdown");
  const button = event.target.closest("button");
  if (
    dropdown &&
    !dropdown.contains(event.target) &&
    !button?.onclick?.toString().includes("toggleNotificationDropdown")
  ) {
    dropdown.classList.add("hidden");
  }
});

// Load user notifications (ĐÃ SỬA DARK MODE)
async function loadUserNotifications() {
  const token = localStorage.getItem(TOKEN_KEY);
  if (!token) return;

  try {
    const notificationList = document.getElementById("notification-list");
    const badge = document.getElementById("notification-badge");

    if (!notificationList) return; // Khởi tạo trạng thái đang tải (ĐÃ SỬA: text-gray-400)
    if (
      notificationList.innerHTML.trim() === "" ||
      notificationList.innerHTML.includes("Lỗi")
    ) {
      notificationList.innerHTML =
        '<div class="p-4 text-center text-gray-400">Đang tải...</div>';
    } // Call API to get user notifications

    const notifications = await apiRequestCore(
      TOKEN_KEY,
      "/api/notifications/my-notifications", // Dùng endpoint API chính xác
      "GET"
    ); // Count unread notifications

    const unreadCount = notifications.filter((n) => n.status !== "read").length; // Update badge

    if (badge) {
      if (unreadCount > 0) {
        badge.textContent = unreadCount > 99 ? "99+" : unreadCount;
        badge.classList.remove("hidden");
      } else {
        badge.classList.add("hidden");
      }
    } // Render notifications

    if (notifications.length === 0) {
      // ĐÃ SỬA: text-gray-400
      notificationList.innerHTML =
        '<div class="p-4 text-center text-gray-400">Không có thông báo nào</div>';
      return;
    }

    notificationList.innerHTML = notifications
      .map((notif) => {
        const isUnread = notif.status !== "read";
        const typeColors = {
          booking_status: "text-blue-400", // Cập nhật màu cho Dark Mode
          payment: "text-green-400", // Cập nhật màu cho Dark Mode
          maintenance: "text-orange-400",
          inventory_alert: "text-yellow-400",
          reminder: "text-purple-400",
          system: "text-gray-400",
        };
        const typeColor =
          typeColors[notif.notification_type] || "text-gray-400";

        return `
        <div onclick="markNotificationAsRead(${notif.id})"
              class="p-4 border-b border-gray-700 hover:bg-gray-700 cursor-pointer ${
                // ĐÃ SỬA: bg-blue-900 bg-opacity-30
                isUnread ? "bg-blue-900 bg-opacity-30" : ""
              }">
          <div class="flex items-start">
            <div class="flex-1">
              <div class="flex items-center justify-between">
                <h4 class="font-semibold text-sm ${typeColor}">${
          notif.title
        }</h4>
                ${
                  isUnread
                    ? '<span class="w-2 h-2 bg-blue-400 rounded-full"></span>'
                    : ""
                }
              </div>
              <p class="text-sm text-gray-300 mt-1">${notif.message}</p>
              <p class="text-xs text-gray-500 mt-1">${formatDateTime(
                notif.created_at
              )}</p>
            </div>
          </div>
        </div>
      `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading notifications:", error);
    const notificationList = document.getElementById("notification-list");
    if (notificationList) {
      // ĐÃ SỬA: text-red-400
      notificationList.innerHTML =
        '<div class="p-4 text-center text-red-400">Lỗi tải thông báo. Vui lòng kiểm tra Notification Service.</div>';
    }
  }
}
window.loadUserNotifications = loadUserNotifications;

// Mark notification as read (GIỮ NGUYÊN)
async function markNotificationAsRead(notificationId) {
  try {
    await apiRequestCore(
      TOKEN_KEY,
      `/api/notifications/${notificationId}/read`,
      "PUT"
    );
    loadUserNotifications(); // Reload to update UI
  } catch (error) {
    console.error("Error marking notification as read:", error);
  }
}
window.markNotificationAsRead = markNotificationAsRead;

// Mark all notifications as read (GIỮ NGUYÊN)
async function markAllNotificationsAsRead() {
  try {
    await apiRequestCore(TOKEN_KEY, "/api/notifications/read-all", "PUT");
    showToast("Đã đánh dấu tất cả thông báo là đã đọc");
    loadUserNotifications();
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
  }
}
window.markAllNotificationsAsRead = markAllNotificationsAsRead;

// Helper function to format datetime (GIỮ NGUYÊN)
function formatDateTime(dateString) {
  const date = new Date(dateString);
  const now = new Date();
  const diff = now - date;
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return "Vừa xong";
  if (minutes < 60) return `${minutes} phút trước`;
  if (hours < 24) return `${hours} giờ trước`;
  if (days < 7) return `${days} ngày trước`;

  return date.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
// File: frontend/scripts.js (Thêm vào cuối file)

/**
 * Sao chép KTV ID và Station ID từ lịch hẹn cũ vào form đặt lịch mới. (GIỮ NGUYÊN)
 * @param {number} techId ID KTV
 * @param {number} stationId ID Trạm Dịch vụ
 */
function copyBookingDetails(techId, stationId) {
  // 1. Cập nhật KTV ID
  document.getElementById("technician-id").value = techId; // 2. Cập nhật Station ID

  document.getElementById("station-id").value = stationId; // 3. Thông báo cho người dùng

  showToast(
    `Đã chọn KTV #${techId} và Trạm #${stationId} từ lịch hẹn cũ.`,
    false
  ); // 4. (Tùy chọn) Di chuyển lên đầu trang để xem form

  window.scrollTo({ top: 0, behavior: "smooth" });
}
window.copyBookingDetails = copyBookingDetails; // Xuất ra window cho HTML gọi
