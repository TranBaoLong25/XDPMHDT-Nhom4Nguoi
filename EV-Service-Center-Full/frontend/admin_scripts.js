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

// --- Helper: Định dạng tiền tệ (BỔ SUNG) ---
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

// --- Helper: Định dạng trạng thái thanh toán (BỔ SUNG) ---
function formatPaymentStatus(status) {
  switch (status) {
    case "pending":
      return { text: "Chờ thanh toán", class: "bg-yellow-100 text-yellow-800" };
    case "success":
      return { text: "Thành công", class: "bg-green-100 text-green-800" };
    case "failed":
      return { text: "Thất bại", class: "bg-red-100 text-red-800" };
    case "expired":
      return { text: "Hết Hạn", class: "bg-gray-100 text-gray-800" };
    default:
      return { text: status, class: "bg-gray-100 text-gray-800" };
  }
}

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
  // API Gateway chạy trên http://localhost (port 80)
  const API_BASE_URL = "http://localhost";
  const url = `${API_BASE_URL}${endpoint}`;
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
 * Chuyển đổi giữa các phần Users, Inventory, Bookings, Invoices, Maintenance và Payment History
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
  } else if (sectionId === "bookings-section") {
    loadAllBookings();
  } else if (sectionId === "invoices-section") {
    loadAllInvoices();
  }
  // ✅ TẢI DỮ LIỆU MAINTENANCE
  else if (sectionId === "maintenance-section") {
    loadAllMaintenanceTasks();
  }
  // ✅ TẢI DỮ LIỆU PAYMENT HISTORY
  else if (sectionId === "payment-history-section") {
    loadAllPaymentHistory();
  }
  // ✅ TẢI DỮ LIỆU NOTIFICATIONS
  else if (sectionId === "notifications-section") {
    loadAllNotificationsAdmin();
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

    console.log("🔐 Login attempt:", { email_username, password: "***" });

    try {
      // Gọi API login (không dùng tokenKey)
      const data = await window.apiRequestCore(null, "/api/login", "POST", {
        email_username,
        password,
      });
      console.log("✅ Login successful:", data);
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
// ✅ LOGIC MAINTENANCE MANAGEMENT (MỚI)
// ========================================================

/**
 * Helper: Định dạng trạng thái công việc
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
 * 1. Tải tất cả công việc bảo trì
 */
async function loadAllMaintenanceTasks() {
  const tbody = document.getElementById("maintenance-table-body");
  if (!tbody) return;
  tbody.innerHTML =
    '<tr><td colspan="7" class="text-center text-gray-500 py-4">Đang tải dữ liệu...</td></tr>';

  try {
    const tasks = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/maintenance/tasks", // Endpoint GET ALL TASKS
      "GET"
    );

    if (!tasks || tasks.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center text-gray-500 py-4">Không có công việc bảo trì nào.</td></tr>';
      return;
    }

    tbody.innerHTML = tasks
      .map((task) => {
        const statusInfo = formatMaintenanceStatus(task.status);
        const disabled =
          task.status === "completed" || task.status === "failed"
            ? "disabled"
            : "";

        return `
                    <tr id="maintenance-row-${task.task_id}">
                        <td class="px-6 py-4 text-sm">${task.task_id}</td>
                        <td class="px-6 py-4 text-sm">${task.booking_id}</td>
                        <td class="px-6 py-4 text-sm">${task.description}</td>
                        <td class="px-6 py-4 text-sm font-mono">${
                          task.vehicle_vin
                        }</td>
                        <td class="px-6 py-4 text-sm">KTV ID: ${
                          task.technician_id
                        }</td>
                        <td class="px-6 py-4 text-sm">
                            <select
                                class="status-select border rounded p-1 text-xs ${
                                  statusInfo.class
                                }"
                                data-task-id="${task.task_id}"
                                onchange="updateMaintenanceTaskStatus(${
                                  task.task_id
                                }, this.value)"
                                ${disabled}>
                                <option value="pending" ${
                                  task.status === "pending" ? "selected" : ""
                                }>Chờ thực hiện</option>
                                <option value="in_progress" ${
                                  task.status === "in_progress"
                                    ? "selected"
                                    : ""
                                }>Đang tiến hành</option>
                                <option value="completed" ${
                                  task.status === "completed" ? "selected" : ""
                                }>Hoàn thành</option>
                                <option value="failed" ${
                                  task.status === "failed" ? "selected" : ""
                                }>Thất bại/Hủy</option>
                            </select>
                        </td>
                        <td class="px-6 py-4 text-center space-x-2">
                            ${
                              disabled
                                ? '<span class="text-gray-400">Đã khóa</span>'
                                : "<button onclick=\"if(confirm('Chuyển trạng thái sang hoàn thành?')) updateMaintenanceTaskStatus(" +
                                  task.task_id +
                                  ', \'completed\')" class="text-green-600 hover:text-green-900">Hoàn Thành</button>'
                            }
                        </td>
                    </tr>
                `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-red-500 py-4">Lỗi khi tải dữ liệu Công việc Bảo trì.</td></tr>';
  }
}
window.loadAllMaintenanceTasks = loadAllMaintenanceTasks;

/**
 * 2. Cập nhật trạng thái công việc
 */
async function updateTaskStatus(taskId, newStatus) {
  if (
    !confirm(
      `Bạn có chắc muốn cập nhật trạng thái của Công việc ${taskId} thành ${newStatus.toUpperCase()}?`
    )
  ) {
    loadAllMaintenanceTasks(); // Tải lại để revert nếu người dùng hủy
    return;
  }

  try {
    await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      `/api/maintenance/tasks/${taskId}/status`,
      "PUT",
      { status: newStatus }
    );
    window.showToast("Cập nhật trạng thái công việc thành công!");
    loadAllMaintenanceTasks(); // Tải lại bảng
  } catch (error) {
    // Toast đã được xử lý trong apiRequestCore
    loadAllMaintenanceTasks(); // Tải lại để reset trạng thái
    console.error("Lỗi cập nhật trạng thái công việc:", error);
  }
}
window.updateTaskStatus = updateTaskStatus;
window.updateMaintenanceTaskStatus = updateTaskStatus; // Alias for consistency

// --- MODAL TẠO TASK HANDLERS ---
const createTaskModal = document.getElementById("create-task-modal");

function closeCreateTaskModal() {
  if (createTaskModal) createTaskModal.classList.add("hidden");
  document.getElementById("create-task-form")?.reset();
}
window.closeCreateTaskModal = closeCreateTaskModal;

// Fetch incomplete bookings for task assignment
async function loadIncompleteBookings() {
  try {
    console.log("🔄 Loading incomplete bookings...");
    const bookings = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/bookings/items",
      "GET"
    );
    console.log("✅ Bookings loaded:", bookings);

    // Filter out completed and canceled bookings
    const incompleteBookings = bookings.filter(
      (booking) => booking.status !== "completed" && booking.status !== "canceled"
    );
    console.log("✅ Incomplete bookings:", incompleteBookings);

    const select = document.getElementById("task-booking-id");
    if (!select) {
      console.error("❌ Select element 'task-booking-id' not found");
      return;
    }

    // Clear existing options except first one
    select.innerHTML = '<option value="">-- Chọn lịch hẹn --</option>';

    // Populate with incomplete bookings
    incompleteBookings.forEach((booking) => {
      const option = document.createElement("option");
      option.value = booking.id;
      const date = new Date(booking.booking_date).toLocaleDateString("vi-VN");
      option.textContent = `#${booking.id} - ${booking.service_type} - ${date} - ${booking.status}`;
      select.appendChild(option);
    });

    if (incompleteBookings.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Không có lịch hẹn chưa hoàn thành";
      option.disabled = true;
      select.appendChild(option);
    }
  } catch (error) {
    console.error("Error loading incomplete bookings:", error);
    window.showToast("Không thể tải danh sách lịch hẹn", true);
  }
}

// Fetch technicians for task assignment
async function loadTechnicians() {
  try {
    console.log("🔄 Loading technicians...");
    const users = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/admin/users",
      "GET"
    );
    console.log("✅ Users loaded:", users);

    // Filter to only technicians
    const technicians = users.filter((user) => user.role === "technician");
    console.log("✅ Technicians:", technicians);

    const select = document.getElementById("task-technician-id");
    if (!select) {
      console.error("❌ Select element 'task-technician-id' not found");
      return;
    }

    // Clear existing options except first one
    select.innerHTML = '<option value="">-- Chọn kỹ thuật viên --</option>';

    // Populate with technicians
    technicians.forEach((tech) => {
      const option = document.createElement("option");
      option.value = tech.user_id;
      option.textContent = `#${tech.user_id} - ${tech.username} - ${tech.email}`;
      select.appendChild(option);
    });

    if (technicians.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Không có kỹ thuật viên nào";
      option.disabled = true;
      select.appendChild(option);
    }
  } catch (error) {
    console.error("Error loading technicians:", error);
    window.showToast("Không thể tải danh sách kỹ thuật viên", true);
  }
}

