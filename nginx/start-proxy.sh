#!/bin/bash


docker run -d \
  --name ngrok-proxy \
  -p 127.0.0.1:8080:8080 \
  -v ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro \
  --restart unless-stopped \
  --network polpa-network \
  nginx:stable
