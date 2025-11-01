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
  // ✅ CHỈ ẨN/HIỆN TRANG, KHÔNG GỌI loadAllUsers() TẠI ĐÂY NỮA
  loginPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");
}

// ===================== LOGIN HANDLER =====================
document
  .getElementById("admin-login-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email_username = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;

    try {
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
      // ✅ KHI LOGIN THÀNH CÔNG, CHUYỂN NGAY SANG INVENTORY
      navigateToDashboardSection("inventory-section", "Quản lý Kho Phụ Tùng");
    } catch (error) {
      console.error("Login failed:", error);
    }
  });

// ===================== LOAD USERS =====================
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
    // Dùng ADMIN_TOKEN_KEY
    const updatedUser = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      `/api/admin/users/${userId}/toggle-lock`,
      "PUT"
    );

    // Thay thế alert bằng showToast để đồng bộ UX
    window.showToast("Cập nhật trạng thái người dùng thành công.");
    loadAllUsers(); // Tải lại danh sách
  } catch (error) {
    console.error("Lỗi khi khóa/mở khóa user:", error);
    window.showToast("Cập nhật thất bại. Vui lòng xem console.", true);
  }
}

async function deleteUser(userId) {
  // Thay thế confirm bằng modal tùy chỉnh (do quy tắc không dùng confirm())
  // Tạm thời giữ lại confirm() do chưa có modal tùy chỉnh để tránh phá vỡ chức năng
  if (!confirm("Bạn có chắc chắn muốn xóa người dùng này?")) return;

  await window.apiRequestCore(
    window.ADMIN_TOKEN_KEY,
    `/api/admin/users/${userId}`,
    "DELETE"
  );
  window.showToast("Đã xóa người dùng!");
  loadAllUsers();
}

// XỬ LÝ MODAL THÊM NGƯỜI DÙNG ==
const addUserModal = document.getElementById("add-user-modal");
function openAddUserModal() {
  if (addUserModal) addUserModal.classList.remove("hidden");
}

function closeAddUserModal() {
  if (addUserModal) addUserModal.classList.add("hidden");
  // Xóa trống form khi đóng
  document.getElementById("add-user-form")?.reset();
}

// --- Add User Form Handler (Lắng nghe sự kiện submit) ---
document
  .getElementById("add-user-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Lấy dữ liệu từ form
    const username = document.getElementById("add-username").value;
    const email = document.getElementById("add-email").value;
    const password = document.getElementById("add-password").value;
    const role = document.getElementById("add-role").value;

    try {
      // 2. Gọi API (dùng route POST mới)
      await window.apiRequestCore(
        window.ADMIN_TOKEN_KEY, // Phải có token
        "/api/admin/users", // Đường dẫn POST
        "POST",
        { username, email, password, role } // Dữ liệu body
      );

      // 3. Xử lý thành công
      window.showToast("Tạo người dùng thành công!");
      closeAddUserModal();
      loadAllUsers(); // Tải lại bảng user
    } catch (error) {
      // apiRequestCore đã tự động showToast, chúng ta chỉ cần log lỗi
      console.error("Lỗi khi tạo người dùng:", error);
    }
  });

// ========================================================
// ✅ LOGIC INVENTORY MỚI
// ========================================================

const dashboardTitle = document.getElementById("dashboard-title");

/**
 * Chuyển đổi giữa các phần Users và Inventory
 * @param {string} sectionId - ID của phần muốn hiện ('users-section' hoặc 'inventory-section')
 * @param {string} title - Tiêu đề mới cho Dashboard
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

  // Tải dữ liệu nếu chuyển sang Inventory
  if (sectionId === "inventory-section") {
    loadAllInventory();
  } else if (sectionId === "users-section") {
    loadAllUsers(); // Tải lại Users khi quay lại
  }
}
window.navigateToDashboardSection = navigateToDashboardSection; // Export ra ngoài window

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

// --- MODAL HANDLERS ---
const itemModal = document.getElementById("item-modal");
const itemForm = document.getElementById("item-form");
const itemModalTitle = document.getElementById("item-modal-title");
const itemSubmitButton = document.getElementById("item-submit-button");

function closeItemModal() {
  if (itemModal) itemModal.classList.add("hidden");
  itemForm?.reset();
  document.getElementById("item-id-hidden").value = ""; // Xóa ID khi đóng
}

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
      // Lấy dữ liệu item để điền vào form (GET /api/inventory/items/<id>)
      const item = await window.apiRequestCore(
        window.ADMIN_TOKEN_KEY,
        `/api/inventory/items/${itemId}`
      );

      document.getElementById("item-name").value = item.name;
      document.getElementById("item-part-number").value = item.part_number;
      // Không cho sửa Part Number khi Edit
      document.getElementById("item-part-number").disabled = true;
      document.getElementById("item-quantity").value = item.quantity;
      document.getElementById("item-min-quantity").value = item.min_quantity;
      document.getElementById("item-price").value = item.price;

      if (itemModal) itemModal.classList.remove("hidden");
    } catch (error) {
      window.showToast("Không tìm thấy vật tư để chỉnh sửa.", true);
    }
  }
}

// --- FORM SUBMIT HANDLER (Add/Edit) ---
itemForm?.addEventListener("submit", async (e) => {
  e.preventDefault();

  const mode = itemForm.dataset.mode;
  const itemId = document.getElementById("item-id-hidden").value;

  const data = {
    name: document.getElementById("item-name").value,
    part_number: document.getElementById("item-part-number").value,
    // Chuyển sang số nguyên/số thực
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
      // Xóa part_number khỏi body khi Edit (vì không được sửa theo logic backend)
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
  // Thay thế confirm bằng showToast/modal tùy chỉnh sau
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
    window.showToast("Xóa vật tư thất bại.", true);
  }
}
window.deleteItem = deleteItem; // Cần export hàm này ra window để HTML có thể gọi

// --- Khối INIT: Đảm bảo tải Inventory mặc định ---
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem(window.ADMIN_TOKEN_KEY);
  if (!token) return;

  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const valid = payload.exp * 1000 > Date.now();

    if (valid && payload.role === window.ADMIN_ROLE) {
      showDashboard();
      // ✅ CHUYỂN TẢI MẶC ĐỊNH SANG INVENTORY SAU KHI PAGE ĐÃ HIỆN
      navigateToDashboardSection("inventory-section", "Quản lý Kho Phụ Tùng");
    } else {
      adminLogout();
    }
  } catch {
    adminLogout();
  }
});