async function openCreateTaskModal() {
  console.log("🚀 Opening create task modal...");
  if (createTaskModal) {
    createTaskModal.classList.remove("hidden");
    // Load dropdown data when modal opens
    console.log("📥 Loading dropdown data...");
    await Promise.all([loadIncompleteBookings(), loadTechnicians()]);
    console.log("✅ Dropdown data loaded successfully");
  } else {
    console.error("❌ createTaskModal element not found");
  }
}
window.openCreateTaskModal = openCreateTaskModal;

document
  .getElementById("create-task-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const bookingId = parseInt(
      document.getElementById("task-booking-id")?.value
    );
    const technicianId = parseInt(
      document.getElementById("task-technician-id")?.value
    );

    if (isNaN(bookingId) || isNaN(technicianId)) {
      window.showToast("Booking ID và Technician ID phải là số hợp lệ.", true);
      return;
    }

    try {
      const data = await window.apiRequestCore(
        window.ADMIN_TOKEN_KEY,
        "/api/maintenance/tasks",
        "POST",
        {
          booking_id: bookingId,
          technician_id: technicianId,
        }
      );

      window.showToast(data.message || "Tạo công việc thành công!");
      closeCreateTaskModal();
      loadAllMaintenanceTasks();
    } catch (error) {
      console.error("Lỗi khi tạo công việc:", error);
    }
  });
