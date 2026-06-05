#!/bin/bash
echo "🔧 Fixing Nginx Configuration..."

# Check if index.html exists
echo "📁 Checking files..."
ls -la /var/www/attendance/

# Create proper nginx config
sudo tee /etc/nginx/sites-available/attendance > /dev/null << 'EOF'
server {
    listen 80 default_server;
    listen [::]:80 default_server;
    server_name 10.10.220.53 localhost;

    root /var/www/attendance;
    index index.html;

    # Gzip
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location / {
        # Try to serve file directly, fallback to index.html
        try_files $uri $uri/ /index.html =404;
    }

    # Handle 404s gracefully
    error_page 404 /index.html;

    # Cache static assets
    location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg|woff|woff2)$ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Remove default site and enable attendance
sudo rm -f /etc/nginx/sites-enabled/default
sudo ln -sf /etc/nginx/sites-available/attendance /etc/nginx/sites-enabled/

# Fix permissions
sudo chown -R www-data:www-data /var/www/attendance
sudo chmod -R 755 /var/www/attendance

# Test config
sudo nginx -t

# Restart nginx
sudo systemctl restart nginx

echo "✅ Nginx fixed! Check http://10.10.220.53"
