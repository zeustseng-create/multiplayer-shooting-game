// 多人線上射擊遊戲主程式
class MultiplayerShooterGame {
    constructor() {
        this.currentScreen = 'mainMenu';
        this.gameState = 'menu'; // menu, waiting, playing, gameOver
        this.socket = null;
        this.roomId = null;
        this.playerId = null;
        this.playerName = '';
        this.currentRoom = null;
        
        // 遊戲畫布和上下文
        this.canvas = null;
        this.ctx = null;
        
        // 遊戲數據
        this.gameData = {
            health: 100,
            kills: 0,
            deaths: 0,
            gameTime: 0
        };
        
        // 遊戲物件
        this.player = null;
        this.otherPlayers = [];
        this.serverBullets = [];
        this.obstacles = [];
        
        // 輸入處理
        this.keys = {};
        this.mouse = { x: 0, y: 0, pressed: false };
        
        // 遊戲設定
        this.gameConfig = {
            playerSpeed: 5,
            bulletSpeed: 10,
            fireRate: 200, // 毫秒
            gameTime: 180, // 3分鐘
            mapWidth: 800,
            mapHeight: 600
        };
        
        this.lastFireTime = 0;
        this.gameStartTime = 0;
        
        this.init();
    }
    
    init() {
        this.setupEventListeners();
        this.setupCanvas();
        this.showScreen('mainMenu');
        this.setupWebSocket();
    }
    
    setupEventListeners() {
        // 主選單按鈕
        document.getElementById('createRoomBtn').addEventListener('click', () => {
            this.showScreen('createRoomScreen');
        });
        
        document.getElementById('joinRoomBtn').addEventListener('click', () => {
            this.showScreen('joinRoomScreen');
            this.loadAvailableRooms();
        });
        
        // 開發者模式
        document.getElementById('developerBtn').addEventListener('click', () => {
            this.showDeveloperModal();
        });
        
        document.getElementById('developerLoginBtn').addEventListener('click', () => {
            this.loginDeveloper();
        });
        
        document.getElementById('closeDeveloperModalBtn').addEventListener('click', () => {
            this.closeDeveloperModal();
        });
        
        // 創建房間
        document.getElementById('createRoomConfirmBtn').addEventListener('click', () => {
            this.createRoom();
        });
        
        document.getElementById('backToMenuBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        // 加入房間
        document.getElementById('joinRoomConfirmBtn').addEventListener('click', () => {
            this.joinRoom();
        });
        
        document.getElementById('backToMenuBtn2').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        // 房間等待
        document.getElementById('readyBtn').addEventListener('click', () => {
            this.toggleReady();
        });
        
        document.getElementById('startGameBtn').addEventListener('click', () => {
            this.startGame();
        });
        
        document.getElementById('leaveRoomBtn').addEventListener('click', () => {
            this.leaveRoom();
        });
        
        // AI 和隊伍功能
        document.getElementById('addAiBtn').addEventListener('click', () => {
            this.addAiPlayer();
        });
        
        // 隊伍選擇按鈕
        document.getElementById('teamRedBtn').addEventListener('click', () => {
            this.selectTeam('red');
        });
        
        document.getElementById('teamBlueBtn').addEventListener('click', () => {
            this.selectTeam('blue');
        });
        
        document.getElementById('teamGreenBtn').addEventListener('click', () => {
            this.selectTeam('green');
        });
        
        document.getElementById('teamYellowBtn').addEventListener('click', () => {
            this.selectTeam('yellow');
        });
        
        // 開發者控制面板
        document.getElementById('deleteAllRoomsBtn').addEventListener('click', () => {
            this.deleteAllRooms();
        });
        
        document.getElementById('viewAllRoomsBtn').addEventListener('click', () => {
            this.viewAllRooms();
        });
        
        document.getElementById('backToMenuFromDeveloperBtn').addEventListener('click', () => {
            this.showScreen('mainMenu');
        });
        
        // 聊天
        document.getElementById('sendChatBtn').addEventListener('click', () => {
            this.sendChatMessage();
        });
        
        document.getElementById('chatInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.sendChatMessage();
            }
        });
        
        // 遊戲控制
        document.getElementById('exitGameBtn').addEventListener('click', () => {
            this.exitGame();
        });
        
