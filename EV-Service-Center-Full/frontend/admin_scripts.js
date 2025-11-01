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

// ===================== ADMIN CORE FUNCTIONS =====================
const loginPage = document.getElementById("admin-login-page");
const dashboardPage = document.getElementById("dashboard");
const dashboardTitle = document.getElementById("dashboard-title");

function adminLogout() {
  localStorage.removeItem(window.ADMIN_TOKEN_KEY);
  window.showToast(
    "Phiên làm việc hết hạn hoặc không hợp lệ. Vui lòng đăng nhập lại.",
    true
  );
  // Đảm bảo navigate về trang login
  loginPage.classList.remove("hidden");
  dashboardPage.classList.add("hidden");
}
window.adminLogout = adminLogout; // Xuất ra window để có thể gọi từ bên ngoài

function showDashboard() {
  loginPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");
}

// ===================== CORE REQUEST FUNCTION (UPDATED) =====================
window.apiRequestCore = async function (
  tokenKey,
  endpoint,
  method = "GET",
  body = null
) {
  // API_BASE_URL không được định nghĩa trong file này, dùng window.location.origin
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
      // ✅ THÊM LOGIC XỬ LÝ LỖI 401
      if (response.status === 401 && token) {
        adminLogout();
        // Ném lỗi để dừng xử lý tiếp theo và thoát khỏi khối try
        throw new Error("Token Admin hết hạn.");
      }

      console.error("API Error:", data);
      // Hiển thị toast cho các lỗi khác (400, 403, 404, 409,...)
      const errorMessage =
        data.message || data.error || `HTTP Error ${response.status}`;
      window.showToast(errorMessage || "Lỗi hệ thống!", true);

      throw new Error(errorMessage || "API Error");
    }

    return data;
  } catch (err) {
    console.error("🚨 API Request Error:", err);
    // Không show toast ở đây vì nó đã được xử lý trong khối if (!response.ok)
    throw err;
  } finally {
    hideLoading();
  }
};

// ===================== NAVIGATION LOGIC =====================

/**
 * Chuyển đổi giữa các phần Users, Inventory và Bookings
 */
function navigateToDashboardSection(sectionId, title) {
  document.querySelectorAll(".dashboard-section").forEach((section) => {
    section.classList.add("hidden");
    section.classList.remove("active");
  });

  const activeSection = document.getElementById(sectionId);
  if (activeSection) {
    activeSection.classList.remove("hidden");
    activeSection.classList.add("active");
    if (dashboardTitle) dashboardTitle.textContent = title;
  }

  // Tải dữ liệu tùy thuộc vào section
  if (sectionId === "inventory-section") {
    loadAllInventory();
  } else if (sectionId === "users-section") {
    loadAllUsers();
  }
  // ✅ KÍCH HOẠT LOGIC BOOKING
  else if (sectionId === "bookings-section") {
    loadAllBookings();
  }
}
window.navigateToDashboardSection = navigateToDashboardSection;

// ===================== LOGIN HANDLER =====================
document
  .getElementById("admin-login-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email_username = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;

    try {
      // Gọi API login (không dùng tokenKey)
      const data = await window.apiRequestCore(null, "/api/login", "POST", {
        email_username,
        password,
      });
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
      // CHUYỂN MẶC ĐỊNH SANG INVENTORY
      navigateToDashboardSection("inventory-section", "Quản lý Kho Phụ Tùng");
    } catch (error) {
      console.error("Login failed:", error);
    }
  });

// ===================== USER MANAGEMENT =====================
async function loadAllUsers() {
  try {
    const users = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/admin/users"
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
  try {
    await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      `/api/admin/users/${userId}/toggle-lock`,
      "PUT"
    );
    window.showToast("Cập nhật trạng thái người dùng thành công.");
    loadAllUsers();
  } catch (error) {
    console.error("Lỗi khi khóa/mở khóa user:", error);
    // Toast được hiển thị trong apiRequestCore
  }
}

async function deleteUser(userId) {
  if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;

  try {
    await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      `/api/admin/users/${userId}`,
      "DELETE"
    );
    window.showToast("Đã xóa người dùng!");
    loadAllUsers();
  } catch (error) {
    // Toast được hiển thị trong apiRequestCore
  }
}
window.deleteUser = deleteUser;
window.toggleUserLock = toggleUserLock; // Cần export cho onclick

