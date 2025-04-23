#!/bin/sh
set -e

# マウント後に public/wasm を作る
mkdir -p public/wasm

echo "Installing dependencies..."
npm install

# WASM と Vue をビルド
echo "Building WASM and Vue application..."
npm run build

# 開発サーバ起動
echo "Starting development server..."
npm run dev