// ========================================================
// ✅ LOGIC PAYMENT HISTORY MANAGEMENT (MỚI)
// ========================================================

/**
 * Helper: Định dạng tiền tệ
 */
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

// [DÁN LẠI ĐỊNH NGHĨA formatPaymentStatus CHO RÕ RÀNG TRONG BẢN CUỐI CÙNG]
// function formatPaymentStatus(status) { ... }
// Đã được định nghĩa ở trên, chỉ giữ lại định nghĩa này thôi.

/**
 * 1. Tải tất cả lịch sử thanh toán (Admin)
 */
async function loadAllPaymentHistory() {
  const tbody = document.getElementById("payment-history-table-body");
  if (!tbody) return;
  tbody.innerHTML =
    '<tr><td colspan="7" class="text-center text-gray-500 py-4">Đang tải dữ liệu...</td></tr>';

  try {
    const history = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/payments/history/all", // Endpoint GET ALL PAYMENT HISTORY
      "GET"
    );

    if (!history || history.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center text-gray-500 py-4">Không có giao dịch nào.</td></tr>';
      return;
    }

    tbody.innerHTML = history
      .map((t) => {
        const statusInfo = formatPaymentStatus(t.status);

        return `
                    <tr class="hover:bg-gray-50">
                        <td class="px-6 py-4 text-sm font-semibold">${t.id}</td>
                        <td class="px-6 py-4 text-sm">${t.invoice_id}</td>
                        <td class="px-6 py-4 text-sm">${t.user_id}</td>
                        <td class="px-6 py-4 text-sm font-bold text-red-600">${formatCurrency(
                          t.amount
                        )}</td>
                        <td class="px-6 py-4 text-sm uppercase">${t.method}</td>
                        <td class="px-6 py-4 text-sm font-mono">${
                          t.pg_transaction_id
                        }</td>
                        <td class="px-6 py-4 text-sm">
                            <span class="p-1 rounded-full text-xs font-semibold ${
                              statusInfo.class
                            }">
                                ${statusInfo.text}
                            </span>
                        </td>
                    </tr>
                `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-red-500 py-4">Lỗi khi tải dữ liệu Lịch sử Thanh toán.</td></tr>';
  }
}
window.loadAllPaymentHistory = loadAllPaymentHistory;
// ========================================================
// LOGIC BOOKING MANAGEMENT
// ... (GIỮ NGUYÊN HOẶC KHÔNG DÁN LẠI NẾU KHÔNG CÓ THAY ĐỔI)
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

// ========================================================
// LOGIC INVOICE MANAGEMENT
// ========================================================
// Hàm Helper: Định dạng tiền tệ
function formatCurrency(amount) {
  return new Intl.NumberFormat("vi-VN").format(amount) + "₫";
}

// Hàm Helper: Định dạng trạng thái Hóa đơn
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
    default:
      return { text: status, class: "bg-gray-100 text-gray-800" };
  }
}