        // 遊戲結束
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            this.showScreen('roomWaitingScreen');
        });
        
        document.getElementById('backToMenuBtn3').addEventListener('click', () => {
            this.leaveRoom();
            this.showScreen('mainMenu');
        });
        
        // 鍵盤事件
        document.addEventListener('keydown', (e) => {
            this.keys[e.key.toLowerCase()] = true;
        });
        
        document.addEventListener('keyup', (e) => {
            this.keys[e.key.toLowerCase()] = false;
        });
    }
    
    setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        this.ctx = this.canvas.getContext('2d');
        
        // 滑鼠事件
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', () => {
            this.mouse.pressed = true;
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.pressed = false;
        });
    }
    
    setupWebSocket() {
        // 連接到 Socket.IO 服務器
        const serverUrl = window.location.origin;
        this.socket = io(serverUrl);
        
        // 連接事件
        this.socket.on('connect', () => {
            console.log('已連接到遊戲服務器');
            this.updateConnectionStatus('connected');
        });
        
        this.socket.on('disconnect', () => {
            console.log('與服務器斷開連接');
            this.updateConnectionStatus('disconnected');
        });
        
        // 房間事件
        this.socket.on('roomCreated', (data) => {
            this.roomId = data.roomId;
            this.currentRoom = data.room;
            this.showScreen('roomWaitingScreen');
            this.updateRoomInfo();
        });
        
        this.socket.on('roomJoined', (data) => {
            this.roomId = data.room.id;
            this.currentRoom = data.room;
            this.showScreen('roomWaitingScreen');
            this.updateRoomInfo();
        });
        
        this.socket.on('joinError', (data) => {
            alert(data.message);
        });
        
        this.socket.on('roomList', (rooms) => {
            this.displayRoomList(rooms);
        });
        
        this.socket.on('playerJoined', (data) => {
            if (this.currentRoom) {
                this.currentRoom.players.push(data.player);
                this.updateRoomInfo();
            }
        });
        
        this.socket.on('playerReadyUpdate', (data) => {
            if (this.currentRoom) {
                const player = this.currentRoom.players.find(p => p.id === data.playerId);
                if (player) {
                    player.ready = data.ready;
                    this.updateRoomInfo();
                }
            }
        });
        
        // 遊戲事件
        this.socket.on('gameStarted', () => {
            this.gameState = 'playing';
            this.showScreen('gameScreen');
            this.initGame();
        });
        
        this.socket.on('gameState', (gameState) => {
            this.updateGameFromServer(gameState);
        });
        
        this.socket.on('gameEnded', (data) => {
            this.endGameWithResults(data.rankings);
        });
        
        // 聊天事件
        this.socket.on('chatMessage', (data) => {
            this.displayChatMessage(data);
        });
        
        // 隊伍相關事件
        this.socket.on('playerTeamChanged', (data) => {
            this.updatePlayerTeam(data.playerId, data.team);
        });
        
        // 開發者相關事件
        this.socket.on('developerData', (data) => {
            this.displayDeveloperData(data);
        });
        
        this.socket.on('allRoomsDeleted', () => {
            alert('所有房間已被刪除');
            this.showScreen('mainMenu');
        });
        
        this.socket.on('allRoomsData', (rooms) => {
            this.displaySpectateRooms(rooms);
        });
        
        this.socket.on('spectateStarted', (data) => {
            this.startSpectating(data.room);
        });
        
        // 踢人相關事件
        this.socket.on('playerKicked', (data) => {
            if (data.kickedPlayerId === this.playerId) {
                alert('你被房主踢出房間了！');
                this.showScreen('mainMenu');
                this.currentRoom = null;
                this.roomId = null;
            } else {
                this.displayChatMessage({
                    playerName: '系統',
                    message: `${data.kickedPlayerName} 被踢出房間`,
                    timestamp: Date.now(),
                    isSystem: true
                });
            }
        });
        
        // 房間更新事件（用於 AI 添加等）
        this.socket.on('roomUpdated', (room) => {
            this.currentRoom = room;
            this.updateRoomInfo();
        });
    }
    
    updateConnectionStatus(status) {
        const statusElement = document.getElementById('connectionStatus');
        const statusText = document.getElementById('statusText');
        
        statusElement.className = `connection-status ${status}`;
        
        switch (status) {
            case 'connected':
                statusText.textContent = '已連線';
                break;
            case 'disconnected':
                statusText.textContent = '連線中斷';
                break;
            default:
                statusText.textContent = '連線中...';
        }
    }
    
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }
    
    createRoom() {
        const roomName = document.getElementById('roomNameInput').value.trim();
        const playerName = document.getElementById('playerNameInput').value.trim();
        const maxPlayers = document.getElementById('maxPlayersSelect').value;
        const team = document.getElementById('teamSelect').value;
        
        if (!roomName || !playerName) {
            alert('請填寫房間名稱和玩家名稱！');
            return;
        }
        
        this.playerName = playerName;
        this.playerId = this.generatePlayerId();
        this.selectedTeam = team;
        
        this.socket.emit('createRoom', {
            roomName: roomName,
            playerName: playerName,
            maxPlayers: parseInt(maxPlayers),
            playerId: this.playerId,
            team: team
        });
    }
    
    joinRoom() {
        const roomId = document.getElementById('roomIdInput').value.trim();
        const playerName = document.getElementById('joinPlayerNameInput').value.trim();
        
        if (!playerName) {
            alert('請填寫玩家名稱！');
            return;
        }
        
        this.playerName = playerName;
        this.playerId = this.generatePlayerId();
        
        this.socket.emit('joinRoom', {
            roomId: roomId,
            playerName: playerName,
            playerId: this.playerId
        });
    }
    
    loadAvailableRooms() {
        const roomsContainer = document.getElementById('availableRooms');
        roomsContainer.innerHTML = '<div class="loading">搜尋房間中...</div>';
        
        // 請求房間列表
        this.socket.emit('getRoomList');
    }
    
    displayRoomList(rooms) {
        const roomsContainer = document.getElementById('availableRooms');
        
        if (rooms.length === 0) {
            roomsContainer.innerHTML = '<div class="loading">目前沒有可用房間</div>';
            return;
        }
        
        roomsContainer.innerHTML = rooms.map(room => `
            <div class="room-item" onclick="game.quickJoinRoom('${room.id}')">
                <div><strong>🎮 ${room.name}</strong></div>
                <div>玩家: ${room.players}/${room.maxPlayers} | ID: ${room.id}</div>
            </div>
        `).join('');
    }
    
    quickJoinRoom(roomId) {
        document.getElementById('roomIdInput').value = roomId;
        const playerName = document.getElementById('joinPlayerNameInput').value.trim();
        if (!playerName) {
            document.getElementById('joinPlayerNameInput').focus();
            return;
        }
        this.joinRoom();
    }
    
    updateRoomInfo() {
        if (!this.currentRoom) return;
        
        document.getElementById('currentRoomId').textContent = this.roomId;
        document.getElementById('roomTitle').textContent = `房間: ${this.currentRoom.name}`;
        document.getElementById('currentPlayerCount').textContent = this.currentRoom.players.length;
        document.getElementById('maxPlayerCount').textContent = this.currentRoom.maxPlayers;
        
        // 更新玩家列表
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = this.currentRoom.players.map(player => `
            <div class="player-item">
                <span>${player.name}${player.id === this.playerId ? ' (你)' : ''}</span>
                <span class="${player.ready ? 'player-ready' : 'player-waiting'}">
                    ${player.ready ? '✅ 準備就緒' : '⏳ 等待中'}
                </span>
            </div>
        `).join('');
        
        // 檢查是否可以開始遊戲
        const myPlayer = this.currentRoom.players.find(p => p.id === this.playerId);
        const isHost = myPlayer && this.currentRoom.players[0].id === this.playerId;
        const allReady = this.currentRoom.players.length >= 2 && 
                        this.currentRoom.players.every(p => p.ready);
        
        document.getElementById('startGameBtn').disabled = !isHost || !allReady;
        
        // 更新準備按鈕狀態
        const readyBtn = document.getElementById('readyBtn');
        if (myPlayer) {
            readyBtn.textContent = myPlayer.ready ? '取消準備' : '準備';
            readyBtn.className = myPlayer.ready ? 'btn secondary' : 'btn primary';
        }
    }
    
    toggleReady() {
        if (this.currentScreen === 'roomWaitingScreen' && this.currentRoom) {
            const player = this.currentRoom.players.find(p => p.id === this.playerId);
            if (player) {
                const newReadyState = !player.ready;
                this.socket.emit('playerReady', { ready: newReadyState });
            }
        }
    }
    
    startGame() {
        this.socket.emit('startGame');
    }
    
    leaveRoom() {
        this.roomId = null;
        this.playerId = null;
        this.currentRoom = null;
        this.showScreen('mainMenu');
    }
    
    sendChatMessage() {
        const input = document.getElementById('chatInput');
        const message = input.value.trim();
        
        if (message) {
            this.socket.emit('chatMessage', { message });
            input.value = '';
        }
    }
    
    displayChatMessage(data) {
        const chatMessages = document.getElementById('chatMessages');
        const time = new Date(data.timestamp).toLocaleTimeString('zh-TW', { 
            hour: '2-digit', 
            minute: '2-digit' 
        });
        
        chatMessages.innerHTML += `
            <div style="margin-bottom: 8px; padding: 5px; background: rgba(255,255,255,0.1); border-radius: 4px;">
                <span style="color: #4ecdc4; font-weight: bold;">${data.playerName}</span>
                <span style="color: #ccc; font-size: 0.8rem; margin-left: 10px;">${time}</span>
                <div style="margin-top: 2px;">${data.message}</div>
            </div>
        `;
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    initGame() {
        this.gameStartTime = Date.now();
        this.gameData = {
            health: 100,
            kills: 0,
            deaths: 0,
            gameTime: 0
        };
        
        // 初始化玩家
        this.player = {
            x: this.gameConfig.mapWidth / 2,
            y: this.gameConfig.mapHeight / 2,
            width: 30,
            height: 30,
            angle: 0,
            speed: this.gameConfig.playerSpeed
        };
        
        // 清空遊戲物件
        this.otherPlayers = [];
        this.serverBullets = [];
        this.obstacles = [];
        
        // 開始遊戲循環
        this.gameLoop();
        
        // 更新UI
        this.updateGameUI();
    }
    
    gameLoop() {
        if (this.gameState !== 'playing') return;
        
        this.update();
        this.render();
        
        requestAnimationFrame(() => this.gameLoop());
    }
    
    update() {
        // 更新玩家輸入
        this.updatePlayerInput();
        
        // 更新UI
        this.updateGameUI();
    }
    
    updatePlayerInput() {
        if (this.gameState !== 'playing') return;
        
        // 收集移動輸入
        const moveData = {
            up: this.keys['w'] || this.keys['arrowup'],
            down: this.keys['s'] || this.keys['arrowdown'],
            left: this.keys['a'] || this.keys['arrowleft'],
            right: this.keys['d'] || this.keys['arrowright']
        };
        
        // 發送移動數據到服務器
        if (moveData.up || moveData.down || moveData.left || moveData.right) {
            this.socket.emit('playerAction', {
                type: 'move',
                data: moveData
            });
        }
        
        // 計算瞄準角度
        const dx = this.mouse.x - (this.player.x + this.player.width / 2);
        const dy = this.mouse.y - (this.player.y + this.player.height / 2);
        this.player.angle = Math.atan2(dy, dx);
        
        // 發送角度更新
        this.socket.emit('playerAction', {
            type: 'updateAngle',
            data: { angle: this.player.angle }
        });
        
        // 射擊
        if (this.mouse.pressed && Date.now() - this.lastFireTime > this.gameConfig.fireRate) {
            this.shoot();
        }
    }
    
    shoot() {
        if (this.gameState !== 'playing') return;
        
        this.lastFireTime = Date.now();
        
        // 發送射擊動作到服務器
        this.socket.emit('playerAction', {
            type: 'shoot',
            data: { angle: this.player.angle }
        });
    }
    
    render() {
        // 清空畫布
        this.ctx.fillStyle = '#1a1a1a';
        this.ctx.fillRect(0, 0, this.gameConfig.mapWidth, this.gameConfig.mapHeight);
        
        // 繪製背景網格
        this.drawGrid();
        
        // 繪製障礙物
        this.obstacles.forEach(obstacle => {
            this.ctx.font = `${obstacle.width}px Arial`;
            this.ctx.textAlign = 'center';
            this.ctx.fillText(obstacle.emoji, 
                            obstacle.x + obstacle.width / 2, 
                            obstacle.y + obstacle.height);
        });
        
        // 繪製玩家
        this.drawPlayer();
        
        // 繪製其他玩家
        this.otherPlayers.forEach(player => {
            this.drawOtherPlayer(player);
        });
        
        // 繪製子彈
        this.serverBullets.forEach(bullet => {
            this.ctx.fillStyle = bullet.ownerId === this.playerId ? '#4ecdc4' : '#ff6b6b';
            this.ctx.beginPath();
            this.ctx.arc(bullet.x, bullet.y, 4, 0, Math.PI * 2);
            this.ctx.fill();
        });
    }
    
    drawGrid() {
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        this.ctx.lineWidth = 1;
        
        for (let x = 0; x < this.gameConfig.mapWidth; x += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(x, 0);
            this.ctx.lineTo(x, this.gameConfig.mapHeight);
            this.ctx.stroke();
        }
        
        for (let y = 0; y < this.gameConfig.mapHeight; y += 50) {
            this.ctx.beginPath();
            this.ctx.moveTo(0, y);
            this.ctx.lineTo(this.gameConfig.mapWidth, y);
            this.ctx.stroke();
        }
    }
    
    drawPlayer() {
        this.ctx.save();
        this.ctx.translate(this.player.x + this.player.width / 2, 
                          this.player.y + this.player.height / 2);
        this.ctx.rotate(this.player.angle);
        
        // 繪製玩家身體
        this.ctx.fillStyle = '#4ecdc4';
        this.ctx.fillRect(-this.player.width / 2, -this.player.height / 2, 
                         this.player.width, this.player.height);
        
        // 繪製武器
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(this.player.width / 2, -3, 25, 6);
        
        this.ctx.restore();
        
        // 繪製玩家名稱
        this.ctx.fillStyle = '#4ecdc4';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(this.playerName, 
                         this.player.x + this.player.width / 2, 
                         this.player.y - 8);
    }
    
    drawOtherPlayer(player) {
        this.ctx.save();
        this.ctx.translate(player.x + 15, player.y + 15);
        this.ctx.rotate(player.angle);
        
        // 繪製玩家身體
        this.ctx.fillStyle = player.color || '#ff6b6b';
        this.ctx.fillRect(-15, -15, 30, 30);
        
        // 繪製武器
        this.ctx.fillStyle = '#666';
        this.ctx.fillRect(15, -3, 25, 6);
        
        this.ctx.restore();
        
        // 繪製玩家名稱
        this.ctx.fillStyle = player.color || '#ff6b6b';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.name, player.x + 15, player.y - 8);
        
        // 繪製血條
        const barWidth = 40;
        const barHeight = 4;
        const healthPercent = player.health / 100;
        
        this.ctx.fillStyle = '#ff0000';
        this.ctx.fillRect(player.x + (30 - barWidth) / 2, player.y - 18, barWidth, barHeight);
        this.ctx.fillStyle = '#00ff00';
        this.ctx.fillRect(player.x + (30 - barWidth) / 2, player.y - 18, 
                         barWidth * healthPercent, barHeight);
    }
    
    updateGameUI() {
        // 更新血條
        const healthBar = document.getElementById('healthBar');
        healthBar.style.width = `${this.gameData.health}%`;
        
        // 更新統計
        document.getElementById('killCount').textContent = this.gameData.kills;
        document.getElementById('deathCount').textContent = this.gameData.deaths;
        
        // 更新時間
        const minutes = Math.floor(this.gameData.gameTime / 60);
        const seconds = this.gameData.gameTime % 60;
        document.getElementById('gameTimer').textContent = 
            `${minutes}:${seconds.toString().padStart(2, '0')}`;
        
        // 更新排行榜
        this.updateLeaderboard();
    }
    
    updateLeaderboard() {
        const leaderboard = document.getElementById('leaderboardList');
        const allPlayers = [
            { name: this.playerName, kills: this.gameData.kills, deaths: this.gameData.deaths },
            ...this.otherPlayers.map(p => ({ name: p.name, kills: p.kills, deaths: p.deaths }))
        ];
        
        allPlayers.sort((a, b) => {
            const aKD = a.deaths > 0 ? a.kills / a.deaths : a.kills;
            const bKD = b.deaths > 0 ? b.kills / b.deaths : b.kills;
            return bKD - aKD;
        });
        
        leaderboard.innerHTML = allPlayers.slice(0, 5).map((player, index) => {
            const kd = player.deaths > 0 ? (player.kills / player.deaths).toFixed(1) : player.kills;
            return `
                <div style="display: flex; justify-content: space-between; margin-bottom: 5px; ${player.name === this.playerName ? 'color: #4ecdc4; font-weight: bold;' : ''}">
                    <span>${index + 1}. ${player.name}</span>
                    <span>${player.kills}/${player.deaths} (${kd})</span>
                </div>
            `;
        }).join('');
    }
    
    exitGame() {
        this.gameState = 'menu';
        this.showScreen('roomWaitingScreen');
    }
    
    updateGameFromServer(gameState) {
        if (this.gameState !== 'playing') return;
        
        // 更新其他玩家位置
        this.otherPlayers = gameState.players.filter(p => p.id !== this.playerId);
        
        // 更新自己的位置（服務器權威）
        const myPlayer = gameState.players.find(p => p.id === this.playerId);
        if (myPlayer) {
            this.player.x = myPlayer.x;
            this.player.y = myPlayer.y;
            this.gameData.health = myPlayer.health;
            this.gameData.kills = myPlayer.kills;
            this.gameData.deaths = myPlayer.deaths;
        }
        
        // 更新子彈
        this.serverBullets = gameState.bullets;
        
        // 更新障礙物
        this.obstacles = gameState.obstacles;
        
        // 更新遊戲時間
        this.gameData.gameTime = gameState.gameTime;
    }
    
    endGameWithResults(rankings) {
        this.gameState = 'gameOver';
        this.showScreen('gameOverScreen');
        
        // 顯示排名結果
        const finalResults = document.getElementById('finalResults');
        let resultsHTML = '<h3>🏆 最終排名</h3>';
        
        rankings.forEach((player, index) => {
            const kd = player.gameData.deaths > 0 ? 
                (player.gameData.kills / player.gameData.deaths).toFixed(2) : 
                player.gameData.kills;
            
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
            
            resultsHTML += `
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px; padding: 10px; background: rgba(255,255,255,0.1); border-radius: 8px; ${player.id === this.playerId ? 'border: 2px solid #4ecdc4;' : ''}">
                    <span style="font-size: 1.2rem;">
                        ${medal} ${index + 1}. ${player.name}${player.id === this.playerId ? ' (你)' : ''}
                    </span>
                    <span style="font-weight: bold;">
                        ${player.gameData.kills}/${player.gameData.deaths} (${kd})
                    </span>
                </div>
            `;
        });
        
        finalResults.innerHTML = resultsHTML;
    }
    
    generatePlayerId() {
        return Math.random().toString(36).substring(2, 11);
    }
    
    // 開發者模式功能
    showDeveloperModal() {
        document.getElementById('developerModal').classList.add('active');
    }
    
    closeDeveloperModal() {
        document.getElementById('developerModal').classList.remove('active');
        document.getElementById('developerPassword').value = '';
    }
    
    loginDeveloper() {
        const password = document.getElementById('developerPassword').value;
        if (password === 'P@ssw0rd') {
            this.closeDeveloperModal();
            this.isDeveloper = true;
            this.showScreen('developerPanel');
            this.loadDeveloperData();
        } else {
            alert('密碼錯誤！');
        }
    }
    
    loadDeveloperData() {
        this.socket.emit('getDeveloperData');
    }
    
    deleteAllRooms() {
        if (confirm('確定要刪除所有房間嗎？')) {
            this.socket.emit('deleteAllRooms');
        }
    }
    
    viewAllRooms() {
        this.socket.emit('getAllRooms');
    }
    
    spectateRoom(roomId) {
        this.socket.emit('spectateRoom', { roomId });
    }
    
    // 隊伍選擇功能
    selectTeam(team) {
        this.selectedTeam = team;
        
        // 更新 UI
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById(`team${team.charAt(0).toUpperCase() + team.slice(1)}Btn`).classList.add('selected');
        
        const teamNames = {
            red: '🔴 紅隊',
            blue: '🔵 藍隊', 
            green: '🟢 綠隊',
            yellow: '🟡 黃隊'
        };
        
        document.getElementById('currentTeam').textContent = teamNames[team];
        
        // 通知服務器
        if (this.socket && this.roomId) {
            this.socket.emit('selectTeam', { team });
        }
    }
    
    // AI 玩家功能
    addAiPlayer() {
        if (this.socket && this.roomId) {
            console.log('發送 addAiPlayer 請求到房間:', this.roomId);
            this.socket.emit('addAiPlayer');
        } else {
            console.log('無法添加 AI：socket 或 roomId 不存在', { socket: !!this.socket, roomId: this.roomId });
            alert('無法添加 AI 玩家，請確保已連接到房間');
        }
    }
    
    // 更新玩家隊伍顯示
    updatePlayerTeam(playerId, team) {
        // 更新房間中的玩家列表顯示
        this.updateRoomInfo();
    }
    
    // 顯示開發者數據
    displayDeveloperData(data) {
        const spectateContainer = document.getElementById('spectateRoomsList');
        let html = '<h4>可觀戰房間</h4>';
        
        data.rooms.forEach(room => {
            html += `
                <div class="spectate-room-item" onclick="game.spectateRoom('${room.id}')">
                    <strong>${room.name}</strong>
                    <br>玩家: ${room.players.size}/${room.maxPlayers}
                    <br>狀態: ${room.gameState}
                </div>
            `;
        });
        
        if (data.rooms.length === 0) {
            html += '<p>目前沒有房間</p>';
        }
        
        spectateContainer.innerHTML = html;
    }
    
    // 顯示可觀戰房間
    displaySpectateRooms(rooms) {
        this.displayDeveloperData({ rooms });
    }
    
    // 開始觀戰
    startSpectating(room) {
        this.currentRoom = room;
        this.gameState = 'spectating';
        this.showScreen('gameScreen');
        // 這裡可以添加觀戰模式的特殊 UI
    }
    
    // 修改房間信息更新以支持隊伍和 AI 顯示
    updateRoomInfo() {
        if (!this.currentRoom) return;
        
        document.getElementById('roomTitle').textContent = `房間: ${this.currentRoom.name}`;
        document.getElementById('currentRoomId').textContent = this.currentRoom.id;
        document.getElementById('currentPlayerCount').textContent = this.currentRoom.players.size || 0;
        document.getElementById('maxPlayerCount').textContent = this.currentRoom.maxPlayers;
        
        // 檢查當前玩家是否為房主
        const isHost = this.currentRoom.host === this.playerId;
        
        // 更新玩家列表
        const playersList = document.getElementById('playersList');
        let playersHTML = '';
        
        if (this.currentRoom.players) {
            const playersArray = Array.isArray(this.currentRoom.players) 
                ? this.currentRoom.players 
                : Array.from(this.currentRoom.players.values());
                
            playersArray.forEach(player => {
                const isCurrentPlayer = player.id === this.playerId;
                const isPlayerHost = player.id === this.currentRoom.host;
                const teamClass = player.team || 'none';
                const teamName = {
                    red: '🔴',
                    blue: '🔵', 
                    green: '🟢',
                    yellow: '🟡'
                }[player.team] || '';
                
                // 踢人按鈕：房主可以踢人（包括 AI），但不能踢自己
                const kickButton = (isHost && !isCurrentPlayer) 
                    ? `<button class="kick-btn" onclick="game.kickPlayer('${player.id}')">${player.isAI ? '移除' : '踢出'}</button>` 
                    : '';
                
                // AI 隊伍選擇按鈕：只有房主可以改變 AI 隊伍
                const aiTeamButtons = (isHost && player.isAI) 
                    ? `
                        <div class="ai-team-controls">
                            <button class="ai-team-btn red ${player.team === 'red' ? 'active' : ''}" onclick="game.changeAiTeam('${player.id}', 'red')">🔴</button>
                            <button class="ai-team-btn blue ${player.team === 'blue' ? 'active' : ''}" onclick="game.changeAiTeam('${player.id}', 'blue')">🔵</button>
                            <button class="ai-team-btn green ${player.team === 'green' ? 'active' : ''}" onclick="game.changeAiTeam('${player.id}', 'green')">🟢</button>
                            <button class="ai-team-btn yellow ${player.team === 'yellow' ? 'active' : ''}" onclick="game.changeAiTeam('${player.id}', 'yellow')">🟡</button>
                        </div>
                    ` 
                    : '';
                
                playersHTML += `
                    <div class="player-item ${isCurrentPlayer ? 'current-player' : ''}">
                        <span class="player-name">
                            ${player.name}${isCurrentPlayer ? ' (你)' : ''}
                            ${player.isAI ? ' <span class="player-ai">🤖</span>' : ''}
                            ${isPlayerHost ? ' <span class="host-badge">👑 房主</span>' : ''}
                        </span>
                        <div class="player-actions">
                            <div class="player-status">
                                ${teamName ? `<span class="player-team ${teamClass}">${teamName}</span>` : ''}
                                <span class="ready-status ${player.ready ? 'ready' : 'not-ready'}">
                                    ${player.ready ? '✓ 準備' : '⏳ 等待'}
                                </span>
                            </div>
                            ${aiTeamButtons}
                            ${kickButton}
                        </div>
                    </div>
                `;
            });
        }
        
        playersList.innerHTML = playersHTML || '<div class="no-players">沒有玩家</div>';
        
        // 更新開始遊戲按鈕狀態：只有房主可以開始遊戲，且所有玩家都準備好
        const allReady = this.currentRoom.players && 
            Array.from(this.currentRoom.players.values()).every(p => p.ready) &&
            this.currentRoom.players.size >= 2;
            
        const startGameBtn = document.getElementById('startGameBtn');
        if (isHost) {
            startGameBtn.disabled = !allReady;
            startGameBtn.style.display = 'inline-block';
        } else {
            startGameBtn.style.display = 'none';
        }
    }
    
    // 踢人功能
    kickPlayer(playerId) {
        // 找到玩家信息來確定是 AI 還是真人
        const playersArray = Array.isArray(this.currentRoom.players) 
            ? this.currentRoom.players 
            : Array.from(this.currentRoom.players.values());
        
        const player = playersArray.find(p => p.id === playerId);
        const actionText = player?.isAI ? '移除這個 AI 玩家' : '踢出這個玩家';
        
        if (confirm(`確定要${actionText}嗎？`)) {
            this.socket.emit('kickPlayer', { playerId });
        }
    }
    
    // 改變 AI 隊伍
    changeAiTeam(aiId, team) {
        if (this.socket && this.roomId) {
            this.socket.emit('changeAiTeam', { aiId, team });
        }
    }
    
    // 開始遊戲
    startGame() {
        if (this.socket && this.roomId) {
            this.socket.emit('startGame');
        }
    }
    
    // 切換準備狀態
    toggleReady() {
        if (this.socket && this.roomId) {
            this.socket.emit('toggleReady');
        }
    }
    
    // 離開房間
    leaveRoom() {
        if (this.socket && this.roomId) {
            this.socket.emit('leaveRoom');
            this.currentRoom = null;
            this.roomId = null;
            this.showScreen('mainMenu');
        }
    }
    
    // 顯示畫面
    showScreen(screenId) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        document.getElementById(screenId).classList.add('active');
        this.currentScreen = screenId;
    }
    
    // 創建房間
    createRoom() {
        const roomName = document.getElementById('roomNameInput').value.trim();
        const playerName = document.getElementById('playerNameInput').value.trim();
        const maxPlayers = document.getElementById('maxPlayersSelect').value;
        const team = document.getElementById('teamSelect').value;
        
        if (!roomName || !playerName) {
            alert('請填寫房間名稱和玩家名稱！');
            return;
        }
        
        this.playerName = playerName;
        this.playerId = this.generatePlayerId();
        this.selectedTeam = team;
        
        this.socket.emit('createRoom', {
            roomName: roomName,
            playerName: playerName,
            maxPlayers: parseInt(maxPlayers),
            playerId: this.playerId,
            team: team
        });
    }
    
    // 加入房間
    joinRoom() {
        const roomId = document.getElementById('roomIdInput').value.trim();
        const playerName = document.getElementById('joinPlayerNameInput').value.trim();
        
        if (!playerName) {
            alert('請填寫玩家名稱！');
            return;
        }
        
        this.playerName = playerName;
        this.playerId = this.generatePlayerId();
        
        this.socket.emit('joinRoom', {
            roomId: roomId,
            playerName: playerName,
            playerId: this.playerId
        });
    }
    
    // 生成玩家 ID
    generatePlayerId() {
        return Math.random().toString(36).substring(2, 11);
    }
    
    // 發送聊天消息
    sendChatMessage() {
        const chatInput = document.getElementById('chatInput');
        const message = chatInput.value.trim();
        
        if (message && this.socket && this.roomId) {
            this.socket.emit('chatMessage', { message });
            chatInput.value = '';
        }
    }
    
    // 顯示聊天消息
    displayChatMessage(data) {
        const chatMessages = document.getElementById('chatMessages');
        const messageDiv = document.createElement('div');
        messageDiv.className = `chat-message ${data.isSystem ? 'system' : ''}`;
        
        const time = new Date(data.timestamp).toLocaleTimeString('zh-TW', {
            hour: '2-digit',
            minute: '2-digit'
        });
        
        messageDiv.innerHTML = `
            <span class="chat-time">[${time}]</span>
            <span class="chat-name">${data.playerName}:</span>
            <span class="chat-text">${data.message}</span>
        `;
        
        chatMessages.appendChild(messageDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
    }
    
    // 更新連接狀態
    updateConnectionStatus(status) {
        // 這裡可以添加連接狀態顯示邏輯
        console.log('連接狀態:', status);
    }
    
    // 初始化遊戲
    initGame() {
        this.setupCanvas();
        this.startGameLoop();
        console.log('遊戲已初始化');
    }
    
    // 設置畫布
    setupCanvas() {
        this.canvas = document.getElementById('gameCanvas');
        if (!this.canvas) {
            console.error('找不到遊戲畫布');
            return;
        }
        
        this.ctx = this.canvas.getContext('2d');
        
        // 滑鼠事件
        this.canvas.addEventListener('mousemove', (e) => {
            const rect = this.canvas.getBoundingClientRect();
            this.mouse.x = e.clientX - rect.left;
            this.mouse.y = e.clientY - rect.top;
        });
        
        this.canvas.addEventListener('mousedown', () => {
            this.mouse.pressed = true;
        });
        
        this.canvas.addEventListener('mouseup', () => {
            this.mouse.pressed = false;
        });
    }
    
    // 開始遊戲循環
    startGameLoop() {
        this.gameLoop = setInterval(() => {
            this.updateGame();
            this.renderGame();
        }, 1000 / 60); // 60 FPS
    }
    
    // 更新遊戲邏輯
    updateGame() {
        if (this.gameState !== 'playing') return;
        
        // 處理玩家移動
        this.handlePlayerMovement();
        
        // 處理射擊
        if (this.mouse.pressed) {
            this.handleShooting();
        }
    }
    
    // 處理玩家移動
    handlePlayerMovement() {
        const moveData = {
            up: this.keys['w'] || this.keys['arrowup'],
            down: this.keys['s'] || this.keys['arrowdown'],
            left: this.keys['a'] || this.keys['arrowleft'],
            right: this.keys['d'] || this.keys['arrowright']
        };
        
        if (moveData.up || moveData.down || moveData.left || moveData.right) {
            this.socket.emit('playerAction', {
                type: 'move',
                data: moveData
            });
        }
        
        // 更新玩家角度
        if (this.player) {
            const angle = Math.atan2(
                this.mouse.y - this.player.y,
                this.mouse.x - this.player.x
            );
            
            this.socket.emit('playerAction', {
                type: 'updateAngle',
                data: { angle }
            });
        }
    }
    
    // 處理射擊
    handleShooting() {
        const now = Date.now();
        if (now - this.lastFireTime < this.gameConfig.fireRate) return;
        
        this.lastFireTime = now;
        
        if (this.player) {
            const angle = Math.atan2(
                this.mouse.y - this.player.y,
                this.mouse.x - this.player.x
            );
            
            this.socket.emit('playerAction', {
                type: 'shoot',
                data: { angle }
            });
        }
    }
    
    // 渲染遊戲
    renderGame() {
        if (!this.ctx) return;
        
        // 清空畫布
        this.ctx.fillStyle = '#2c3e50';
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 渲染障礙物
        this.renderObstacles();
        
        // 渲染玩家
        this.renderPlayers();
        
        // 渲染子彈
        this.renderBullets();
    }
    
    // 渲染障礙物
    renderObstacles() {
        this.ctx.fillStyle = '#34495e';
        this.obstacles.forEach(obstacle => {
            this.ctx.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
        });
    }
    
    // 渲染玩家
    renderPlayers() {
        // 渲染其他玩家
        this.otherPlayers.forEach(player => {
            this.renderPlayer(player);
        });
        
        // 渲染自己
        if (this.player) {
            this.renderPlayer(this.player, true);
        }
    }
    
    // 渲染單個玩家
    renderPlayer(player, isCurrentPlayer = false) {
        this.ctx.save();
        
        // 玩家顏色
        this.ctx.fillStyle = isCurrentPlayer ? '#3498db' : (player.color || '#e74c3c');
        
        // 繪製玩家
        this.ctx.fillRect(player.x, player.y, 30, 30);
        
        // 繪製玩家名稱
        this.ctx.fillStyle = '#ffffff';
        this.ctx.font = '12px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText(player.name, player.x + 15, player.y - 5);
        
        // 繪製生命值條
        const healthWidth = 30 * (player.health / 100);
        this.ctx.fillStyle = '#e74c3c';
        this.ctx.fillRect(player.x, player.y - 10, 30, 4);
        this.ctx.fillStyle = '#2ecc71';
        this.ctx.fillRect(player.x, player.y - 10, healthWidth, 4);
        
        this.ctx.restore();
    }
    
    // 渲染子彈
    renderBullets() {
        this.ctx.fillStyle = '#f39c12';
        this.serverBullets.forEach(bullet => {
            this.ctx.fillRect(bullet.x - 2, bullet.y - 2, 4, 4);
        });
    }
    
    // 從服務器更新遊戲狀態
    updateGameFromServer(gameState) {
        if (gameState.players) {
            this.otherPlayers = [];
            gameState.players.forEach(player => {
                if (player.id === this.playerId) {
                    this.player = player;
                    this.gameData.health = player.health;
                    this.gameData.kills = player.kills;
                    this.gameData.deaths = player.deaths;
                } else {
                    this.otherPlayers.push(player);
                }
            });
        }
        
        if (gameState.bullets) {
            this.serverBullets = gameState.bullets;
        }
        
        if (gameState.obstacles) {
            this.obstacles = gameState.obstacles;
        }
        
        // 更新 UI
        this.updateGameUI();
    }
    
    // 更新遊戲 UI
    updateGameUI() {
        const healthBar = document.getElementById('healthBar');
        const killCount = document.getElementById('killCount');
        const deathCount = document.getElementById('deathCount');
        const gameTimer = document.getElementById('gameTimer');
        
        if (healthBar) {
            healthBar.style.width = `${this.gameData.health}%`;
        }
        
        if (killCount) {
            killCount.textContent = this.gameData.kills;
        }
        
        if (deathCount) {
            deathCount.textContent = this.gameData.deaths;
        }
        
        if (gameTimer) {
            const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
            const remaining = Math.max(0, this.gameConfig.gameTime - elapsed);
            const minutes = Math.floor(remaining / 60);
            const seconds = remaining % 60;
            gameTimer.textContent = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        }
    }
    
    // 結束遊戲並顯示結果
    endGameWithResults(rankings) {
        this.gameState = 'gameOver';
        
        if (this.gameLoop) {
            clearInterval(this.gameLoop);
        }
        
        this.showScreen('gameOverScreen');
        this.displayGameResults(rankings);
    }
    
    // 顯示遊戲結果
    displayGameResults(rankings) {
        const finalResults = document.getElementById('finalResults');
        if (!finalResults) return;
        
        let resultsHTML = '<h3>🏆 遊戲結果</h3>';
        
        rankings.forEach((player, index) => {
            const medal = index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : '🏅';
            const kd = player.gameData.deaths > 0 
                ? (player.gameData.kills / player.gameData.deaths).toFixed(2) 
                : player.gameData.kills.toString();
            
            resultsHTML += `
                <div class="result-item ${player.id === this.playerId ? 'current-player' : ''}">
                    <span style="font-size: 1.2rem;">
                        ${medal} ${index + 1}. ${player.name}${player.id === this.playerId ? ' (你)' : ''}
                    </span>
                    <span style="font-weight: bold;">
                        ${player.gameData.kills}/${player.gameData.deaths} (${kd})
                    </span>
                </div>
            `;
        });
        
        finalResults.innerHTML = resultsHTML;
    }
    
    // 隊伍選擇功能
    selectTeam(team) {
        this.selectedTeam = team;
        
        // 更新 UI
        document.querySelectorAll('.team-btn').forEach(btn => {
            btn.classList.remove('selected');
        });
        document.getElementById(`team${team.charAt(0).toUpperCase() + team.slice(1)}Btn`).classList.add('selected');
        
        const teamNames = {
            red: '🔴 紅隊',
            blue: '🔵 藍隊', 
            green: '🟢 綠隊',
            yellow: '🟡 黃隊'
        };
        
        document.getElementById('currentTeam').textContent = teamNames[team];
        
        // 通知服務器
        if (this.socket && this.roomId) {
            this.socket.emit('selectTeam', { team });
        }
    }
    
    // 開發者模式功能
    showDeveloperModal() {
        document.getElementById('developerModal').classList.add('active');
    }
    
    closeDeveloperModal() {
        document.getElementById('developerModal').classList.remove('active');
        document.getElementById('developerPassword').value = '';
    }
    
    loginDeveloper() {
        const password = document.getElementById('developerPassword').value;
        if (password === 'P@ssw0rd') {
            this.closeDeveloperModal();
            this.isDeveloper = true;
            this.showScreen('developerPanel');
            this.loadDeveloperData();
        } else {
            alert('密碼錯誤！');
        }
    }
    
    loadDeveloperData() {
        this.socket.emit('getDeveloperData');
    }
    
    deleteAllRooms() {
        if (confirm('確定要刪除所有房間嗎？')) {
            this.socket.emit('deleteAllRooms');
        }
    }
    
    viewAllRooms() {
        this.socket.emit('getAllRooms');
    }
    
    spectateRoom(roomId) {
        this.socket.emit('spectateRoom', { roomId });
    }
    
    // 更新玩家隊伍顯示
    updatePlayerTeam(playerId, team) {
        // 更新房間中的玩家列表顯示
        this.updateRoomInfo();
    }
    
    // 顯示開發者數據
    displayDeveloperData(data) {
        const spectateContainer = document.getElementById('spectateRoomsList');
        let html = '<h4>可觀戰房間</h4>';
        
        data.rooms.forEach(room => {
            html += `
                <div class="spectate-room-item" onclick="game.spectateRoom('${room.id}')">
                    <strong>${room.name}</strong>
                    <br>玩家: ${room.players.size}/${room.maxPlayers}
                    <br>狀態: ${room.gameState}
                </div>
            `;
        });
        
        if (data.rooms.length === 0) {
            html += '<p>目前沒有房間</p>';
        }
        
        spectateContainer.innerHTML = html;
    }
    
    // 顯示可觀戰房間
    displaySpectateRooms(rooms) {
        this.displayDeveloperData({ rooms });
    }
    
    // 開始觀戰
    startSpectating(room) {
        this.currentRoom = room;
        this.gameState = 'spectating';
        this.showScreen('gameScreen');
        // 這裡可以添加觀戰模式的特殊 UI
    }
    
    // 顯示房間列表
    displayRoomList(rooms) {
        const roomsContainer = document.getElementById('availableRooms');
        if (!roomsContainer) return;
        
        if (rooms.length === 0) {
            roomsContainer.innerHTML = '<div class="no-rooms">目前沒有可用房間</div>';
            return;
        }
        
        let roomsHTML = '';
        rooms.forEach(room => {
            roomsHTML += `
                <div class="room-item" onclick="game.quickJoinRoom('${room.id}')">
                    <div class="room-name">${room.name}</div>
                    <div class="room-info">
                        <span class="room-players">${room.players}/${room.maxPlayers} 人</span>
                        <span class="room-id">ID: ${room.id}</span>
                    </div>
                </div>
            `;
        });
        
        roomsContainer.innerHTML = roomsHTML;
    }
    
    // 快速加入房間
    quickJoinRoom(roomId) {
        const playerName = prompt('請輸入你的名稱：');
        if (playerName) {
            this.playerName = playerName;
            this.playerId = this.generatePlayerId();
            
            this.socket.emit('joinRoom', {
                roomId: roomId,
                playerName: playerName,
                playerId: this.playerId
            });
        }
    }
}

// 初始化遊戲
const game = new MultiplayerShooterGame();