# AGENTS.md — d-party Chrome Extension

AI エージェント・開発者向けガイド。dアニメストアで「同時視聴」を実現する Chrome 拡張機能。

## スタック

- **Manifest V3** / TypeScript（strict）
- **pnpm** + **rspack**（swc）でビルド、エントリごとに自己完結バンドル
- **React 18** + **shadcn/ui**（Radix + Tailwind CSS v4）で popup を実装
- **Storybook**（react-vite）でUIコンポーネントを文書化
- **ESLint**（flat config, typescript-eslint）+ **Prettier**
- **orval** でバックエンドREST APIを型安全に生成（`openapi/openapi.json` → `src/infrastructure/api/generated/`）

## アーキテクチャ（クリーンアーキテクチャ）

```
src/
  domain/          プロトコル/設定/リアクションの型（フレームワーク非依存）
    protocol.ts      WebSocket メッセージ型。バックエンド streamer/format.py と1対1で対応
  application/     ユースケース・ポート（IO境界のインターフェース）
    RoomSession.ts   同時視聴の同期オーケストレーション（旧 player.js のWS中核を移植）
    ports.ts         PlayerController / SidebarView / Notifier 等の境界
    ActionGuard.ts   送受信ループ抑止フラグ（旧 available_action）
  infrastructure/  外部I/O実装
    ws/              PartyWebSocketClient
    storage/         ChromeStorageSettingsRepository（chrome.storage.sync）
    notifier/        AwnNotifier（awesome-notifications）
    api/             orval生成クライアント + customFetch mutator
    env.ts           接続先設定（旧 settings.js 定数）
  presentation/    DOM/UIアダプタ（注入対象ごとのエントリ）
    background/      service worker
    content/store/   エピソード一覧ページ（ci_pc/tp_pc）
    content/party/   プレイヤーページ（sc_d_pc）: Sidebar + Player + Reaction
    content/version/ d-party.net ロビーのバージョン確認
    popup/           React + shadcn の設定UI
  components/ui/   shadcn コンポーネント（Button/Switch/Label/Input）
  lib/utils.ts     cn()
```

**rspack エントリ**: `background` / `content-store` / `content-party` / `content-version` / `popup`。
content script はバンドラCSSではなく `manifest.json` の `css` 配列で注入する（`public/css/*`）。

## コアロジックは不変

WebSocket同期プロトコル（`domain/protocol.ts`）はバックエンド `streamer/format.py` と
完全一致させること。アクション名・メッセージ形・`option.paused`/`rate` の文字列表現を変えない。

## コマンド

```bash
pnpm install
pnpm api:generate     # orval でRESTクライアント再生成
pnpm typecheck        # tsc --noEmit
pnpm build            # rspack → dist/（chrome://extensions で読み込む）
pnpm dev              # rspack --watch
pnpm lint             # eslint .
pnpm storybook        # Storybook 起動 (:6006)
```

## 拡張機能の読み込み

`pnpm build` 後、`chrome://extensions` →「パッケージ化されていない拡張機能を読み込む」で
`dist/` を選択する。接続先は `src/infrastructure/env.ts`（既定 `wss://d-party.net`）。
ローカルバックエンドへは `localhost/` `http://` `ws://` に変更する。

## 対象サイト

- `https://anime.dmkt-sp.jp/animestore/sc_d_pc?*`（プレイヤー）
- `https://anime.dmkt-sp.jp/animestore/{ci_pc,tp_pc}*`（一覧）
- `https://d-party.net/anime-store/lobby/*`（バージョン確認）

> 注意: content script の DOM 動作は有料の dアニメストア実ページでしか完全検証できない。
> ロジック層（domain/application）は移植で挙動を保持しているが、UI結合の最終確認は実機で行うこと。