// 1. Tải tất cả hóa đơn
async function loadAllInvoices() {
  const tbody = document.getElementById("invoices-table-body");
  if (!tbody) return;
  tbody.innerHTML =
    '<tr><td colspan="6" class="text-center text-gray-500 py-4">Đang tải dữ liệu...</td></tr>';

  try {
    const invoices = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/invoices/", // Endpoint GET ALL INVOICES
      "GET"
    );

    if (!invoices || invoices.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="6" class="text-center text-gray-500 py-4">Không có hóa đơn nào.</td></tr>';
      return;
    }

    tbody.innerHTML = invoices
      .map((invoice) => {
        const statusInfo = formatInvoiceStatus(invoice.status);
        const date = new Date(invoice.created_at).toLocaleDateString("vi-VN");

        return `
                    <tr id="invoice-row-${invoice.id}" class="hover:bg-gray-50">
                        <td class="px-6 py-4 text-sm">${invoice.id}</td>
                        <td class="px-6 py-4 text-sm">${invoice.booking_id}</td>
                        <td class="px-6 py-4 text-sm">${invoice.user_id}</td>
                        <td class="px-6 py-4 text-sm font-semibold text-red-600">${formatCurrency(
                          invoice.total_amount
                        )}</td>
                        <td class="px-6 py-4 text-sm">
                            <select 
                                class="status-select border rounded p-1 text-xs ${
                                  statusInfo.class
                                }" 
                                data-invoice-id="${invoice.id}" 
                                onchange="updateInvoiceStatus(${
                                  invoice.id
                                }, this.value)">
                                <option value="issued" ${
                                  invoice.status === "issued" ? "selected" : ""
                                }>Đã xuất</option>
                                <option value="pending" ${
                                  invoice.status === "pending" ? "selected" : ""
                                }>Chờ thanh toán</option>
                                <option value="paid" ${
                                  invoice.status === "paid" ? "selected" : ""
                                }>Đã thanh toán</option>
                                <option value="canceled" ${
                                  invoice.status === "canceled"
                                    ? "selected"
                                    : ""
                                }>Đã hủy</option>
                            </select>
                        </td>
                        <td class="px-6 py-4 text-center space-x-2">
                            <button onclick="showAdminInvoiceDetails(${
                              invoice.id
                            })" class="text-indigo-600 hover:text-indigo-900">
                                Xem Chi Tiết
                            </button>
                            </td>
                    </tr>
                `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    tbody.innerHTML =
      '<tr><td colspan="6" class="text-center text-red-500 py-4">Lỗi khi tải dữ liệu Hóa Đơn.</td></tr>';
  }
}
window.loadAllInvoices = loadAllInvoices;

// 2. Cập nhật trạng thái hóa đơn
async function updateInvoiceStatus(invoiceId, newStatus) {
  if (
    !confirm(
      `Bạn có chắc muốn cập nhật trạng thái của Hóa Đơn ${invoiceId} thành ${newStatus.toUpperCase()}?`
    )
  ) {
    loadAllInvoices(); // Tải lại để revert nếu người dùng hủy
    return;
  }

  try {
    await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      `/api/invoices/${invoiceId}/status`,
      "PUT",
      { status: newStatus }
    );
    window.showToast("Cập nhật trạng thái thành công!");
    loadAllInvoices(); // Tải lại bảng để cập nhật màu sắc/hiển thị
  } catch (error) {
    // Toast đã được xử lý trong apiRequestCore
    loadAllInvoices(); // Tải lại để reset trạng thái
    console.error("Lỗi cập nhật trạng thái hóa đơn:", error);
  }
}
window.updateInvoiceStatus = updateInvoiceStatus;

// 3. Logic Tạo Hóa Đơn (Từ Booking)
const createInvoiceModal = document.getElementById("create-invoice-modal");
const partsInputContainer = document.getElementById("parts-input-container");

// Load bookings có trạng thái confirmed và chưa có hóa đơn
async function loadInProgressBookings() {
  try {
    // Load cả bookings và invoices
    const [bookings, invoices] = await Promise.all([
      window.apiRequestCore(window.ADMIN_TOKEN_KEY, "/api/bookings/items", "GET"),
      window.apiRequestCore(window.ADMIN_TOKEN_KEY, "/api/invoices/", "GET")
    ]);

    const selectElement = document.getElementById("invoice-booking-id");
    if (!selectElement) return;

    // Xóa các option cũ (trừ option placeholder)
    selectElement.innerHTML = '<option value="">-- Chọn lịch hẹn --</option>';

    // Lấy danh sách booking_id đã có hóa đơn
    const bookingIdsWithInvoice = invoices.map(inv => inv.booking_id);

    // Lọc booking:
    // - Trạng thái "confirmed" (đã xác nhận)
    // - Chưa có hóa đơn (không có trong danh sách bookingIdsWithInvoice)
    const availableBookings = bookings.filter(
      (booking) =>
        booking.status === "confirmed" &&
        !bookingIdsWithInvoice.includes(booking.id)
    );

    // Thêm các booking khả dụng vào dropdown
    availableBookings.forEach((booking) => {
      const option = document.createElement("option");
      option.value = booking.id;
      const date = new Date(booking.start_time).toLocaleDateString("vi-VN");
      option.textContent = `#${booking.id} - ${booking.service_type} - ${date} - ${booking.customer_name}`;
      selectElement.appendChild(option);
    });

    if (availableBookings.length === 0) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Không có lịch hẹn khả dụng (đã xác nhận & chưa có hóa đơn)";
      option.disabled = true;
      selectElement.appendChild(option);
    }
  } catch (error) {
    console.error("Error loading available bookings:", error);
    window.showToast("Lỗi khi tải danh sách lịch hẹn");
  }
}

// Load danh sách items từ kho
async function loadInventoryItems() {
  try {
    const items = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/inventory/items",
      "GET"
    );

    // Lưu vào biến global để sử dụng khi thêm phụ tùng
    window.inventoryItems = items;
  } catch (error) {
    console.error("Error loading inventory items:", error);
    window.showToast("Lỗi khi tải danh sách phụ kiện");
  }
}

