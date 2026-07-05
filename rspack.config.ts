import path from "node:path";
import { fileURLToPath } from "node:url";

import { rspack, type Configuration } from "@rspack/core";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const src = (p: string) => path.resolve(__dirname, "src", p);

const config: Configuration = {
  mode: process.env.NODE_ENV === "development" ? "development" : "production",
  devtool: false,
  context: __dirname,
  entry: {
    // Background service worker (MV3).
    background: src("presentation/background/index.ts"),
    // Content scripts — one self-contained bundle per injection target.
    "content-store": src("presentation/content/store/index.ts"),
    "content-party": src("presentation/content/party/index.ts"),
    "content-version": src("presentation/content/version/index.ts"),
    // DMM TV の作品詳細ページにパーティー作成アイコンを注入する content script。
    "content-dmm-detail": src("presentation/content/dmm/detail/index.ts"),
    // DMM TV の再生ページで同時視聴（プレイヤー同期 + サイドバー）を行う content script。
    "content-dmm-player": src("presentation/content/dmm/player/index.ts"),
    // Popup (React + shadcn/ui).
    popup: src("presentation/popup/index.tsx"),
    // Sidebar styles, emitted as a standalone CSS file and injected into the
    // sidebar's Shadow DOM at runtime (content-party).
    "sidebar-style": src("styles/sidebar.css"),
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    filename: "js/[name].js",
    clean: true,
  },
  resolve: {
    extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
    alias: { "@": src("") },
  },
  module: {
    rules: [
      {
        test: /\.[jt]sx?$/,
        exclude: /node_modules/,
        loader: "builtin:swc-loader",
        options: {
          jsc: {
            parser: { syntax: "typescript", tsx: true },
            transform: { react: { runtime: "automatic" } },
            target: "es2022",
          },
        },
      },
      {
        test: /\.css$/,
        type: "css",
        use: ["postcss-loader"],
      },
    ],
  },
  experiments: { css: true },
  // Content scripts legitimately bundle React; the asset-size hint is noise here.
  performance: { hints: false },
  optimization: {
    // Content scripts and the service worker must each be a single, self-contained
    // file — disable code splitting and a shared runtime chunk.
    splitChunks: false,
    runtimeChunk: false,
  },
  plugins: [
    // Inline the build-time backend target so `src/infrastructure/env.ts` can
    // branch on it. Default is the local dev backend; release builds pass
    // `D_PARTY_ENV=production` to target d-party.net (see .github release.yml).
    new rspack.DefinePlugin({
      "process.env.D_PARTY_ENV": JSON.stringify(
        process.env.D_PARTY_ENV ?? "development",
      ),
    }),
    new rspack.HtmlRspackPlugin({
      template: "public/popup.html",
      filename: "popup.html",
      chunks: ["popup"],
      inject: "body",
    }),
    new rspack.CopyRspackPlugin({
      patterns: [
        { from: "public/manifest.json", to: "manifest.json" },
        { from: "public/icon", to: "icon", noErrorOnMissing: true },
        { from: "public/images", to: "images", noErrorOnMissing: true },
        { from: "public/assets", to: "assets", noErrorOnMissing: true },
        { from: "public/css", to: "css", noErrorOnMissing: true },
      ],
    }),
  ],
};

export default config;
