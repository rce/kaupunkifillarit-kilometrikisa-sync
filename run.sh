#!/usr/bin/env bash
set -o errexit -o nounset -o pipefail

function main {
  source secrets.sh
  npx ts-node src/main.ts
}

main "$@"
