// ==================== CONSTANTS ====================
const TECH_TOKEN_KEY = "tech_access_token";
const API_BASE_URL = window.location.origin;

// ==================== UTILITY FUNCTIONS ====================
function showToast(message, isError = false) {
  const toast = document.getElementById("toast");
  const toastMessage = document.getElementById("toast-message");
  toastMessage.textContent = message;

  toast.classList.remove("hidden", "bg-green-500", "bg-red-500");
  toast.classList.add(isError ? "bg-red-500" : "bg-green-500");

  setTimeout(() => {
    toast.classList.add("hidden");
  }, 3000);
}

async function apiRequest(endpoint, method = "GET", body = null) {
  const token = localStorage.getItem(TECH_TOKEN_KEY);
  if (!token) {
    window.location.href = "/index.html";
    return;
  }

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  const options = { method, headers };
  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, options);

    if (response.status === 401) {
      localStorage.removeItem(TECH_TOKEN_KEY);
      window.location.href = "/index.html";
      return;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || data.message || "API Error");
    }

    return data;
  } catch (error) {
    console.error("🚨 API Request Error:", error);
    throw error;
  }
}

// ==================== NAVIGATION ====================
function navigateToDashboardSection(sectionId, title) {
  // Hide all sections
  document.querySelectorAll(".dashboard-section").forEach((section) => {
    section.classList.add("hidden");
  });

  // Show selected section
  const targetSection = document.getElementById(sectionId);
  if (targetSection) {
    targetSection.classList.remove("hidden");
    document.getElementById("dashboard-title").textContent = title;
  }

  // Load data for the section
  if (sectionId === "work-list-section") {
    loadWorkList();
  } else if (sectionId === "inventory-section") {
    loadInventoryList();
  }
}

// ==================== AUTH FUNCTIONS ====================
function checkAuth() {
  const token = localStorage.getItem(TECH_TOKEN_KEY);
  if (!token) {
    window.location.href = "/index.html";
    return false;
  }

  // Decode JWT to get user info
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    const userInfo = document.getElementById("user-info");
    if (userInfo) {
      userInfo.textContent = `Xin chào, KTV`;
    }

    // Check if role is technician
    if (payload.role !== "technician") {
      showToast("Bạn không có quyền truy cập trang này", true);
      setTimeout(() => {
        window.location.href = "/index.html";
      }, 2000);
      return false;
    }

    return true;
  } catch (error) {
    console.error("Invalid token:", error);
    localStorage.removeItem(TECH_TOKEN_KEY);
    window.location.href = "/index.html";
    return false;
  }
}

function handleLogout() {
  localStorage.removeItem(TECH_TOKEN_KEY);
  showToast("Đăng xuất thành công!");
  setTimeout(() => {
    window.location.href = "/index.html";
  }, 1000);
}

// ==================== WORK LIST FUNCTIONS ====================
async function loadWorkList() {
  try {
    const tasks = await apiRequest("/api/maintenance/my-tasks", "GET");
    const tbody = document.getElementById("work-list-tbody");

    if (!tasks || tasks.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500">
            Không có công việc nào được phân công
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = tasks
      .map((task) => {
        const statusBadge = formatTaskStatus(task.status);
        const date = new Date(task.created_at).toLocaleDateString("vi-VN");

        return `
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm">#${task.task_id}</td>
            <td class="px-6 py-4 text-sm">Booking #${task.booking_id}</td>
            <td class="px-6 py-4 text-sm">${task.description || 'N/A'}</td>
            <td class="px-6 py-4 text-sm">${date}</td>
            <td class="px-6 py-4 text-sm">
              <span class="px-2 py-1 text-xs rounded-full ${statusBadge.class}">
                ${statusBadge.text}
              </span>
            </td>
            <td class="px-6 py-4 text-sm">
              ${
                task.status === "pending"
                  ? `<button
                      onclick="updateTaskStatus(${task.task_id}, 'in_progress')"
                      class="bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded text-xs mr-2"
                    >
                      Bắt Đầu
                    </button>
                    <button
                      onclick="updateTaskStatus(${task.task_id}, 'completed')"
                      class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                    >
                      Hoàn Thành
                    </button>`
                  : task.status === "in_progress"
                  ? `<button
                      onclick="updateTaskStatus(${task.task_id}, 'completed')"
                      class="bg-green-500 hover:bg-green-600 text-white px-3 py-1 rounded text-xs"
                    >
                      Hoàn Thành
                    </button>`
                  : '<span class="text-gray-400">-</span>'
              }
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading work list:", error);
    showToast("Không thể tải danh sách công việc", true);
  }
}

function formatTaskStatus(status) {
  switch (status) {
    case "pending":
      return { text: "Chờ xử lý", class: "bg-yellow-100 text-yellow-800" };
    case "in_progress":
      return { text: "Đang làm", class: "bg-blue-100 text-blue-800" };
    case "completed":
      return { text: "Hoàn thành", class: "bg-green-100 text-green-800" };
    case "canceled":
      return { text: "Đã hủy", class: "bg-red-100 text-red-800" };
    default:
      return { text: status, class: "bg-gray-100 text-gray-800" };
  }
}

async function updateTaskStatus(taskId, newStatus) {
  const statusText = newStatus === "in_progress" ? "Đang làm" :
                     newStatus === "completed" ? "Hoàn thành" : newStatus;

  if (!confirm(`Bạn có chắc muốn cập nhật trạng thái thành "${statusText}"?`)) {
    return;
  }

  try {
    await apiRequest(`/api/maintenance/tasks/${taskId}/status`, "PUT", {
      status: newStatus,
    });
    showToast("Cập nhật trạng thái thành công!");
    loadWorkList();
  } catch (error) {
    console.error("Error updating task status:", error);
    showToast("Không thể cập nhật trạng thái", true);
  }
}

// ==================== INVENTORY FUNCTIONS ====================
async function loadInventoryList() {
  try {
    const items = await apiRequest("/api/inventory/items", "GET");
    const tbody = document.getElementById("inventory-tbody");

    if (!items || items.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="6" class="px-6 py-4 text-center text-gray-500">
            Không có vật tư nào
          </td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = items
      .map((item) => {
        const isLowStock = item.quantity < item.min_quantity;
        const stockStatusClass = isLowStock
          ? "bg-red-100 text-red-800"
          : "bg-green-100 text-green-800";
        const stockStatusText = isLowStock ? "Sắp hết" : "Đủ hàng";

        return `
          <tr class="hover:bg-gray-50">
            <td class="px-6 py-4 text-sm font-medium">${item.part_number}</td>
            <td class="px-6 py-4 text-sm">${item.name}</td>
            <td class="px-6 py-4 text-sm ${isLowStock ? "text-red-600 font-bold" : ""}">${item.quantity}</td>
            <td class="px-6 py-4 text-sm">${item.min_quantity}</td>
            <td class="px-6 py-4 text-sm">${item.price?.toLocaleString("vi-VN")} ₫</td>
            <td class="px-6 py-4 text-sm">
              <span class="px-2 py-1 text-xs rounded-full ${stockStatusClass}">
                ${stockStatusText}
              </span>
            </td>
          </tr>
        `;
      })
      .join("");
  } catch (error) {
    console.error("Error loading inventory:", error);
    showToast("Không thể tải danh sách vật tư", true);
  }
}

// ==================== INITIALIZATION ====================
document.addEventListener("DOMContentLoaded", () => {
  if (!checkAuth()) {
    return;
  }

  // Load default section
  navigateToDashboardSection("work-list-section", "Danh Sách Công Việc");
});
