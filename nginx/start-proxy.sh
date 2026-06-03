#!/bin/bash

# Stop and remove existing proxy if it exists
docker stop nginx-proxy 2>/dev/null
#docker rm nginx-proxy 2>/dev/null

docker run -d --rm \
  --name nginx-proxy \
  -p 127.0.0.1:8080:8080 \
  -v "$(pwd)/nginx/nginx.conf:/etc/nginx/nginx.conf:ro" \
  --network polpa-network \
  nginx:stable

