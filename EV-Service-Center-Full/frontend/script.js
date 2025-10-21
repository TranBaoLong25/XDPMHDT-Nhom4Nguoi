const API_BASE = "http://localhost/api";
let loggedInUser = null;

/* ==============================
   🧩 Chuyển form hiển thị
============================== */
function showRegister() {
  document.getElementById("login-card").style.display = "none";
  document.getElementById("register-card").style.display = "block";
}
function showLogin() {
  document.getElementById("login-card").style.display = "block";
  document.getElementById("register-card").style.display = "none";
}
function showProfile() {
  document.getElementById("login-card").style.display = "none";
  document.getElementById("register-card").style.display = "none";
  document.getElementById("admin-card").style.display = "none";
  document.getElementById("profile-card").style.display = "block";
}
function showAdmin() {
  document.getElementById("login-card").style.display = "none";
  document.getElementById("register-card").style.display = "none";
  document.getElementById("profile-card").style.display = "none";
  document.getElementById("admin-card").style.display = "block";
}

/* ==============================
   🚪 Đăng xuất (reset giao diện)
============================== */
function logout() {
  loggedInUser = null;
  localStorage.removeItem("currentUser");

  // Ẩn hết các card
  document.getElementById("login-card").style.display = "block";
  document.getElementById("register-card").style.display = "none";
  document.getElementById("profile-card").style.display = "none";
  document.getElementById("admin-card").style.display = "none";

  // Xóa nội dung hiển thị cũ
  ["login-result", "reg-result", "profile-result", "admin-result"].forEach(
    (id) => {
      document.getElementById(id).innerHTML = "";
    }
  );
}

/* ==============================
   📦 Đăng ký tài khoản
============================== */
async function registerUser() {
  const username = document.getElementById("reg-username").value;
  const password = document.getElementById("reg-password").value;
  const full_name = document.getElementById("reg-name").value;

  try {
    const res = await fetch(`${API_BASE}/users/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password, full_name }),
    });

    const data = await res.json();
    const result = document.getElementById("reg-result");

    if (res.ok) {
      result.innerText = data.message || "✅ Đăng ký thành công!";
      setTimeout(showLogin, 1500);
    } else {
      result.innerText = data.detail || JSON.stringify(data, null, 2);
    }
  } catch (err) {
    document.getElementById("reg-result").innerText = "❌ Lỗi kết nối API!";
    console.error(err);
  }
}

/* ==============================
   🔑 Đăng nhập
============================== */
async function loginUser() {
  const username = document.getElementById("login-username").value;
  const password = document.getElementById("login-password").value;

  try {
    const res = await fetch(`${API_BASE}/users/`);
    const users = await res.json();
    const user = users.find(
      (u) => u.username === username && u.password === password
    );

    if (user) {
      loggedInUser = user;
      localStorage.setItem("currentUser", JSON.stringify(user));
      if (user.role === "admin") showAdmin();
      else showProfile();
    } else {
      document.getElementById("login-result").innerText =
        "Sai tên đăng nhập hoặc mật khẩu!";
    }
  } catch (err) {
    document.getElementById("login-result").innerText = "Lỗi kết nối API!";
    console.error(err);
  }
}

/* ==============================
   👤 Quản lý Profile
============================== */
async function createProfile() {
  const user_id = loggedInUser.id;
  const phone = document.getElementById("profile-phone").value;
  const address = document.getElementById("profile-address").value;

  try {
    const res = await fetch(`${API_BASE}/profiles/`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id, phone, address }),
    });
    const data = await res.json();

    if (res.ok) renderProfile(data);
    else
      document.getElementById("profile-result").innerText =
        data.detail || "Không thể tạo profile!";
  } catch (err) {
    document.getElementById("profile-result").innerText = "Lỗi kết nối API!";
    console.error(err);
  }
}

async function viewProfile() {
  const user_id = loggedInUser.id;
  try {
    const res = await fetch(`${API_BASE}/profiles/${user_id}`);
    const data = await res.json();

    if (res.ok && data) renderProfile(data);
    else
      document.getElementById("profile-result").innerText =
        "Chưa có profile, vui lòng tạo!";
  } catch (err) {
    document.getElementById("profile-result").innerText = "Lỗi kết nối API!";
    console.error(err);
  }
}

function renderProfile(profile) {
  document.getElementById("profile-result").innerHTML = `
    <div class="profile-card">
      <img src="https://ui-avatars.com/api/?name=${
        loggedInUser.full_name || loggedInUser.username
      }" class="avatar" />
      <p><strong>👤 Họ tên:</strong> ${loggedInUser.full_name || "Chưa có"}</p>
      <p><strong>📞 SĐT:</strong> ${profile.phone || "Chưa có"}</p>
      <p><strong>🏠 Địa chỉ:</strong> ${profile.address || "Chưa có"}</p>
      <p><strong>🚗 Xe:</strong> ${profile.vehicle_model || "Không có"}</p>
      <p><strong>🔢 VIN:</strong> ${profile.vin_number || "Không có"}</p>
    </div>
  `;
}

/* ==============================
   🧾 Admin xem tất cả user
============================== */
async function viewAllUsers() {
  try {
    const res = await fetch(`${API_BASE}/users/`);
    const data = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      document.getElementById("admin-result").innerHTML =
        "<p>Không có người dùng nào.</p>";
      return;
    }

    let tableHTML = `
      <div class="user-list-header">
        <h3>Danh sách người dùng</h3>
        <button class="close-btn" onclick="hideUserList()">&times;</button>
      </div>
      <table class="user-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Tên đăng nhập</th>
            <th>Mật khẩu</th>
            <th>Vai trò</th>
          </tr>
        </thead>
        <tbody>
    `;

    data.forEach((user) => {
      tableHTML += `
        <tr>
          <td>${user.id}</td>
          <td>${user.username}</td>
          <td>${user.password}</td>
          <td>${user.role}</td>
        </tr>
      `;
    });

    tableHTML += `
        </tbody>
      </table>
    `;

    document.getElementById("admin-result").innerHTML = tableHTML;
  } catch (err) {
    document.getElementById("admin-result").innerText = "Lỗi kết nối API!";
    console.error(err);
  }
}

/* ==============================
   ❌ Đóng danh sách người dùng
============================== */
function hideUserList() {
  document.getElementById("admin-result").innerHTML = "";
}
