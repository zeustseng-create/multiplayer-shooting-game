# 🚀 快速上傳指南

## 📋 上傳步驟

### 1. 創建 GitHub 倉庫
ㄈ
1. **訪問 GitHub**
   - 前往 [github.com](https://github.com)
   - 登入你的帳號

2. **創建新倉庫**
   - 點擊右上角的 "+" → "New repository"
   - 倉庫名稱：`multiplayer-shooting-game`（或你喜歡的名稱）
   - 設為 Public（免費用戶）
   - **不要**勾選 "Add a README file"
   - 點擊 "Create repository"

3. **複製倉庫 URL**
   - 創建後會看到類似這樣的 URL：
   - `https://github.com/你的用戶名/multiplayer-shooting-game.git`

### 2. 連接本地倉庫到 GitHub

在終端中執行（替換成你的 GitHub 用戶名）：

```bash
git remote add origin https://github.com/你的用戶名/multiplayer-shooting-game.git
git branch -M main
git push -u origin main
```

### 3. 使用自動部署腳本（可選）

```bash
./deploy.sh
```

### 4. 手動推送（如果腳本不工作）

```bash
git add .
git commit -m "🎮 更新遊戲"
git push origin main
```

## 🌐 部署到 Render

### 1. 註冊 Render

1. 訪問 [render.com](https://render.com)
2. 點擊 "Get Started for Free"
3. 使用 GitHub 帳號登入（推薦）

### 2. 創建 Web Service

1. **點擊 "New +"**
2. **選擇 "Web Service"**
3. **選擇 "Build and deploy from a Git repository"**
4. **點擊 "Connect" 連接 GitHub**
5. **選擇你的遊戲倉庫**

### 3. 配置設定

Render 會自動檢測到 `render.yaml` 配置文件，但你也可以手動設定：

- **Name**: `multiplayer-game`
- **Region**: 選擇離你最近的區域
- **Branch**: `main`
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`

### 4. 開始部署

1. **點擊 "Create Web Service"**
2. **等待部署完成**（通常 2-5 分鐘）
3. **獲得遊戲 URL**

## 🎯 部署完成後

### 測試遊戲功能

1. **訪問你的遊戲 URL**
2. **測試基本功能**：
   - 創建房間
   - 加入房間
   - 開始遊戲
   - 多人連線（開啟多個瀏覽器標籤頁）

### 分享給朋友

- 複製你的遊戲 URL
- 分享給朋友一起遊戲
- 最多支援 6 人同時遊戲

## 🔄 更新遊戲

當你修改遊戲代碼後：

```bash
git add .
git commit -m "🎮 更新功能"
git push
```

Render 會自動檢測變更並重新部署。

## 🐛 常見問題

### 推送失敗
- 檢查 GitHub 用戶名和倉庫名稱是否正確
- 確認網路連線正常
- 檢查 Git 權限設定

### 部署失敗
- 查看 Render 的構建日誌
- 確認 `package.json` 配置正確
- 檢查 Node.js 版本兼容性

### 遊戲無法連線
- 確認服務狀態為 "Live"
- 檢查瀏覽器控制台錯誤
- 嘗試重新整理頁面

## 💰 費用說明

### 免費方案
- ✅ 每月 750 小時免費
- ✅ 適合測試和小規模使用
- ❌ 閒置 15 分鐘後會休眠
- ❌ 首次訪問需等待 30 秒喚醒

### 付費方案（$7/月起）
- ✅ 24/7 運行，不休眠
- ✅ 更好的性能
- ✅ 自定義域名
- ✅ 更多資源

## 🎉 完成！

恭喜！你的多人射擊遊戲現在已經上線了！

**下一步**：
1. 測試所有功能
2. 邀請朋友一起遊戲
3. 收集反饋並改進
4. 考慮添加更多功能

🎮 **開始你的多人遊戲之旅吧！**