#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

CODE_BIN="${CODE_BIN:-}"
if [[ -z "$CODE_BIN" ]]; then
  if [[ -x "/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code" ]]; then
    CODE_BIN="/Applications/Visual Studio Code.app/Contents/Resources/app/bin/code"
  elif command -v code >/dev/null 2>&1; then
    CODE_BIN="$(command -v code)"
  else
    echo "Could not find the VS Code CLI. Set CODE_BIN=/path/to/code and run again." >&2
    exit 1
  fi
fi

echo "Bumping patch version..."
npm version patch --no-git-tag-version

VERSION="$(node -p "require('./package.json').version")"
VSIX="docfox-${VERSION}.vsix"

echo "Compiling Luna ${VERSION}..."
npm run compile

echo "Packaging ${VSIX}..."
npx --yes @vscode/vsce package --out "$VSIX"

echo "Installing ${VSIX}..."
"$CODE_BIN" --install-extension "$VSIX" --force

echo "Removing older docfox VSIX packages..."
find . -maxdepth 1 -name 'docfox-*.vsix' ! -name "$VSIX" -delete

echo "Installed Luna ${VERSION}."
echo "Run 'Developer: Reload Window' in VS Code if the UI does not refresh immediately."
