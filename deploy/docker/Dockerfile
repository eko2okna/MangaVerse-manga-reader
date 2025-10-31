# Minimal Nginx image to serve the exported PWA on port 40141
FROM nginx:1.27-alpine

# Custom nginx config with SPA routing and PWA headers
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Static files will be mounted at runtime into this path
VOLUME ["/usr/share/nginx/html"]

EXPOSE 40141
CMD ["nginx", "-g", "daemon off;"]
