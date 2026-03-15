#!/bin/bash

docker compose exec backend node dist/seed.js

# for prod
# kubectl exec -n production -it polpa-gestao-backend-6d7d9f8c7b-abc12 -- node dist/seed.js