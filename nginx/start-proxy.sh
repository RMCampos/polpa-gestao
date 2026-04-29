#!/bin/bash

# Stop and remove existing proxy if it exists
docker stop ngrok-proxy 2>/dev/null
docker rm ngrok-proxy 2>/dev/null

docker run -d \
  --name ngrok-proxy \
  -p 127.0.0.1:8080:8080 \
  -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
  --restart unless-stopped \
  --network polpa-network \
  nginx:stable
