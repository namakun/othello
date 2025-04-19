#!/bin/sh
set -e

# マウント後に public/wasm を作る
mkdir -p public/wasm

# WASM と Vue をビルド
npm run build

# 開発サーバ起動
npm run serve
