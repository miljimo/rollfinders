#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "${ROOT_DIR}"

echo "==> Installing dependencies"
npm ci

echo "==> Generating Prisma client"
npm run db:generate

echo "==> Linting"
npm run lint

echo "==> Type checking"
npm run typecheck

echo "==> Running tests"
npm run test

echo "==> Building Next.js app"
npm run build

echo "Local application build completed."
