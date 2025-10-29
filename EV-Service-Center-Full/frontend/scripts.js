// File: frontend/scripts.js (PHIÊN BẢN ĐÃ SỬA VÀ TỐI ƯU)
// ✅ ĐÃ SỬA LỖI GỌI HÀM loadProfileDetails KHÔNG ĐÚNG ARGUMENT

// --- GLOBAL CONSTANTS ---
const navAuthLinks = document.getElementById("nav-auth-links");
let currentPageElement = document.getElementById("login-page");
let currentUserId = null; // Biến này đã được khai báo
// --- ROUTING ---
function navigateTo(pageId) {
  const nextPageElement = document.getElementById(`${pageId}-page`);

  document.querySelectorAll(".page").forEach((page) => {
    page.classList.add("hidden");
    page.classList.remove("active");
  });

  if (nextPageElement) {
    nextPageElement.classList.remove("hidden");
    nextPageElement.classList.add("active");
  }

  currentPageElement = nextPageElement; // ✅ Sửa lỗi: Truyền currentUserId vào hàm loadProfileDetails

  if (pageId === "profile") loadProfileDetails(currentUserId);
  if (pageId === "forget-password") {
    resetForgetForm();
  }
}

function resetForgetForm() {
  const forgetForm = document.getElementById("forget-password-form");
  const resetForm = document.getElementById("reset-password-form");
  const forgetEmail = document.getElementById("forget-email");
  const otpCode = document.getElementById("otp-code");
  const newPassword = document.getElementById("new-password");

  if (forgetForm) forgetForm.classList.remove("hidden");
  if (resetForm) resetForm.classList.add("hidden");
  if (forgetEmail) forgetEmail.value = "";
  if (otpCode) otpCode.value = "";
  if (newPassword) newPassword.value = "";
}

// --- AUTH NAVIGATION ---
function updateNav() {
  const token = localStorage.getItem(window.TOKEN_KEY);
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
  localStorage.removeItem(window.TOKEN_KEY);
  window.showToast("Bạn đã đăng xuất thành công.");
  updateNav();
  navigateTo("login");
}

// --- PROFILE HANDLERS ---
function toggleProfileForm(forceShow) {
  const form = document.getElementById("profile-update-form");
  const buttonContainer = document.getElementById(
    "update-profile-button-container"
  );

  if (!form || !buttonContainer) return;

  const shouldShow =
    forceShow === undefined ? form.classList.contains("hidden") : forceShow;

  if (shouldShow) {
    form.classList.remove("hidden");
    buttonContainer.classList.add("hidden");
  } else {
    form.classList.add("hidden");
    buttonContainer.classList.remove("hidden");
  }
}
// Hàm loadProfileDetails chuẩn, tránh 422 và 404
async function loadProfileDetails(userId) {
  if (!userId) {
    console.error("userId is required to load profile details");
    return;
  }

  try {
    const profile = await window.apiRequest("/user/api/profile-details", {
      method: "POST", // dùng POST nếu backend yêu cầu
      body: { subject: userId.toString() }, // gửi đúng kiểu string
    });

    const detailsDiv = document.getElementById("profile-details");
    if (!detailsDiv) return;

    detailsDiv.innerHTML = `
      <p><strong>Họ và tên:</strong> ${profile.full_name || "Chưa cập nhật"}</p>
      <p><strong>Điện thoại:</strong> ${
      profile.phone_number || "Chưa cập nhật"
    }</p>
      <p><strong>Địa chỉ:</strong> ${profile.address || "Chưa cập nhật"}</p>
      <p><strong>Model Xe:</strong> ${
      profile.vehicle_model || "Chưa cập nhật"
    }</p>
      <p><strong>Số VIN:</strong> ${profile.vin_number || "Chưa cập nhật"}</p>
    `; // Cập nhật input fields

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
  } catch (error) {
    console.error("Failed to load profile details:", error);

    if (error?.status === 401) {
      logout();
      return;
    }

    const detailsDiv = document.getElementById("profile-details");
    if (detailsDiv) {
      detailsDiv.innerHTML =
        "<p>Chưa có thông tin hồ sơ. Vui lòng cập nhật.</p>";
    }

    toggleProfileForm(true);
  }
}

// --- FORM HANDLERS ---

// Login
const loginForm = document.getElementById("login-form");
if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("login-email-username");
    const passwordInput = document.getElementById("login-password");

    if (!emailInput || !passwordInput) {
      window.showToast("Không tìm thấy form đăng nhập", true);
      return;
    }

    const email_username = emailInput.value;
    const password = passwordInput.value;

    try {
      const data = await window.apiRequestCore(
        null,
        "/user/api/login",
        "POST",
        {
          email_username,
          password,
        }
      );

      if (data?.access_token) {
        localStorage.setItem(window.TOKEN_KEY, data.access_token);
        window.showToast("Đăng nhập thành công!");
        e.target.reset();
        updateNav();
        // ✅ Thêm logic lưu currentUserId và load profile sau khi đăng nhập
        const token = data.access_token;
        if (token) {
          try {
            const payload = JSON.parse(atob(token.split(".")[1]));
            currentUserId = payload.sub; // Lưu ID
          } catch {}
        }

        navigateTo("home");
      }
    } catch (error) {
      console.error("Login failed:", error);
    }
  });
}

