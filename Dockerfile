FROM node:20-slim

WORKDIR /app

# 依存と CLI インストール
COPY package*.json ./
RUN npm install

# ソース一式と entrypoint をコピー
COPY . .
COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

# コンテナ起動時にビルド＆サーブを実行
ENTRYPOINT ["/entrypoint.sh"]
