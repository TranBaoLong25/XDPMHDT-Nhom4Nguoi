// Chat Configuration
const API_BASE = "http://localhost";
const SOCKET_URL = "http://localhost";
const TOKEN_KEY = "jwt_token";

// Global Variables
let socket = null;
let currentRoomId = null;
let currentUser = null;
let typingTimeout = null;

// =============================================================================
// UTILITY FUNCTIONS
// =============================================================================

function showLoading() {
    document.getElementById("loading-spinner")?.classList.remove("hidden");
}

function hideLoading() {
    document.getElementById("loading-spinner")?.classList.add("hidden");
}

function showToast(message, isError = false) {
    const toast = document.createElement("div");
    toast.textContent = message;
    toast.className = `fixed bottom-5 right-5 px-6 py-4 rounded-lg text-white font-medium shadow-2xl z-50 transition-all ${
        isError ? "bg-red-600" : "bg-green-600"
    }`;
    document.body.appendChild(toast);
    setTimeout(() => {
        toast.classList.add("opacity-0");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function formatTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleTimeString("vi-VN", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

function goBack() {
    if (socket) {
        socket.disconnect();
    }
    window.location.href = "/";
}

// =============================================================================
// AUTHENTICATION
// =============================================================================

async function getCurrentUser() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (!token) {
        showToast("Vui lòng đăng nhập để sử dụng chat", true);
        setTimeout(() => window.location.href = "/", 2000);
        return null;
    }

    try {
        // Decode JWT để lấy user info
        const payload = JSON.parse(atob(token.split(".")[1]));
        return {
            user_id: parseInt(payload.sub),
            username: payload.username || "User",
            role: payload.role || "user"
        };
    } catch (e) {
        showToast("Token không hợp lệ", true);
        setTimeout(() => window.location.href = "/", 2000);
        return null;
    }
}

// =============================================================================
// API CALLS
// =============================================================================

async function apiRequest(endpoint, method = "GET", body = null) {
    const token = localStorage.getItem(TOKEN_KEY);
    const options = {
        method,
        headers: {
            "Content-Type": "application/json",
            "Authorization": token ? `Bearer ${token}` : ""
        }
    };

    if (body) {
        options.body = JSON.stringify(body);
    }

    try {
        const response = await fetch(`${API_BASE}${endpoint}`, options);
        const data = await response.json();

        if (!response.ok) {
            throw new Error(data.error || data.message || "API Error");
        }

        return data;
    } catch (error) {
        console.error("API Error:", error);
        throw error;
    }
}

async function createChatRoom() {
    const data = {
        user_id: currentUser.user_id,
        user_name: currentUser.username,
        subject: "Yêu cầu hỗ trợ"
    };

    const room = await apiRequest("/api/chat/rooms", "POST", data);
    return room;
}

async function getUserRooms() {
    return await apiRequest(`/api/chat/rooms/user/${currentUser.user_id}`);
}

async function getRoomMessages(roomId) {
    return await apiRequest(`/api/chat/rooms/${roomId}/messages`);
}

async function markAsRead(roomId) {
    return await apiRequest(`/api/chat/rooms/${roomId}/read`, "PUT", {
        user_id: currentUser.user_id
    });
}

// =============================================================================
// SOCKET.IO CONNECTION
// =============================================================================

function initSocket() {
    socket = io(SOCKET_URL, {
        transports: ["websocket", "polling"],
        reconnection: true,
        reconnectionDelay: 1000,
        reconnectionAttempts: 5
    });

    // Connection events
    socket.on("connect", () => {
        console.log("✅ Socket connected:", socket.id);
        updateConnectionStatus("Đã kết nối", true);

        // Authenticate
        socket.emit("authenticate", {
            user_id: currentUser.user_id,
            user_name: currentUser.username,
            role: currentUser.role
        });
    });

    socket.on("disconnect", () => {
        console.log("❌ Socket disconnected");
        updateConnectionStatus("Mất kết nối", false);
    });

    socket.on("connect_error", (error) => {
        console.error("Connection error:", error);
        updateConnectionStatus("Lỗi kết nối", false);
    });

    socket.on("authenticated", (data) => {
        console.log("🔐 Authenticated:", data);
        if (currentRoomId) {
            joinRoom(currentRoomId);
        }
    });

    // Message events
    socket.on("new_message", (message) => {
        console.log("📩 New message:", message);
        appendMessage(message);

        // Mark as read if room is active
        if (currentRoomId === message.room_id) {
            markAsRead(currentRoomId);
        }
    });

    socket.on("user_typing", (data) => {
        showTypingIndicator(data.user_name);
    });

    socket.on("support_assigned", (room) => {
        console.log("👨‍💼 Support assigned:", room);
        updateSupportInfo(room);
        showToast(`${room.support_user_name} đã tham gia hỗ trợ bạn!`);
    });

    socket.on("room_closed", (room) => {
        console.log("🔒 Room closed:", room);
        showToast("Phòng chat đã đóng", true);
    });

    socket.on("error", (error) => {
        console.error("Socket error:", error);
        showToast(error.message || "Có lỗi xảy ra", true);
    });
}

function joinRoom(roomId) {
    if (!socket || !socket.connected) {
        console.error("Socket not connected");
        return;
    }

    currentRoomId = roomId;
    socket.emit("join_room", { room_id: roomId });
    console.log(`🚪 Joining room ${roomId}`);
}

function sendMessage(message) {
    if (!socket || !socket.connected) {
        showToast("Chưa kết nối đến server", true);
        return;
    }

    socket.emit("send_message", {
        room_id: currentRoomId,
        message: message,
        message_type: "text"
    });
}

function sendTyping(isTyping) {
    if (!socket || !socket.connected) return;

    socket.emit("typing", {
        room_id: currentRoomId,
        is_typing: isTyping
    });
}

// =============================================================================
// UI UPDATES
// =============================================================================

function updateConnectionStatus(text, isConnected) {
    const statusEl = document.getElementById("connection-status");
    if (statusEl) {
        statusEl.textContent = text;
        statusEl.className = isConnected
            ? "text-sm text-green-600 font-medium"
            : "text-sm text-red-600 font-medium";
    }
}

function updateSupportInfo(room) {
    const supportInfo = document.getElementById("support-info");
    const supportName = document.getElementById("support-name");
    const supportRole = document.getElementById("support-role");

    if (room.support_user_name) {
        supportInfo.classList.remove("hidden");
        supportName.textContent = room.support_user_name;
        supportRole.textContent = room.support_role === "admin" ? "Quản trị viên" : "Kỹ thuật viên";
    }
}

function appendMessage(message) {
    const container = document.getElementById("messages-container");
    const isOwn = message.sender_id === currentUser.user_id;
    const isSystem = message.message_type === "system";

    let messageHTML;

    if (isSystem) {
        messageHTML = `
            <div class="chat-message flex justify-center">
                <div class="bg-gray-200 text-gray-700 text-sm px-4 py-2 rounded-full">
                    ${escapeHtml(message.message)}
                </div>
            </div>
        `;
    } else {
        messageHTML = `
            <div class="chat-message flex ${isOwn ? "justify-end" : "justify-start"}">
                <div class="max-w-xs lg:max-w-md">
                    ${
                        !isOwn
                            ? `<p class="text-xs text-gray-500 mb-1 ml-2">${escapeHtml(
                                  message.sender_name
                              )}</p>`
                            : ""
                    }
                    <div class="${
                        isOwn
                            ? "bg-indigo-600 text-white"
                            : "bg-gray-200 text-gray-900"
                    } rounded-2xl px-4 py-2 shadow-sm">
                        <p class="break-words">${escapeHtml(message.message)}</p>
                    </div>
                    <p class="text-xs text-gray-400 mt-1 ${isOwn ? "text-right" : "text-left"} mx-2">
                        ${formatTime(message.created_at)}
                    </p>
                </div>
            </div>
        `;
    }

    container.insertAdjacentHTML("beforeend", messageHTML);
    container.scrollTop = container.scrollHeight;
}

function showTypingIndicator(userName) {
    const indicator = document.getElementById("typing-indicator");
    const userEl = document.getElementById("typing-user");

    if (userName !== currentUser.username) {
        userEl.textContent = `${userName} đang gõ...`;
        indicator.classList.remove("hidden");

        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = setTimeout(() => {
            indicator.classList.add("hidden");
        }, 3000);
    }
}

function escapeHtml(text) {
    const div = document.createElement("div");
    div.textContent = text;
    return div.innerHTML;
}

async function loadChatHistory() {
    showLoading();
    try {
        const messages = await getRoomMessages(currentRoomId);
        const container = document.getElementById("messages-container");
        container.innerHTML = "";

        messages.forEach(msg => appendMessage(msg));

        // Mark as read
        await markAsRead(currentRoomId);
    } catch (error) {
        showToast("Không thể tải lịch sử chat", true);
    } finally {
        hideLoading();
    }
}

// =============================================================================
// EVENT HANDLERS
// =============================================================================

document.getElementById("message-form")?.addEventListener("submit", async (e) => {
    e.preventDefault();

    const input = document.getElementById("message-input");
    const message = input.value.trim();

    if (!message) return;

    sendMessage(message);
    input.value = "";
    sendTyping(false);
});

document.getElementById("message-input")?.addEventListener("input", (e) => {
    const isTyping = e.target.value.length > 0;
    sendTyping(isTyping);
});

// =============================================================================
// INITIALIZATION
// =============================================================================

async function init() {
    showLoading();

    try {
        // Get current user
        currentUser = await getCurrentUser();
        if (!currentUser) return;

        // Check for existing rooms
        const rooms = await getUserRooms();

        // Find active or waiting room
        let room = rooms.find(r => r.status === "active" || r.status === "waiting");

        // Create new room if no active room exists
        if (!room) {
            room = await createChatRoom();
            showToast("Đã tạo phòng chat mới!");
        }

        currentRoomId = room.id;
        updateSupportInfo(room);

        // Initialize Socket.IO
        initSocket();

        // Load chat history
        await loadChatHistory();

    } catch (error) {
        console.error("Initialization error:", error);
        showToast("Không thể khởi tạo chat: " + error.message, true);
    } finally {
        hideLoading();
    }
}

// Start when page loads
document.addEventListener("DOMContentLoaded", init);