function closeCreateInvoiceModal() {
  if (createInvoiceModal) createInvoiceModal.classList.add("hidden");
  document.getElementById("create-invoice-form")?.reset();
  if (partsInputContainer) partsInputContainer.innerHTML = ""; // Clear parts inputs
}
window.closeCreateInvoiceModal = closeCreateInvoiceModal;

async function openCreateInvoiceModal() {
  if (createInvoiceModal) createInvoiceModal.classList.remove("hidden");

  // Chỉ cần load bookings từ completed tasks
  await loadInProgressBookings();
}
window.openCreateInvoiceModal = openCreateInvoiceModal;

function addPartInput() {
  if (!partsInputContainer) return; // Guard clause
  const count = partsInputContainer.children.length + 1;

  // Tạo dropdown options từ inventory items
  let itemOptions = '<option value="">-- Chọn phụ kiện --</option>';
  if (window.inventoryItems && window.inventoryItems.length > 0) {
    itemOptions += window.inventoryItems
      .map(
        (item) =>
          `<option value="${item.id}">#${item.id} - ${item.name} (${item.quantity} có sẵn) - ${item.price.toLocaleString("vi-VN")}₫</option>`
      )
      .join("");
  }

  const partHtml = `
        <div class="flex space-x-2 part-input-group" data-id="${count}">
            <select
                class="w-1/2 px-3 py-2 border rounded-md shadow-sm bg-white"
                name="item_id"
                required
            >
                ${itemOptions}
            </select>
            <input
                type="number"
                placeholder="Số lượng"
                class="w-1/4 px-3 py-2 border rounded-md shadow-sm"
                name="quantity"
                required
                min="1"
                value="1"
            />
            <span class="w-1/4 text-sm text-gray-500 flex items-center">
                (Phụ tùng ${count})
            </span>
            <button type="button" onclick="removePartInput(${count})" class="text-red-500 hover:text-red-700">
                &times;
            </button>
        </div>
    `;
  partsInputContainer.insertAdjacentHTML("beforeend", partHtml);
}
window.addPartInput = addPartInput;

function removePartInput(id) {
  const element = document.querySelector(`.part-input-group[data-id="${id}"]`);
  if (element) element.remove();
}

document
  .getElementById("create-invoice-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const bookingId = parseInt(
      document.getElementById("invoice-booking-id").value
    );

    try {
      const data = await window.apiRequestCore(
        window.ADMIN_TOKEN_KEY,
        "/api/invoices/",
        "POST",
        {
          booking_id: bookingId
        }
      );

      window.showToast(data.message || "Tạo hóa đơn thành công!");
      closeCreateInvoiceModal();
      loadAllInvoices();
    } catch (error) {
      console.error("Lỗi khi tạo hóa đơn:", error);
    }
  });

// 4. Logic Xem Chi Tiết Hóa Đơn (Admin)
const adminInvoiceDetailModal = document.getElementById(
  "admin-invoice-detail-modal"
);

function closeAdminInvoiceDetailModal() {
  if (adminInvoiceDetailModal) adminInvoiceDetailModal.classList.add("hidden");
}
window.closeAdminInvoiceDetailModal = closeAdminInvoiceDetailModal; // Export ra window

