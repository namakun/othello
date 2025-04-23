# ───────────────────────────────────────
# ベース：Node + Rust toolchain + wasm‑pack
# ───────────────────────────────────────
FROM node:22-bullseye AS base

# --- Rust & wasm‑pack --------------------------------------------------
RUN apt-get update && \
    apt-get install -y --no-install-recommends curl clang pkg-config libssl-dev && \
    curl https://sh.rustup.rs -sSf | sh -s -- -y && \
    /root/.cargo/bin/cargo install wasm-bindgen-cli && \
    /root/.cargo/bin/cargo install wasm-pack && \
    rm -rf /root/.cache/wasm-pack

ENV PATH="/root/.cargo/bin:${PATH}"

# 作業ディレクトリ
WORKDIR /app

# デフォルトコマンド
ENTRYPOINT ["./entrypoint.sh"]
