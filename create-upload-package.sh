#!/bin/bash

# 🎮 創建上傳包腳本

echo "📦 正在創建上傳包..."

# 創建上傳目錄
UPLOAD_DIR="multiplayer-game-upload"
rm -rf $UPLOAD_DIR
mkdir $UPLOAD_DIR

# 複製必要文件
echo "📋 複製項目文件..."

# 根目錄文件
cp package.json $UPLOAD_DIR/
cp server.js $UPLOAD_DIR/
cp render.yaml $UPLOAD_DIR/
cp README.md $UPLOAD_DIR/
cp DEPLOY-GUIDE.md $UPLOAD_DIR/
cp QUICK-START.md $UPLOAD_DIR/
cp UPLOAD-GUIDE.md $UPLOAD_DIR/
cp MANUAL-UPLOAD.md $UPLOAD_DIR/
cp .gitignore $UPLOAD_DIR/
cp test-local.js $UPLOAD_DIR/

# 創建 public 目錄並複製文件
mkdir $UPLOAD_DIR/public
cp public/index.html $UPLOAD_DIR/public/
cp public/style.css $UPLOAD_DIR/public/
cp public/game.js $UPLOAD_DIR/public/
cp public/demo.html $UPLOAD_DIR/public/
cp public/demo.js $UPLOAD_DIR/public/

echo "✅ 文件複製完成！"
echo ""
echo "📁 上傳包已創建在: $UPLOAD_DIR/"
echo ""
echo "📋 包含的文件:"
find $UPLOAD_DIR -type f | sort

echo ""
echo "🚀 下一步:"
echo "1. 打開 $UPLOAD_DIR 資料夾"
echo "2. 選擇所有文件"
echo "3. 前往 GitHub 上傳"
echo ""
echo "💡 或者直接將整個 $UPLOAD_DIR 資料夾拖拽到 GitHub 網頁上"