async function showAdminInvoiceDetails(invoiceId) {
  try {
    // API cho Admin cho phép lấy chi tiết (có items)
    const detail = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      `/api/invoices/${invoiceId}`,
      "GET"
    );

    if (!detail) throw new Error("Không tìm thấy chi tiết hóa đơn.");

    // 1. Cập nhật header/footer
    const statusInfo = formatInvoiceStatus(detail.status);
    const date = new Date(detail.created_at).toLocaleString("vi-VN");

    document.getElementById("admin-invoice-detail-id").textContent = detail.id;
    document.getElementById("admin-invoice-detail-date").textContent = date;
    document.getElementById("admin-invoice-detail-status").textContent =
      statusInfo.text;
    document.getElementById(
      "admin-invoice-detail-status"
    ).className = `font-bold ${statusInfo.class} p-1 rounded`;
    document.getElementById("admin-invoice-detail-total").textContent =
      formatCurrency(detail.total_amount);

    // 2. Cập nhật danh sách items
    const tbody = document.getElementById("admin-invoice-items-table-body");
    tbody.innerHTML = detail.items
      .map(
        (item) => `
            <tr>
                <td class="px-3 py-2 text-sm text-gray-900">${
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

    if (adminInvoiceDetailModal)
      adminInvoiceDetailModal.classList.remove("hidden");
  } catch (error) {
    console.error("Lỗi khi tải chi tiết hóa đơn:", error);
  }
}
window.showAdminInvoiceDetails = showAdminInvoiceDetails; // Export ra window

// ========================================================
// ✅ LOGIC NOTIFICATION MANAGEMENT (MỚI)
// ========================================================

/**
 * Helper: Định dạng priority notification
 */
function formatNotificationPriority(priority) {
  switch (priority) {
    case "low":
      return { text: "Low", class: "bg-green-100 text-green-800" };
    case "medium":
      return { text: "Medium", class: "bg-yellow-100 text-yellow-800" };
    case "high":
      return { text: "High", class: "bg-orange-100 text-orange-800" };
    case "urgent":
      return { text: "Urgent", class: "bg-red-100 text-red-800" };
    default:
      return { text: priority, class: "bg-gray-100 text-gray-800" };
  }
}

/**
 * Helper: Định dạng status notification
 */
function formatNotificationStatus(status) {
  switch (status) {
    case "pending":
      return { text: "Chờ gửi", class: "bg-yellow-100 text-yellow-800" };
    case "sent":
      return { text: "Đã gửi", class: "bg-blue-100 text-blue-800" };
    case "read":
      return { text: "Đã đọc", class: "bg-green-100 text-green-800" };
    case "failed":
      return { text: "Thất bại", class: "bg-red-100 text-red-800" };
    default:
      return { text: status, class: "bg-gray-100 text-gray-800" };
  }
}

/**
 * 1. Tải tất cả notifications (Admin)
 */
async function loadAllNotificationsAdmin() {
  const tbody = document.getElementById("notifications-table-body");
  if (!tbody) return;
  tbody.innerHTML =
    '<tr><td colspan="7" class="text-center text-gray-500 py-4">Đang tải dữ liệu...</td></tr>';

  try {
    const notifications = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/notifications/admin/all",
      "GET"
    );

    if (!notifications || notifications.length === 0) {
      tbody.innerHTML =
        '<tr><td colspan="7" class="text-center text-gray-500 py-4">Không có notification nào.</td></tr>';
      return;
    }

    tbody.innerHTML = notifications
      .map((notif) => {
        const priorityInfo = formatNotificationPriority(notif.priority);
        const statusInfo = formatNotificationStatus(notif.status);
        const isUnread = !notif.read_at;

        return `
                    <tr id="notification-row-${notif.id}" class="${
          isUnread ? "bg-blue-50" : ""
        }">
                        <td class="px-6 py-4 text-sm font-semibold">${
                          notif.id
                        }</td>
                        <td class="px-6 py-4 text-sm">${notif.user_id}</td>
                        <td class="px-6 py-4 text-sm">
                            <span class="px-2 py-1 text-xs font-semibold rounded ${
                              notif.notification_type === "booking"
                                ? "bg-indigo-100 text-indigo-800"
                                : notif.notification_type === "maintenance"
                                ? "bg-purple-100 text-purple-800"
                                : notif.notification_type === "payment"
                                ? "bg-green-100 text-green-800"
                                : "bg-gray-100 text-gray-800"
                            }">
                                ${notif.notification_type}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm max-w-xs truncate">${
                          notif.title
                        }</td>
                        <td class="px-6 py-4 text-sm">
                            <span class="px-2 py-1 text-xs font-semibold rounded ${
                              priorityInfo.class
                            }">
                                ${priorityInfo.text}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-sm">
                            <span class="px-2 py-1 text-xs font-semibold rounded ${
                              statusInfo.class
                            }">
                                ${statusInfo.text}
                            </span>
                        </td>
                        <td class="px-6 py-4 text-center space-x-2">
                            <button onclick="viewNotificationDetail(${
                              notif.id
                            })" class="text-indigo-600 hover:text-indigo-900">
                                Xem
                            </button>
                        </td>
                    </tr>
                `;
      })
      .join("");
  } catch (err) {
    console.error(err);
    tbody.innerHTML =
      '<tr><td colspan="7" class="text-center text-red-500 py-4">Lỗi khi tải dữ liệu Notifications.</td></tr>';
  }
}
window.loadAllNotificationsAdmin = loadAllNotificationsAdmin;

/**
 * 2. Modal tạo notification
 */
const createNotificationModal = document.getElementById(
  "create-notification-modal"
);

function closeCreateNotificationModal() {
  if (createNotificationModal)
    createNotificationModal.classList.add("hidden");
  document.getElementById("create-notification-form")?.reset();
}
window.closeCreateNotificationModal = closeCreateNotificationModal;

function openCreateNotificationModal() {
  if (createNotificationModal)
    createNotificationModal.classList.remove("hidden");
}
window.openCreateNotificationModal = openCreateNotificationModal;

document
  .getElementById("create-notification-form")
  ?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const userId = parseInt(document.getElementById("notif-user-id")?.value);
    const type = document.getElementById("notif-type")?.value;
    const title = document.getElementById("notif-title")?.value;
    const message = document.getElementById("notif-message")?.value;
    const priority = document.getElementById("notif-priority")?.value;

    if (isNaN(userId)) {
      window.showToast("User ID phải là số hợp lệ.", true);
      return;
    }

    try {
      // Sử dụng internal API endpoint
      const internalToken = prompt(
        "Nhập INTERNAL_SERVICE_TOKEN từ .env file:",
        "Bearer eyJhbGci..."
      );
      if (!internalToken) {
        window.showToast("Cần INTERNAL_SERVICE_TOKEN để tạo notification.", true);
        return;
      }

      const response = await fetch(
        "http://localhost/internal/notifications/create",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Internal-Token": internalToken,
          },
          body: JSON.stringify({
            user_id: userId,
            notification_type: type,
            title: title,
            message: message,
            priority: priority,
            channel: "in_app",
          }),
        }
      );

      const data = await response.json();

      if (response.ok) {
        window.showToast(data.message || "Tạo notification thành công!");
        closeCreateNotificationModal();
        loadAllNotificationsAdmin();
      } else {
        window.showToast(
          data.error || "Lỗi khi tạo notification",
          true
        );
      }
    } catch (error) {
      console.error("Lỗi khi tạo notification:", error);
      window.showToast("Lỗi khi tạo notification: " + error.message, true);
    }
  });

/**
 * 3. Xem chi tiết notification
 */
const viewNotificationModal = document.getElementById(
  "view-notification-modal"
);

function closeViewNotificationModal() {
  if (viewNotificationModal) viewNotificationModal.classList.add("hidden");
}
window.closeViewNotificationModal = closeViewNotificationModal;

async function viewNotificationDetail(notifId) {
  try {
    // Get all notifications và tìm notification cần xem
    const notifications = await window.apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/notifications/admin/all",
      "GET"
    );

    const notif = notifications.find((n) => n.id === notifId);
    if (!notif) {
      window.showToast("Không tìm thấy notification.", true);
      return;
    }

    // Fill dữ liệu vào modal
    document.getElementById("notif-detail-id").textContent = notif.id;
    document.getElementById("notif-detail-user-id").textContent =
      notif.user_id;
    document.getElementById("notif-detail-type").textContent =
      notif.notification_type;

    const priorityInfo = formatNotificationPriority(notif.priority);
    const statusInfo = formatNotificationStatus(notif.status);

    document.getElementById("notif-detail-priority").innerHTML = `
            <span class="px-2 py-1 text-xs font-semibold rounded ${priorityInfo.class}">
                ${priorityInfo.text}
            </span>
        `;

    document.getElementById("notif-detail-status").innerHTML = `
            <span class="px-2 py-1 text-xs font-semibold rounded ${statusInfo.class}">
                ${statusInfo.text}
            </span>
        `;

    document.getElementById("notif-detail-title").textContent = notif.title;
    document.getElementById("notif-detail-message").textContent =
      notif.message;
    document.getElementById("notif-detail-created").textContent = new Date(
      notif.created_at
    ).toLocaleString("vi-VN");
    document.getElementById("notif-detail-read-at").textContent = notif.read_at
      ? new Date(notif.read_at).toLocaleString("vi-VN")
      : "Chưa đọc";

    if (viewNotificationModal)
      viewNotificationModal.classList.remove("hidden");
  } catch (error) {
    console.error("Lỗi khi xem chi tiết notification:", error);
    window.showToast("Lỗi khi xem chi tiết notification.", true);
  }
}
window.viewNotificationDetail = viewNotificationDetail;

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

// ==================== BÁO CÁO FUNCTIONS ====================

function switchReportTab(tabName) {
  // Hide all tabs
  document.querySelectorAll('.report-content').forEach(tab => tab.classList.add('hidden'));
  document.querySelectorAll('.report-tab').forEach(tab => {
    tab.classList.remove('border-indigo-600', 'text-indigo-600');
    tab.classList.add('border-transparent', 'text-gray-500');
  });

  // Show selected tab
  if (tabName === 'revenue') {
    document.getElementById('revenue-report-tab').classList.remove('hidden');
    document.getElementById('tab-revenue').classList.add('border-indigo-600', 'text-indigo-600');
    loadRevenueReport();
  } else if (tabName === 'inventory') {
    document.getElementById('inventory-report-tab').classList.remove('hidden');
    document.getElementById('tab-inventory').classList.add('border-indigo-600', 'text-indigo-600');
    loadInventoryReport();
  }
}

async function loadDashboardData() {
  try {
    const response = await apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/reports/dashboard",
      "GET"
    );

    // Update dashboard cards
    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + '₫';

    document.getElementById('revenue-today').textContent = formatCurrency(response.revenue.today.total_revenue);
    document.getElementById('transactions-today').textContent = `${response.revenue.today.transaction_count} giao dịch`;

    document.getElementById('revenue-month').textContent = formatCurrency(response.revenue.month.total_revenue);
    document.getElementById('transactions-month').textContent = `${response.revenue.month.transaction_count} giao dịch`;

    document.getElementById('low-stock-count').textContent = response.inventory.low_stock_count;

  } catch (error) {
    console.error("Error loading dashboard:", error);
    showToast("Lỗi khi tải dashboard", true);
  }
}

async function loadRevenueReport() {
  try {
    const response = await apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/reports/revenue",
      "GET"
    );

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + '₫';

    // Revenue details
    const detailsHtml = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center p-4 bg-gray-50 rounded">
          <p class="text-sm text-gray-600">Tổng Doanh Thu</p>
          <p class="text-2xl font-bold text-green-600">${formatCurrency(response.total_revenue)}</p>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded">
          <p class="text-sm text-gray-600">Số Giao Dịch</p>
          <p class="text-2xl font-bold text-blue-600">${response.transaction_count}</p>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded">
          <p class="text-sm text-gray-600">Giá Trị TB</p>
          <p class="text-2xl font-bold text-indigo-600">${formatCurrency(response.avg_transaction_value)}</p>
        </div>
      </div>
    `;
    document.getElementById('revenue-details-container').innerHTML = detailsHtml;

    // Payment methods
    let methodsHtml = '<div class="space-y-3">';
    for (const [method, data] of Object.entries(response.payment_methods)) {
      const methodName = method === 'bank_transfer' ? 'Chuyển Khoản' : method === 'momo_qr' ? 'MoMo QR' : method;
      methodsHtml += `
        <div class="flex justify-between items-center p-3 bg-gray-50 rounded">
          <div>
            <p class="font-semibold">${methodName}</p>
            <p class="text-sm text-gray-600">${data.count} giao dịch</p>
          </div>
          <p class="text-lg font-bold text-green-600">${formatCurrency(data.amount)}</p>
        </div>
      `;
    }
    methodsHtml += '</div>';
    document.getElementById('payment-methods-container').innerHTML = methodsHtml || '<p class="text-gray-500">Chưa có dữ liệu</p>';

  } catch (error) {
    console.error("Error loading revenue report:", error);
    showToast("Lỗi khi tải báo cáo doanh thu", true);
  }
}

