# Sử dụng image Nginx chính thức
FROM nginx:alpine

# Xóa file cấu hình mặc định
RUN rm /etc/nginx/conf.d/default.conf

# ✅ SỬA LỖI: Đường dẫn COPY tính từ thư mục gốc (context: .)
COPY ./api-gateway/nginx.conf /etc/nginx/conf.d/

# ✅ SỬA LỖI: Đường dẫn COPY tính từ thư mục gốc (context: .)
# Đường dẫn này khớp với "root /usr/share/nginx/html/frontend" trong nginx.conf
COPY ./frontend /usr/share/nginx/html/frontend