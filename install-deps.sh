#!/bin/sh
# Install the dependencies of every widget that has some.
#
# Each widget keeps its own node_modules on purpose: importing a widget copies
# only its folder, so dependencies must live inside it. Nothing is hoisted.
set -e
cd "$(dirname "$0")"

for dir in passbolt-search static-server ftp-server; do
  echo "==> $dir"
  (cd "$dir" && npm install --omit=dev --no-audit --no-fund)
done

echo "done."