async function loadInventoryReport() {
  try {
    const response = await apiRequestCore(
      window.ADMIN_TOKEN_KEY,
      "/api/reports/inventory",
      "GET"
    );

    const formatCurrency = (amount) => new Intl.NumberFormat('vi-VN').format(amount) + '₫';

    // Overview
    const overviewHtml = `
      <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div class="text-center p-4 bg-gray-50 rounded">
          <p class="text-sm text-gray-600">Tổng Loại PT</p>
          <p class="text-2xl font-bold text-blue-600">${response.total_parts}</p>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded">
          <p class="text-sm text-gray-600">Tổng Số Lượng</p>
          <p class="text-2xl font-bold text-indigo-600">${response.total_quantity}</p>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded">
          <p class="text-sm text-gray-600">Giá Trị Kho</p>
          <p class="text-2xl font-bold text-green-600">${formatCurrency(response.total_inventory_value)}</p>
        </div>
        <div class="text-center p-4 bg-gray-50 rounded">
          <p class="text-sm text-gray-600">Sắp Hết Hàng</p>
          <p class="text-2xl font-bold text-red-600">${response.low_stock_count}</p>
        </div>
      </div>
    `;
    document.getElementById('inventory-overview-container').innerHTML = overviewHtml;

    // Low stock items
    if (response.low_stock_parts.length > 0) {
      let lowStockHtml = '<div class="space-y-2">';
      response.low_stock_parts.forEach(part => {
        lowStockHtml += `
          <div class="flex justify-between items-center p-3 border border-red-200 bg-red-50 rounded">
            <div>
              <p class="font-semibold">${part.name}</p>
              <p class="text-sm text-gray-600">SKU: ${part.sku}</p>
            </div>
            <div class="text-right">
              <p class="text-lg font-bold text-red-600">Còn: ${part.quantity}</p>
              <p class="text-sm text-gray-600">${formatCurrency(part.price)}/cái</p>
            </div>
          </div>
        `;
      });
      lowStockHtml += '</div>';
      document.getElementById('low-stock-container').innerHTML = lowStockHtml;
    } else {
      document.getElementById('low-stock-container').innerHTML = '<p class="text-green-600">✅ Tất cả phụ tùng đều đủ hàng</p>';
    }

  } catch (error) {
    console.error("Error loading inventory report:", error);
    showToast("Lỗi khi tải báo cáo kho", true);
  }
}

// Hook vào navigateToDashboardSection để load data khi vào reports
const originalNavigate = window.navigateToDashboardSection;
window.navigateToDashboardSection = function(sectionId, title) {
  originalNavigate(sectionId, title);

  if (sectionId === 'reports-section') {
    loadDashboardData();
    switchReportTab('revenue');
  }
};
