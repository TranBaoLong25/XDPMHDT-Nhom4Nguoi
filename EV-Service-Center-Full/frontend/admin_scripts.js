// File: frontend/admin_scripts.js

const loginPage = document.getElementById("admin-login-page");
const dashboardPage = document.getElementById("dashboard");

// --- UTILITY FUNCTIONS ---
/**
 * Hàm gọi API cho Admin (sử dụng token 'admin_jwt_token').
 */
async function apiRequestAdmin(endpoint, method = "GET", body = null) {
  // Sử dụng hằng số ADMIN_TOKEN_KEY
  return window.apiRequestCore(window.ADMIN_TOKEN_KEY, endpoint, method, body);
}

// --- DASHBOARD NAVIGATION (Giữ nguyên) ---
function showSection(sectionId) {
  // ... (giữ nguyên logic showSection)
}

// --- AUTHENTICATION ---
document
  .getElementById("admin-login-form")
  .addEventListener("submit", async (e) => {
    e.preventDefault();
    const email_username = document.getElementById("admin-email").value;
    const password = document.getElementById("admin-password").value;

    try {
      // ✅ SỬA LỖI LOGIC: Không gửi token (null) khi đang đăng nhập.
      // Sử dụng endpoint /user/api/login (Giả sử Admin Backend đã tích hợp kiểm tra role)
      const data = await window.apiRequestCore(
        null, // Không dùng token
        "/user/api/login",
        "POST",
        {
          email_username,
          password,
        }
      );

      const token = data.access_token;

      // ✅ TỐI ƯU: KIỂM TRA ROLE TRONG TOKEN (Bắt buộc cho trang Admin)
      const payload = JSON.parse(atob(token.split(".")[1]));
      if (payload.role !== window.ADMIN_ROLE) {
        // Sử dụng hằng số ADMIN_ROLE
        adminLogout();
        window.showToast("Bạn không có quyền truy cập trang quản trị.", true);
        throw new Error("Unauthorized role.");
      }

      // Lưu token Admin
      localStorage.setItem(window.ADMIN_TOKEN_KEY, token);
      document.getElementById("admin-login-form").reset();
      window.showToast("Đăng nhập quản trị thành công!");
      showDashboard();
    } catch (error) {
      // Lỗi đã được xử lý trong apiRequestCore (utils.js)
    }
  });

function adminLogout() {
  localStorage.removeItem(window.ADMIN_TOKEN_KEY);
  window.showToast("Bạn đã đăng xuất.");
  loginPage.classList.remove("hidden");
  dashboardPage.classList.add("hidden");
}

function showDashboard() {
  loginPage.classList.add("hidden");
  dashboardPage.classList.remove("hidden");
  showSection("users-section");
  loadAllUsers();
}

// --- DATA LOADING & RENDERING (Quản lý User) ---
async function loadAllUsers() {
  try {
    const users = await apiRequestAdmin("/user/api/admin/users"); // Sử dụng apiRequestAdmin
    const tbody = document.getElementById("users-table-body");

    // ... (logic render giữ nguyên)
    if (!users || !Array.isArray(users) || users.length === 0) {
      // ...
      return;
    }

    tbody.innerHTML = users
      .map(
        (user) => `
					<tr>
						<td class="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">${
              user.user_id
            }</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${
              user.username
            }</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm text-gray-500">${user.email}</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm">
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                user.role === window.ADMIN_ROLE // Sử dụng hằng số ADMIN_ROLE
                  ? "bg-red-100 text-red-800"
                  : "bg-green-100 text-green-800"
              }">
								${user.role}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-sm">
							<span class="px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                user.status === "active"
                  ? "bg-blue-100 text-blue-800"
                  : "bg-gray-100 text-gray-800"
              }">
								${user.status}
							</span>
						</td>
						<td class="px-6 py-4 whitespace-nowrap text-center text-sm font-medium space-x-2">
							<button onclick="toggleUserLock(${
                user.user_id
              })" class="text-indigo-600 hover:text-indigo-900">
								${user.status === "active" ? "Lock" : "Unlock"}
							</button>
							<button onclick="deleteUser(${
                user.user_id
              })" class="text-red-600 hover:text-red-900">Delete</button>
						</td>
					</tr>
				`
      )
      .join("");
  } catch (error) {
    // ... (Xử lý lỗi)
    document.getElementById("users-table-body").innerHTML =
      '<tr><td colspan="6" class="px-6 py-4 text-center text-red-500">Lỗi khi tải dữ liệu người dùng.</td></tr>';
  }
}

// --- ACTION HANDLERS (Quản lý User) ---

async function toggleUserLock(userId) {
  if (
    confirm("Bạn có chắc chắn muốn thay đổi trạng thái của người dùng này?")
  ) {
    try {
      await apiRequestAdmin(
        `/user/api/admin/users/${userId}/toggle-lock`,
        "POST"
      );
      window.showToast("Cập nhật trạng thái thành công.");
      loadAllUsers();
    } catch (error) {}
  }
}

async function deleteUser(userId) {
  if (
    confirm("CẢNH BÁO: Bạn có chắc chắn muốn XÓA VĨNH VIỄN người dùng này?")
  ) {
    try {
      await apiRequestAdmin(`/user/api/admin/users/${userId}`, "DELETE");
      window.showToast("Xóa người dùng thành công.");
      loadAllUsers();
    } catch (error) {}
  }
}

// --- INITIALIZATION ---
document.addEventListener("DOMContentLoaded", () => {
  const token = localStorage.getItem(window.ADMIN_TOKEN_KEY); // Sử dụng hằng số

  loginPage.classList.remove("hidden");
  dashboardPage.classList.add("hidden");

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      const isTokenValid = payload.exp * 1000 > Date.now();

      if (payload.role === window.ADMIN_ROLE && isTokenValid) {
        // Sử dụng hằng số
        showDashboard();
      } else {
        adminLogout();
        if (!isTokenValid) {
          window.showToast(
            "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.",
            true
          );
        }
      }
    } catch (e) {
      console.error("Invalid token format:", e);
      adminLogout();
    }
  }
});
