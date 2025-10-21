# Sử dụng base image Nginx
FROM nginx:1.25-alpine

# Xóa file config mặc định của Nginx
RUN rm /etc/nginx/conf.d/default.conf

# Sao chép file cấu hình tùy chỉnh vào trong container
COPY nginx.conf /etc/nginx/conf.d/

# Mở cổng 80
EXPOSE 80

# Lệnh chạy Nginx
CMD ["nginx", "-g", "daemon off;"]