// XỬ LÝ MODAL THÊM NGƯỜI DÙNG
const addUserModal = document.getElementById("add-user-modal");
function openAddUserModal() {
  if (addUserModal) addUserModal.classList.remove("hidden");
}
window.openAddUserModal = openAddUserModal; // Export cho onclick

function closeAddUserModal() {
  if (addUserModal) addUserModal.classList.add("hidden");
  document.getElementById("add-user-form")?.reset();
}
window.closeAddUserModal = closeAddUserModal; // Export cho onclick

document
  .getElementById("add-user-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const username = document.getElementById("add-username").value;
    const email = document.getElementById("add-email").value;
    const password = document.getElementById("add-password").value;
    const role = document.getElementById("add-role").value;

    try {
      await window.apiRequestCore(
        window.ADMIN_TOKEN_KEY,
        "/api/admin/users",
        "POST",
        { username, email, password, role }
      );

      window.showToast("Tạo người dùng thành công!");
      closeAddUserModal();
      loadAllUsers();
    } catch (error) {
      console.error("Lỗi khi tạo người dùng:", error);
    }
  });

// ===================== INVENTORY MANAGEMENT =====================
// --- LOAD INVENTORY ---
async function loadAllInventory() {
  try {
    const items = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/inventory/items" // Endpoint GET ALL ITEMS
    );
    const tbody = document.getElementById("inventory-table-body");
    tbody.innerHTML = "";

    if (!items || items.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="text-center text-gray-500 py-4">Không có vật tư nào trong kho.</td></tr>`;
      return;
    }

    tbody.innerHTML = items
      .map((item) => {
        // Logic hiển thị tồn kho thấp
        const isLowStock = item.quantity <= item.min_quantity;
        const rowClass = isLowStock
          ? "bg-red-50 hover:bg-red-100"
          : "hover:bg-gray-50";
        const statusBadge = isLowStock
          ? '<span class="p-1 rounded-full text-xs font-semibold bg-red-100 text-red-800">Cần bổ sung</span>'
          : '<span class="p-1 rounded-full text-xs font-semibold bg-green-100 text-green-800">Đủ hàng</span>';

        return `
                    <tr class="${rowClass}">
                        <td class="px-6 py-4 text-sm">${item.id}</td>
                        <td class="px-6 py-4 text-sm">${item.name}</td>
                        <td class="px-6 py-4 text-sm">${item.part_number}</td>
                        <td class="px-6 py-4 text-sm text-center font-bold">${
                          item.quantity
                        }</td>
                        <td class="px-6 py-4 text-sm text-center">${
                          item.min_quantity
                        }</td>
                        <td class="px-6 py-4 text-sm">${new Intl.NumberFormat(
                          "vi-VN"
                        ).format(item.price)}₫</td>
                        <td class="px-6 py-4 text-center space-x-2">
                            ${statusBadge}
                            <button onclick="openItemModal('edit', ${
                              item.id
                            })" class="text-indigo-600 hover:text-indigo-900">
                                Edit
                            </button>
                            <button onclick="deleteItem(${
                              item.id
                            })" class="text-red-600 hover:text-red-900">
                                Delete
                            </button>
                        </td>
                    </tr>`;
      })
      .join("");
  } catch (err) {
    console.error(err);
    document.getElementById(
      "inventory-table-body"
    ).innerHTML = `<tr><td colspan="7" class="text-center text-red-500 py-4">Lỗi khi tải dữ liệu Kho.</td></tr>`;
  }
}
window.loadAllInventory = loadAllInventory; // Export cho onclick Load lại

// --- MODAL HANDLERS ---
const itemModal = document.getElementById("item-modal");
const itemForm = document.getElementById("item-form");
const itemModalTitle = document.getElementById("item-modal-title");
const itemSubmitButton = document.getElementById("item-submit-button");

function closeItemModal() {
  if (itemModal) itemModal.classList.add("hidden");
  itemForm?.reset();
  document.getElementById("item-id-hidden").value = "";
}
window.closeItemModal = closeItemModal; // Export cho onclick

async function openItemModal(mode, itemId = null) {
  itemForm.dataset.mode = mode;
  itemForm.reset();

  if (mode === "add") {
    itemModalTitle.textContent = "Thêm Vật tư Mới";
    itemSubmitButton.textContent = "Thêm";
    document.getElementById("item-part-number").disabled = false;
    if (itemModal) itemModal.classList.remove("hidden");
  } else if (mode === "edit" && itemId) {
    itemModalTitle.textContent = "Chỉnh Sửa Vật tư";
    itemSubmitButton.textContent = "Lưu Thay Đổi";
    document.getElementById("item-id-hidden").value = itemId;

    try {
      const item = await window.apiRequestCore(
        window.ADMIN_TOKEN_KEY,
        `/api/inventory/items/${itemId}`
      );

      document.getElementById("item-name").value = item.name;
      document.getElementById("item-part-number").value = item.part_number;
      document.getElementById("item-part-number").disabled = true;
      document.getElementById("item-quantity").value = item.quantity;
      document.getElementById("item-min-quantity").value = item.min_quantity;
      document.getElementById("item-price").value = item.price;

      if (itemModal) itemModal.classList.remove("hidden");
    } catch (error) {
      // Toast đã được xử lý trong apiRequestCore
    }
  }
}
window.openItemModal = openItemModal; // Export cho onclick

// --- FORM SUBMIT HANDLER (Add/Edit) ---
itemForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const mode = itemForm.dataset.mode;
  const itemId = document.getElementById("item-id-hidden").value;

  const data = {
    name: document.getElementById("item-name").value,
    part_number: document.getElementById("item-part-number").value,
    quantity: parseInt(document.getElementById("item-quantity").value),
    min_quantity: parseInt(document.getElementById("item-min-quantity").value),
    price: parseFloat(document.getElementById("item-price").value),
  };

  try {
    if (mode === "add") {
      await window.apiRequestCore(
        window.ADMIN_TOKEN_KEY,
        "/api/inventory/items",
        "POST",
        data
      );
      window.showToast("Thêm vật tư thành công!");
    } else if (mode === "edit" && itemId) {
      delete data.part_number;

      await window.apiRequestCore(
        window.ADMIN_TOKEN_KEY,
        `/api/inventory/items/${itemId}`,
        "PUT",
        data
      );
      window.showToast("Cập nhật vật tư thành công!");
    }

    closeItemModal();
    loadAllInventory(); // Tải lại bảng
  } catch (error) {
    console.error("Lỗi khi lưu vật tư:", error);
  }
});

// --- DELETE FUNCTION ---
async function deleteItem(itemId) {
  if (!confirm(`Bạn có chắc chắn muốn xóa vật tư có ID ${itemId} này không?`))
    return;

  try {
    await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      `/api/inventory/items/${itemId}`,
      "DELETE"
    );
    window.showToast("Đã xóa vật tư!");
    loadAllInventory();
  } catch (error) {
    // Toast đã được xử lý trong apiRequestCore
  }
}
window.deleteItem = deleteItem; // Cần export hàm này ra window để HTML có thể gọi

// ========================================================
// ✅ LOGIC BOOKING MANAGEMENT
// ========================================================

// Hàm Helper: Định dạng trạng thái hiển thị
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

// 1. Tải tất cả lịch hẹn
async function loadAllBookings() {
  const tbody = document.getElementById("bookings-table-body");
  if (!tbody) return;
  tbody.innerHTML =
    '<tr><td colspan="7" class="text-center text-gray-500 py-4">Đang tải dữ liệu...</td></tr>';

  try {
    const bookings = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/bookings/items", // Endpoint GET ALL BOOKINGS (Đã bảo vệ)
      "GET"
    );

    if (!bookings || bookings.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center text-gray-500 py-4">Không có lịch hẹn nào.</td></tr>';
      return;
    }

    tbody.innerHTML = bookings
      .map((booking) => {
        const startDate = new Date(booking.start_time).toLocaleString("vi-VN", {
          dateStyle: "short",
          timeStyle: "short",
        });
        const endDate = new Date(booking.end_time).toLocaleTimeString("vi-VN", {
          timeStyle: "short",
        });
        const statusInfo = formatBookingStatus(booking.status);

        return `
                    <tr id="booking-row-${booking.id}">
                        <td class="px-6 py-4 text-sm">${booking.id}</td>
                        <td class="px-6 py-4 text-sm">${
                          booking.customer_name
                        } (ID: ${booking.user_id})</td>
                        <td class="px-6 py-4 text-sm">${startDate} - ${endDate}</td>
                        <td class="px-6 py-4 text-sm">${
                          booking.service_type
                        }</td>
                        <td class="px-6 py-4 text-sm">KTV: ${
                          booking.technician_id
                        } / Trạm: ${booking.station_id}</td>
                        <td class="px-6 py-4 text-sm">
                            <select 
                                class="status-select border rounded p-1 text-xs ${
                                  statusInfo.class
                                }" 
                                data-booking-id="${booking.id}" 
                                onchange="updateBookingStatus(${
                                  booking.id
                                }, this.value)">
                                <option value="pending" ${
                                  booking.status === "pending" ? "selected" : ""
                                }>Chờ xác nhận</option>
                                <option value="confirmed" ${
                                  booking.status === "confirmed"
                                    ? "selected"
                                    : ""
                                }>Đã xác nhận</option>
                                <option value="completed" ${
                                  booking.status === "completed"
                                    ? "selected"
                                    : ""
                                }>Hoàn thành</option>
                                <option value="canceled" ${
                                  booking.status === "canceled"
                                    ? "selected"
                                    : ""
                                }>Hủy</option>
                            </select>
                        </td>
                        <td class="px-6 py-4 text-center space-x-2">
                            <button onclick="deleteBooking(${
                              booking.id
                            })" class="text-red-600 hover:text-red-900">Xóa</button>
                        </td>
                    </tr>
                `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-red-500 py-4">Lỗi khi tải dữ liệu Lịch Hẹn.</td></tr>';
  }
}
window.loadAllBookings = loadAllBookings; // Export ra window cho HTML gọi

// 2. Cập nhật trạng thái
async function updateBookingStatus(bookingId, newStatus) {
  if (
    !confirm(
      `Bạn có chắc muốn cập nhật trạng thái của lịch hẹn ${bookingId} thành ${newStatus.toUpperCase()}?`
    )
  ) {
    loadAllBookings(); // Tải lại để revert nếu người dùng hủy
    return;
  }

  try {
    await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      `/api/bookings/items/${bookingId}/status`,
      "PUT",
      { status: newStatus }
    );
    window.showToast("Cập nhật trạng thái thành công!");
    loadAllBookings(); // Tải lại bảng để cập nhật màu sắc/hiển thị
  } catch (error) {
    // Toast đã được xử lý trong apiRequestCore
    loadAllBookings(); // Tải lại để reset trạng thái
    console.error("Lỗi cập nhật trạng thái:", error);
  }
}
window.updateBookingStatus = updateBookingStatus; // Export ra window cho HTML gọi

// 3. Xóa lịch hẹn
async function deleteBooking(bookingId) {
  if (!confirm(`Bạn có chắc chắn muốn xóa vĩnh viễn lịch hẹn ID ${bookingId}?`))
    return;

  try {
    await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      `/api/bookings/items/${bookingId}`,
      "DELETE"
    );
    window.showToast("Đã xóa lịch hẹn!");

    // Xóa dòng khỏi bảng
    document.getElementById(`booking-row-${bookingId}`)?.remove();
  } catch (error) {
    // Toast đã được xử lý trong apiRequestCore
  }
}
window.deleteBooking = deleteBooking; // Export ra window cho HTML gọi

// --- Khối INIT: Đảm bảo tải Inventory mặc định ---
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem(window.ADMIN_TOKEN_KEY);
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const valid = payload.exp * 1000 > Date.now();

    if (valid && payload.role === window.ADMIN_ROLE) {
      showDashboard();
      // CHUYỂN TẢI MẶC ĐỊNH SANG INVENTORY SAU KHI PAGE ĐÃ HIỆN
      navigateToDashboardSection("inventory-section", "Quản lý Kho Phụ Tùng");
    } else {
      adminLogout();
    }
  } catch {
    adminLogout();
  }
});
