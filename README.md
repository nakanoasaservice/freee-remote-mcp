# freee Remote MCP Server

freee API を MCP (Model Context Protocol) でリモートアクセスするためのサーバーです。Cloudflare Workers 上で動作し、OAuth 2.1 による認証で freee アカウントに安全に接続できます。

## ワンクリックでデプロイ

**Deploy to Cloudflare** ボタンで、GitHub 連携・ビルド・KV のプロビジョニングまで自動。数分で freee MCP サーバーを立ち上げられます。

[![Deploy to Cloudflare](https://deploy.workers.cloudflare.com/button)](https://deploy.workers.cloudflare.com/?url=https://github.com/nakanoasaservice/freee-remote-mcp)

---

## 機能

- **OAuth 2.1 + PKCE**: MCP クライアント向けの安全な認証フロー
- **freee 連携**: freee OAuth による認証とトークン管理
- **リモート MCP**: HTTP 経由で Cursor などの MCP クライアントから利用可能

## セットアップマニュアル

### 前提条件

- [freee 開発者アカウント](https://secure.freee.co.jp/oauth/applications)で OAuth アプリケーションを作成できること
- Cloudflare アカウント（無料プランで利用可能）
- GitHub アカウント

---

### Step 1: freee OAuth アプリケーションの作成

1. [freee OAuth アプリケーション管理](https://secure.freee.co.jp/oauth/applications) にアクセス
2. **新規アプリケーション登録** をクリック
3. 以下を設定して登録:
   - **アプリ名**: 任意（例: `freee-remote-mcp`）
   - **リダイレクト URI**: 後述の Step 3 でデプロイ後に取得する Worker URL に `/callback` を付けたもの  
     例: `https://freee-remote-mcp.your-subdomain.workers.dev/callback`
4. 登録後、**クライアント ID** と **クライアントシークレット** を控えておく

> **注意**: リダイレクト URI はデプロイ後の Worker URL に依存するため、Step 3 でデプロイが完了してから freee 側の設定を完了するか、先に仮の URL を登録して後で更新してください。

---

### Step 2: Deploy to Cloudflare でデプロイ

上記の **Deploy to Cloudflare** ボタンをクリックしてデプロイします。

1. ボタンをクリック
2. Cloudflare にログイン（未登録の場合はアカウント作成）
3. 設定画面で以下を確認・変更:
   - **Repository name**: 任意（デフォルト: `freee-remote-mcp`）
   - **Worker name**: 任意（デフォルト: `freee-remote-mcp`）
   - KV ネームスペースなどは自動プロビジョニングされます
4. **Deploy** を実行
5. デプロイ完了後、表示される **Worker URL** を控える  
   例: `https://freee-remote-mcp.your-subdomain.workers.dev`

---

### Step 3: 環境変数・シークレットの設定

デプロイ後、Cloudflare ダッシュボードまたは Wrangler CLI で以下を設定します。

#### 必須シークレット（`wrangler secret put`）

```bash
# プロジェクトディレクトリで実行（Deploy でクローンしたリポジトリ）
bunx wrangler secret put FREEE_CLIENT_SECRET
# プロンプトで freee のクライアントシークレットを入力
```

#### 必須環境変数（`vars`）

| 変数名 | 説明 | 設定方法 |
|--------|------|----------|
| `WORKER_URL` | デプロイした Worker の URL（末尾スラッシュなし） | `wrangler.jsonc` の `vars` またはダッシュボード |
| `FREEE_CLIENT_ID` | freee OAuth のクライアント ID | 同上 |

`wrangler.jsonc` を編集する場合:

```jsonc
"vars": {
  "WORKER_URL": "https://freee-remote-mcp.your-subdomain.workers.dev",
  "FREEE_CLIENT_ID": "あなたのクライアントID"
}
```

編集後、再デプロイ:

```bash
bun run deploy
```

---

### Step 4: freee リダイレクト URI の更新

Step 1 で仮の URL を登録した場合、freee の OAuth アプリ設定でリダイレクト URI を更新します。

- **正しい形式**: `https://<あなたのWorker URL>/callback`  
  例: `https://freee-remote-mcp.your-subdomain.workers.dev/callback`

---

### Step 5: MCP クライアントの設定

Cursor やその他の MCP クライアントで、以下のように設定します。

#### Cursor の場合

`.cursor/mcp.json` または 設定の MCP から:

```json
{
  "mcpServers": {
    "freee": {
      "type": "http",
      "url": "https://freee-remote-mcp.your-subdomain.workers.dev/mcp"
    }
  }
}
```

`your-subdomain` を実際の Worker URL のサブドメインに置き換えてください。

#### 初回接続時の認証

MCP クライアントから初めて接続すると、OAuth 認証フローが開始されます。

1. ブラウザが開き、freee のログイン画面が表示される
2. freee にログインし、アプリの利用を許可
3. 認証完了後、MCP クライアントから freee API を利用可能になります

---

## ローカル開発

```bash
# 依存関係のインストール
bun install

# シークレットの設定（.dev.vars に記載）
cp .dev.vars.example .dev.vars
# .dev.vars を編集して FREEE_CLIENT_ID, FREEE_CLIENT_SECRET, WORKER_URL を設定

# ローカルで起動
bun run dev
```

ローカルでは `http://localhost:8787` で動作します。MCP の URL は `http://localhost:8787/mcp` です。

---

## アーキテクチャ

- **OAuthProvider** (`@cloudflare/workers-oauth-provider`): RFC 7591 DCR、OAuth 2.1 + PKCE、トークン管理
- **freeeHandler** (Hono): `/authorize`、`/callback` ルート
- **mcpApiHandler**: 認証済み `/mcp` リクエストの処理
- **FreeeTokenStoreDO**: ユーザー単位の Durable Object。トークン保存・Single-flight refresh・`updateCompanyId` の read-modify-write を直列化
- **PendingStateDO**: OAuth state 単位の Durable Object。認可中の `pending` をアトミックに get-and-clear

### 必要なリソース

| リソース | 用途 |
|----------|------|
| `OAUTH_KV` | OAuth プロバイダーの状態・トークン保存 |
| `FREEE_TOKEN_DO` | freee トークン用 Durable Object（ユーザー単位） |
| `PENDING_STATE_DO` | OAuth 認可中状態用 Durable Object（state 単位） |

これらは Deploy to Cloudflare 時に自動プロビジョニングされます。

---

## 認可の仕組み（セキュリティ）

この MCP サーバーは freee の会計データにアクセスするため、認可の仕組みを理解しておくことで安心して利用できます。

### 2 段階の OAuth

認可は **2 段階** で行われます。

```
[MCPクライアント]  ←→  [このWorker]  ←→  [freee]
   (Cursor等)         OAuthProvider      freee API
```

1. **MCP クライアント ↔ この Worker**: OAuth 2.1 + PKCE（RFC 7636）
2. **この Worker ↔ freee**: OAuth 2.0 認可コードフロー

MCP クライアントは freee の認証情報を直接扱いません。freee のトークンは Durable Object 内にのみ保存され、MCP クライアントには渡されません。

### 認可フロー

1. **MCP クライアントが接続** → OAuthProvider が認証を要求し、`/authorize` へリダイレクト
2. **GET /authorize** → MCP の OAuth リクエストを解析し、PendingState に保存。freee の認可画面へリダイレクト
3. **ユーザーが freee でログイン・許可** → freee が `/callback` にリダイレクト
4. **GET /callback** → PendingState からアトミックに取得・削除。freee の認可コードをトークンに交換し、FreeeTokenStore に保存。MCP の OAuth を完了し、MCP クライアントへリダイレクト
5. **MCP API リクエスト** → MCP クライアントが Bearer トークンで `/mcp` にリクエスト。Worker がトークンを検証し、FreeeTokenStore から freee トークンを取得（Single-flight refresh）して API を呼び出し

### MCP クライアント用トークン

- **形式**: 不透明トークン（opaque token）`{userId}:{grantId}:{randomSecret}`
- **JWT ではない**: サーバー側の KV に保存し、リクエスト時に検証
- **有効期限**: 6 時間（freee のアクセストークンと同期）

### トークン検証の流れ

1. `Authorization: Bearer {token}` からトークンを取得
2. トークンを SHA-256 でハッシュし、KV のキー `token:{userId}:{grantId}:{hash}` で検索
3. 有効期限を確認
4. トークンから導出した鍵で暗号化された `props`（`freeeUserId` など）を復号
5. 復号に失敗すればトークンは無効（偽造・改ざんの検出）

トークン文字列そのものは KV に保存されません。ハッシュと暗号化されたメタデータのみが保存されるため、KV が漏洩してもトークンは復元されません。

### データの保存場所

| 保存場所 | キー/ID | 内容 |
|----------|---------|------|
| `PendingStateDO` | `pending:{state}` | 認可中の MCP リクエスト（アトミック get-and-clear） |
| `FreeeTokenStoreDO` | `user:{freeeUserId}` | freee の access/refresh トークン |
| `OAUTH_KV` | `token:{userId}:{grantId}:{hash}` | MCP トークンのメタデータ（暗号化された props 含む） |

---

## ライセンス

Apache License 2.0
