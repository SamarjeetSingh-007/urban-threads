#!/bin/zsh

ROOT_DIR="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT_DIR" || exit 1

echo "🚀 Starting Urban Threads server..."
echo "📁 Project: $ROOT_DIR"

if [[ ! -d node_modules ]]; then
  echo "📦 Installing dependencies (first run only)..."
  npm install || {
    echo "❌ Failed to install dependencies."
    read "reply?Press Enter to close..."
    exit 1
  }
fi

echo "🌐 Launching server at http://localhost:3000"
echo "🛑 Press Ctrl+C in this Terminal window to stop."
echo ""

npm start

echo ""
echo "Server stopped."
read "reply?Press Enter to close..."
