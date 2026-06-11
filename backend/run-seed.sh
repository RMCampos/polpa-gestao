#!/bin/bash

docker compose exec \
  -e SEED_ADMIN_EMAIL="$1" \
  -e SEED_ADMIN_PASSWORD="$2" \
  polpa_backend node dist/seed.js

# for prod
# kubectl exec -n production -it polpa-gestao-backend-6d7d9f8c7b-abc12 -- node dist/seed.js