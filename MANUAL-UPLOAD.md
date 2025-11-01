# 🚀 手動上傳指南（無需 Git 命令行）

## 📋 方法一：GitHub 網頁上傳（推薦）

### 1. 創建 GitHub 倉庫

1. **訪問 GitHub**
   - 前往 [github.com](https://github.com)
   - 登入你的帳號（沒有的話先註冊）

2. **創建新倉庫**
   - 點擊右上角的 "+" → "New repository"
   - 倉庫名稱：`multiplayer-shooting-game`
   - 設為 **Public**（免費用戶必須）
   - ✅ 勾選 "Add a README file"
   - 點擊 "Create repository"

### 2. 上傳遊戲文件

1. **進入倉庫頁面**
   - 創建完成後會自動跳轉到倉庫頁面

2. **上傳文件**
   - 點擊 "uploading an existing file" 或 "Add file" → "Upload files"
   - 將整個 `render-multiplayer-game` 資料夾中的所有文件拖拽到頁面上
   - 或點擊 "choose your files" 選擇文件

3. **需要上傳的文件**：
   ```
   ✅ package.json
   ✅ server.js
   ✅ render.yaml
   ✅ README.md
   ✅ DEPLOY-GUIDE.md
   ✅ QUICK-START.md
   ✅ UPLOAD-GUIDE.md
   ✅ .gitignore
   ✅ public/index.html
   ✅ public/style.css
   ✅ public/game.js
   ✅ public/demo.html
   ✅ public/demo.js
   ```

4. **提交變更**
   - 在頁面底部的 "Commit changes" 區域
   - 輸入提交訊息：`🎮 多人線上射擊遊戲 - 初始版本`
   - 點擊 "Commit changes"

### 3. 確認上傳成功

上傳完成後，你的倉庫應該包含以下結構：
```
multiplayer-shooting-game/
├── package.json
├── server.js
├── render.yaml
├── README.md
├── public/
│   ├── index.html
│   ├── style.css
│   ├── game.js
│   ├── demo.html
│   └── demo.js
└── 其他文件...
```

## 🌐 部署到 Render

### 1. 註冊 Render

1. **訪問 Render**
   - 前往 [render.com](https://render.com)
   - 點擊 "Get Started for Free"

2. **使用 GitHub 登入**
   - 點擊 "GitHub" 按鈕
   - 授權 Render 訪問你的 GitHub 帳號

### 2. 創建 Web Service

1. **點擊 "New +"**
2. **選擇 "Web Service"**
3. **選擇 "Build and deploy from a Git repository"**
4. **找到你的遊戲倉庫**
   - 在列表中找到 `multiplayer-shooting-game`
   - 點擊 "Connect"

### 3. 配置部署設定

Render 會自動檢測到 `render.yaml` 配置，但你可以確認設定：

- **Name**: `multiplayer-game`（或你喜歡的名稱）
- **Region**: 選擇 `Oregon (US West)` 或離你最近的區域
- **Branch**: `main`
- **Root Directory**: 留空
- **Runtime**: `Node`
- **Build Command**: `npm install`
- **Start Command**: `npm start`
- **Plan**: 選擇 `Free`

### 4. 開始部署

1. **點擊 "Create Web Service"**
2. **等待部署完成**
   - 可以在 "Logs" 標籤頁查看部署進度
   - 通常需要 2-5 分鐘
   - 看到 "Your service is live" 表示部署成功

3. **獲得遊戲 URL**
   - 部署完成後，在頁面頂部會顯示你的遊戲 URL
   - 格式類似：`https://multiplayer-game-xxxx.onrender.com`

## 📋 方法二：GitHub Desktop（圖形界面）

如果你想要更方便的版本控制，可以使用 GitHub Desktop：

### 1. 下載 GitHub Desktop
- 訪問 [desktop.github.com](https://desktop.github.com)
- 下載並安裝

### 2. 克隆倉庫
- 打開 GitHub Desktop
- 點擊 "Clone a repository from the Internet"
- 選擇你剛創建的倉庫

### 3. 添加文件
- 將遊戲文件複製到本地倉庫資料夾
- GitHub Desktop 會自動檢測變更
- 輸入提交訊息並點擊 "Commit to main"
- 點擊 "Push origin" 上傳到 GitHub

## 🎯 測試部署結果

### 1. 訪問遊戲
- 點擊 Render 提供的 URL
- 確認遊戲頁面正常載入

### 2. 測試功能
- 創建房間
- 開啟另一個瀏覽器標籤頁加入房間
- 測試多人連線功能

### 3. 檢查健康狀態
- 訪問 `你的域名/health`
- 應該看到 JSON 格式的健康檢查回應

## 🔄 更新遊戲

當你需要更新遊戲時：

### 方法一：GitHub 網頁
1. 在 GitHub 倉庫頁面點擊要修改的文件
2. 點擊編輯按鈕（鉛筆圖標）
3. 修改內容後提交變更
4. Render 會自動重新部署

### 方法二：重新上傳
1. 在 GitHub 倉庫頁面點擊 "Add file" → "Upload files"
2. 上傳修改過的文件（會覆蓋舊文件）
3. 提交變更

## 🐛 故障排除

### 上傳問題
- **文件太大**：GitHub 單個文件限制 100MB
- **網路問題**：嘗試重新上傳
- **權限問題**：確認已登入 GitHub

### 部署問題
- **構建失敗**：檢查 Render 的 "Logs" 標籤頁
- **服務無法啟動**：確認 `package.json` 和 `server.js` 正確上傳
- **連線問題**：等待幾分鐘讓服務完全啟動

### 免費方案限制
- **服務休眠**：15 分鐘無活動後會休眠
- **喚醒時間**：首次訪問可能需要 30 秒
- **資源限制**：免費方案有 CPU 和記憶體限制

## 💡 小貼士

1. **保存 URL**：將你的遊戲 URL 保存起來
2. **分享給朋友**：複製 URL 分享給朋友一起遊戲
3. **監控狀態**：在 Render 控制台可以查看服務狀態
4. **查看日誌**：如果有問題，查看 Render 的日誌

## 🎉 完成！

恭喜！你已經成功將多人射擊遊戲部署到雲端了！

**你的遊戲現在可以**：
- ✅ 24/7 在線訪問
- ✅ 支援多人同時遊戲
- ✅ 自動處理房間管理
- ✅ 即時聊天功能
- ✅ 響應式設計支援手機

🎮 **開始邀請朋友一起遊戲吧！**