// Send OTP
const forgetPasswordForm = document.getElementById("forget-password-form");
if (forgetPasswordForm) {
  forgetPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("forget-email");
    if (!emailInput) return;

    const email = emailInput.value;

    try {
      const data = await window.apiRequestCore(
        null,
        "/user/api/send-otp",
        "POST",
        { email }
      );
      window.showToast(data.message || "OTP đã được gửi đến email của bạn.");

      const forgetForm = document.getElementById("forget-password-form");
      const resetForm = document.getElementById("reset-password-form");
      const resetEmailHidden = document.getElementById("reset-email-hidden");

      if (forgetForm) forgetForm.classList.add("hidden");
      if (resetForm) resetForm.classList.remove("hidden");
      if (resetEmailHidden) resetEmailHidden.value = email;
    } catch (error) {
      console.error("Send OTP failed:", error);
    }
  });
}
// --- REGISTER HANDLER ---

const registerForm = document.getElementById("register-form");
if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    // 1. Lấy giá trị và kiểm tra null (phòng lỗi)
    const usernameInput = document.getElementById("register-username");
    const emailInput = document.getElementById("register-email");
    const passwordInput = document.getElementById("register-password");

    if (!usernameInput || !emailInput || !passwordInput) {
      window.showToast("Lỗi: Không tìm thấy trường nhập liệu Đăng ký.", true);
      return;
    }

    const username = usernameInput.value;
    const email = emailInput.value;
    const password = passwordInput.value;

    try {
      // Giả định apiRequest là hàm của bạn có sẵn trong utils.js
      const data = await window.apiRequest("/user/api/register", "POST", {
        username,
        email,
        password,
      });

      if (data) {
        window.showToast(
          data.message || "Đăng ký thành công! Vui lòng đăng nhập."
        );
        e.target.reset(); // Xóa dữ liệu đã nhập
        navigateTo("login");
      }
    } catch (error) {
      // 2. Xử lý lỗi: Hiển thị lỗi API cho người dùng
      console.error("Registration failed:", error);
      const errorMessage =
        error?.message || "Đăng ký thất bại. Vui lòng thử lại.";
      window.showToast(errorMessage, true); // true để hiển thị là thông báo lỗi
    }
  });
}
// Reset Password
const resetPasswordForm = document.getElementById("reset-password-form");
if (resetPasswordForm) {
  resetPasswordForm.addEventListener("submit", async (e) => {
    e.preventDefault();

    const emailInput = document.getElementById("reset-email-hidden");
    const otpInput = document.getElementById("otp-code");
    const passwordInput = document.getElementById("new-password");

    if (!emailInput || !otpInput || !passwordInput) return;

    const email = emailInput.value;
    const otp = otpInput.value;
    const new_password = passwordInput.value;

    try {
      const data = await window.apiRequestCore(
        null,
        "/user/api/reset-password",
        "POST",
        {
          email,
          otp,
          new_password,
        }
      );
      window.showToast(data.message || "Mật khẩu đã được đặt lại thành công!");
      e.target.reset();
      navigateTo("login");
    } catch (error) {
      console.error("Reset password failed:", error);
    }
  });
}

// Update Profile
const profileUpdateForm = document.getElementById("profile-update-form");
if (profileUpdateForm) {
  profileUpdateForm.addEventListener("submit", async (e) => {
    e.preventDefault(); // ✅ KIỂM TRA NULL trước khi đọc .value

    const phoneInput = document.getElementById("profile-phone");
    const addressInput = document.getElementById("profile-address");
    const vehicleInput = document.getElementById("profile-vehicle-model");
    const vinInput = document.getElementById("profile-vin-number");

    // ✅ Thêm trường Họ và tên
    const fullnameInput = document.getElementById("profile-fullname");

    if (
      !phoneInput ||
      !addressInput ||
      !vehicleInput ||
      !vinInput ||
      !fullnameInput
    ) {
      window.showToast("Không tìm thấy form cập nhật hồ sơ", true);
      return;
    }

    const body = {
      full_name: fullnameInput.value, // ✅ Thêm trường Họ và tên vào body
      phone: phoneInput.value,
      address: addressInput.value,
      vehicle_model: vehicleInput.value,
      vin_number: vinInput.value,
    };

    try {
      await window.apiRequest("/user/api/profile", "PUT", body);
      window.showToast("Cập nhật hồ sơ thành công!");

      loadProfileDetails(currentUserId); // ✅ Sửa lỗi: Truyền currentUserId
      toggleProfileForm(false);
    } catch (error) {
      console.error("Update profile failed:", error);
    }
  });
}

// --- INIT ---
document.addEventListener("DOMContentLoaded", () => {
  updateNav();
  const token = localStorage.getItem(window.TOKEN_KEY);

  if (token) {
    try {
      const payload = JSON.parse(atob(token.split(".")[1]));
      currentUserId = payload.sub; // ✅ Sửa lỗi: Lưu currentUserId khi tải trang
      const now = Math.floor(Date.now() / 1000);

      if (payload.exp && payload.exp < now) {
        logout();
      } else {
        if (["login-page", "register-page"].includes(currentPageElement?.id)) {
          navigateTo("home");
        } else if (!currentPageElement) {
          navigateTo("home");
        }
      }
    } catch {
      logout();
    }
  } else {
    if (
      !["login-page", "register-page", "forget-password-page"].includes(
        currentPageElement?.id
      )
    ) {
      navigateTo("login");
    }
  }
});
