#!/bin/bash

# 🚀 多人射擊遊戲部署腳本

echo "🎮 準備部署多人線上射擊遊戲..."

# 檢查是否已經設定 Git remote
if git remote get-url origin > /dev/null 2>&1; then
    echo "✅ Git remote 已設定"
    REMOTE_URL=$(git remote get-url origin)
    echo "📍 遠端倉庫: $REMOTE_URL"
else
    echo "⚠️  尚未設定 Git remote"
    echo "請先在 GitHub 創建倉庫，然後執行："
    echo "git remote add origin https://github.com/你的用戶名/multiplayer-shooting-game.git"
    exit 1
fi

# 檢查是否有未提交的變更
if [[ -n $(git status --porcelain) ]]; then
    echo "📝 發現未提交的變更，正在提交..."
    git add .
    git commit -m "🔄 更新遊戲 - $(date '+%Y-%m-%d %H:%M:%S')"
else
    echo "✅ 沒有未提交的變更"
fi

# 推送到 GitHub
echo "📤 推送到 GitHub..."
git push -u origin main

if [ $? -eq 0 ]; then
    echo "✅ 成功推送到 GitHub!"
    echo ""
    echo "🎯 下一步 - 在 Render 部署:"
    echo "1. 訪問 https://render.com"
    echo "2. 點擊 'New +' → 'Web Service'"
    echo "3. 連接你的 GitHub 倉庫"
    echo "4. 選擇這個項目"
    echo "5. Render 會自動檢測配置並開始部署"
    echo ""
    echo "⏱️  部署通常需要 2-5 分鐘"
    echo "🌐 完成後你會獲得類似這樣的 URL:"
    echo "   https://multiplayer-game-xxxx.onrender.com"
    echo ""
    echo "🎮 部署完成後就可以邀請朋友一起遊戲了！"
else
    echo "❌ 推送失敗，請檢查網路連線和 GitHub 權限"
    exit 1
fi