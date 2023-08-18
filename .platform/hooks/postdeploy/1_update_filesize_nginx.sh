#!/usr/bin/env bash

# Update client_max_body_size in nginx.conf
sudo sed -i 's/client_header_timeout/client_max_body_size 200M;\n    client_header_timeout/g'  /etc/nginx/nginx.conf

# Remove TLS 1.1 support from nginx.conf
sudo sed -i 's/ TLSv1.1//' /etc/nginx/nginx.conf

# Reload Nginx
sudo nginx -s reload

echo nginx config update complete