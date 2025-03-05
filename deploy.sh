#!/usr/bin/env sh

# エラー時は停止
set -e

# プロジェクトのビルド
npm run build

# ビルド出力ディレクトリに移動
cd dist

# カスタムドメインを使用する場合は、以下の行のコメントを解除してドメインを設定してください
# echo 'www.example.com' > CNAME

git init
git add -A
git commit -m 'deploy'

# https://<USERNAME>.github.io/<REPO> にデプロイする場合
# git push -f git@github.com:<USERNAME>/<REPO>.git main:gh-pages

# 以下の行を編集して、実際のリポジトリURLとユーザー名に置き換えてください
git push -f git@github.com:username/othello.git main:gh-pages

cd -
