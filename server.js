const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});

const PORT = process.env.PORT || 3000;

// 中間件
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 遊戲狀態管理
class GameServer {
    constructor() {
        this.rooms = new Map();
        this.players = new Map();
        this.gameLoops = new Map();
    }

    createRoom(roomData) {
        const roomId = this.generateRoomId();
        const room = {
            id: roomId,
            name: roomData.name,
            maxPlayers: roomData.maxPlayers || 4,
            players: new Map(),
            gameState: 'waiting', // waiting, playing, finished
            gameData: {
                startTime: null,
                duration: 180, // 3分鐘
                bullets: [],
                powerUps: [],
                obstacles: this.generateObstacles()
            },
            host: roomData.hostId
        };
        
        this.rooms.set(roomId, room);
        console.log(`房間已創建: ${roomId} - ${roomData.name}`);
        return room;
    }

    joinRoom(roomId, playerData) {
        const room = this.rooms.get(roomId);
        if (!room) return null;
        
        if (room.players.size >= room.maxPlayers) {
            return { error: '房間已滿' };
        }

        const player = {
            id: playerData.id,
            name: playerData.name,
            socketId: playerData.socketId,
            ready: false,
            team: playerData.team || null,
            gameData: {
                x: Math.random() * 740 + 30,
                y: Math.random() * 540 + 30,
                health: 100,
                kills: 0,
                deaths: 0,
                angle: 0,
                lastShot: 0,
                color: this.getPlayerColor(room.players.size)
            }
        };

        room.players.set(playerData.id, player);
        this.players.set(playerData.socketId, { roomId, playerId: playerData.id });
        
        console.log(`玩家 ${playerData.name} 加入房間 ${roomId}`);
        return room;
    }

    getPlayerColor(playerIndex) {
        const colors = ['#ff6600', '#0066ff', '#00ff66', '#ff0066', '#ffff00', '#ff00ff'];
        return colors[playerIndex % colors.length];
    }

    leaveRoom(socketId) {
        const playerInfo = this.players.get(socketId);
        if (!playerInfo) return;

        const room = this.rooms.get(playerInfo.roomId);
        if (room) {
            room.players.delete(playerInfo.playerId);
            
            // 如果房間空了，刪除房間
            if (room.players.size === 0) {
                this.stopGameLoop(playerInfo.roomId);
                this.rooms.delete(playerInfo.roomId);
                console.log(`房間 ${playerInfo.roomId} 已刪除`);
            } else {
                // 如果離開的是房主，轉移房主權限
                if (room.host === playerInfo.playerId) {
                    const newHost = Array.from(room.players.keys())[0];
                    room.host = newHost;
                }
            }
        }
        
        this.players.delete(socketId);
    }

    startGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.gameState !== 'waiting') return false;

        room.gameState = 'playing';
        room.gameData.startTime = Date.now();
        
        // 重置玩家位置和狀態
        room.players.forEach(player => {
            player.gameData.x = Math.random() * 740 + 30;
            player.gameData.y = Math.random() * 540 + 30;
            player.gameData.health = 100;
            player.gameData.kills = 0;
            player.gameData.deaths = 0;
        });

        // 清空子彈
        room.gameData.bullets = [];
        
        // 開始遊戲循環
        this.startGameLoop(roomId);
        
        console.log(`遊戲開始: 房間 ${roomId}`);
        return true;
    }

    startGameLoop(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const gameLoop = setInterval(() => {
            this.updateGame(roomId);
        }, 1000 / 60); // 60 FPS

        this.gameLoops.set(roomId, gameLoop);

        // 設定遊戲結束計時器
        setTimeout(() => {
            this.endGame(roomId);
        }, room.gameData.duration * 1000);
    }

    stopGameLoop(roomId) {
        const gameLoop = this.gameLoops.get(roomId);
        if (gameLoop) {
            clearInterval(gameLoop);
            this.gameLoops.delete(roomId);
        }
    }

    updateGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.gameState !== 'playing') return;

        // 更新子彈位置
        room.gameData.bullets = room.gameData.bullets.filter(bullet => {
            bullet.x += bullet.vx;
            bullet.y += bullet.vy;

            // 檢查邊界
            if (bullet.x < 0 || bullet.x > 800 || bullet.y < 0 || bullet.y > 600) {
                return false;
            }

            // 檢查與玩家碰撞
            let hit = false;
            const shooter = room.players.get(bullet.ownerId);
            
            room.players.forEach(player => {
                // 檢查是否為同隊伍（同隊不能互相傷害）
                const isSameTeam = shooter && player.team && shooter.team && 
                                 player.team === shooter.team;
                
                if (player.id !== bullet.ownerId && 
                    player.gameData.health > 0 && 
                    !isSameTeam) {
                    
                    const dx = bullet.x - (player.gameData.x + 15);
                    const dy = bullet.y - (player.gameData.y + 15);
                    const distance = Math.sqrt(dx * dx + dy * dy);
                    
                    if (distance < 20) {
                        player.gameData.health -= bullet.damage;
                        hit = true;
                        
                        if (player.gameData.health <= 0) {
                            player.gameData.deaths++;
                            player.gameData.health = 100;
                            
                            // 增加射擊者擊殺數
                            if (shooter) {
                                shooter.gameData.kills++;
                            }
                            
                            // 重生
                            player.gameData.x = Math.random() * 740 + 30;
                            player.gameData.y = Math.random() * 540 + 30;
                        }
                    }
                }
            });

            // 檢查與障礙物碰撞
            const hitObstacle = room.gameData.obstacles.some(obstacle => {
                return bullet.x >= obstacle.x && bullet.x <= obstacle.x + obstacle.width &&
                       bullet.y >= obstacle.y && bullet.y <= obstacle.y + obstacle.height;
            });

            return !hit && !hitObstacle;
        });

        // 廣播遊戲狀態
        this.broadcastGameState(roomId);
    }

    endGame(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        room.gameState = 'finished';
        this.stopGameLoop(roomId);
        
        // 計算最終排名
        const rankings = Array.from(room.players.values())
            .sort((a, b) => {
                const aKD = a.gameData.deaths > 0 ? a.gameData.kills / a.gameData.deaths : a.gameData.kills;
                const bKD = b.gameData.deaths > 0 ? b.gameData.kills / b.gameData.deaths : b.gameData.kills;
                return bKD - aKD;
            });

        io.to(roomId).emit('gameEnded', { rankings });
        console.log(`遊戲結束: 房間 ${roomId}`);
    }

    handlePlayerAction(socketId, action) {
        const playerInfo = this.players.get(socketId);
        if (!playerInfo) return;

        const room = this.rooms.get(playerInfo.roomId);
        const player = room?.players.get(playerInfo.playerId);
        
        if (!room || !player || room.gameState !== 'playing') return;

        switch (action.type) {
            case 'move':
                this.handlePlayerMove(player, action.data);
                break;
            case 'shoot':
                this.handlePlayerShoot(room, player, action.data);
                break;
            case 'updateAngle':
                player.gameData.angle = action.data.angle;
                break;
        }
    }

    handlePlayerMove(player, moveData) {
        const speed = 5;
        let newX = player.gameData.x;
        let newY = player.gameData.y;

        if (moveData.up) newY = Math.max(0, newY - speed);
        if (moveData.down) newY = Math.min(570, newY + speed);
        if (moveData.left) newX = Math.max(0, newX - speed);
        if (moveData.right) newX = Math.min(770, newX + speed);

        player.gameData.x = newX;
        player.gameData.y = newY;
    }

    handlePlayerShoot(room, player, shootData) {
        const now = Date.now();
        if (now - player.gameData.lastShot < 200) return; // 射擊冷卻

        player.gameData.lastShot = now;

        const bullet = {
            id: Math.random().toString(36).substring(2, 11),
            x: player.gameData.x + 15,
            y: player.gameData.y + 15,
            vx: Math.cos(shootData.angle) * 10,
            vy: Math.sin(shootData.angle) * 10,
            ownerId: player.id,
            damage: 25,
            createdAt: now
        };

        room.gameData.bullets.push(bullet);
    }

    // 添加 AI 玩家
    addAiPlayer(roomId) {
        const room = this.rooms.get(roomId);
        if (!room || room.players.size >= room.maxPlayers) return;
        
        const aiId = 'ai_' + Math.random().toString(36).substring(2, 11);
        const aiNames = ['機器人Alpha', '機器人Beta', '機器人Gamma', '機器人Delta'];
        const aiName = aiNames[Math.floor(Math.random() * aiNames.length)];
        
        const aiPlayer = {
            id: aiId,
            name: aiName,
            socketId: null,
            ready: true,
            isAI: true,
            team: ['red', 'blue', 'green', 'yellow'][Math.floor(Math.random() * 4)],
            gameData: {
                x: Math.random() * 740 + 30,
                y: Math.random() * 540 + 30,
                health: 100,
                kills: 0,
                deaths: 0,
                angle: 0,
                lastShot: 0,
                color: this.getPlayerColor(room.players.size)
            }
        };
        
        room.players.set(aiId, aiPlayer);
        console.log(`AI 玩家 ${aiName} 加入房間 ${roomId}`);
        
        // 啟動 AI 行為
        this.startAiBehavior(roomId, aiId);
    }
    
    // AI 行為邏輯
    startAiBehavior(roomId, aiId) {
        const aiInterval = setInterval(() => {
            const room = this.rooms.get(roomId);
            const aiPlayer = room?.players.get(aiId);
            
            if (!room || !aiPlayer || room.gameState !== 'playing') {
                clearInterval(aiInterval);
                return;
            }
            
            // 簡單的 AI 移動邏輯
            const moveChance = Math.random();
            if (moveChance < 0.3) {
                const direction = Math.random() * Math.PI * 2;
                const speed = 3;
                
                let newX = aiPlayer.gameData.x + Math.cos(direction) * speed;
                let newY = aiPlayer.gameData.y + Math.sin(direction) * speed;
                
                // 邊界檢查
                newX = Math.max(0, Math.min(770, newX));
                newY = Math.max(0, Math.min(570, newY));
                
                aiPlayer.gameData.x = newX;
                aiPlayer.gameData.y = newY;
            }
            
            // AI 射擊邏輯 - 尋找最近的敵對玩家
            const nearestEnemy = this.findNearestEnemy(room, aiPlayer);
            if (nearestEnemy && Math.random() < 0.1) { // 10% 機率射擊
                const angle = Math.atan2(
                    nearestEnemy.gameData.y - aiPlayer.gameData.y,
                    nearestEnemy.gameData.x - aiPlayer.gameData.x
                );
                
                aiPlayer.gameData.angle = angle;
                this.handlePlayerShoot(room, aiPlayer, { angle });
            }
        }, 100);
    }
    
    // 尋找最近的敵對玩家
    findNearestEnemy(room, aiPlayer) {
        let nearestEnemy = null;
        let minDistance = Infinity;
        
        room.players.forEach(player => {
            if (player.id !== aiPlayer.id && 
                player.gameData.health > 0 && 
                player.team !== aiPlayer.team) {
                
                const distance = Math.sqrt(
                    Math.pow(player.gameData.x - aiPlayer.gameData.x, 2) +
                    Math.pow(player.gameData.y - aiPlayer.gameData.y, 2)
                );
                
                if (distance < minDistance && distance < 200) { // 200px 射程
                    minDistance = distance;
                    nearestEnemy = player;
                }
            }
        });
        
        return nearestEnemy;
    }
    
    // 踢人功能
    kickPlayer(roomId, kickedPlayerId, hostSocketId) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        const kickedPlayer = room.players.get(kickedPlayerId);
        if (!kickedPlayer) return;
        
        // 找到被踢玩家的 socket
        let kickedSocketId = null;
        this.players.forEach((playerInfo, socketId) => {
            if (playerInfo.playerId === kickedPlayerId && playerInfo.roomId === roomId) {
                kickedSocketId = socketId;
            }
        });
        
        // 從房間移除玩家
        room.players.delete(kickedPlayerId);
        if (kickedSocketId) {
            this.players.delete(kickedSocketId);
        }
        
        // 通知所有玩家
        io.to(roomId).emit('playerKicked', {
            kickedPlayerId: kickedPlayerId,
            kickedPlayerName: kickedPlayer.name,
            isAI: kickedPlayer.isAI
        });
        
        // 通知被踢的玩家（只有真人玩家需要通知）
        if (kickedSocketId && !kickedPlayer.isAI) {
            io.to(kickedSocketId).emit('playerKicked', {
                kickedPlayerId: kickedPlayerId,
                kickedPlayerName: kickedPlayer.name,
                isAI: false
            });
        }
        
        // 廣播房間更新
        const roomData = {
            id: room.id,
            name: room.name,
            maxPlayers: room.maxPlayers,
            host: room.host,
            players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                ready: p.ready,
                team: p.team,
                isAI: p.isAI
            }))
        };
        
        io.to(roomId).emit('roomUpdated', roomData);
        
        // 發送聊天消息
        const actionText = kickedPlayer.isAI ? '移除' : '踢出';
        io.to(roomId).emit('chatMessage', {
            playerName: '系統',
            message: `${kickedPlayer.isAI ? '🤖' : '👤'} ${kickedPlayer.name} 被${actionText}房間`,
            timestamp: Date.now(),
            isSystem: true
        });
        
        console.log(`${kickedPlayer.isAI ? 'AI' : '玩家'} ${kickedPlayer.name} 被${actionText}房間 ${roomId}`);
        
        // 如果房間空了，刪除房間
        if (room.players.size === 0) {
            this.rooms.delete(roomId);
            this.stopGameLoop(roomId);
            console.log(`房間 ${roomId} 已刪除（無玩家）`);
        }
    }
    
    // 改變 AI 隊伍
    changeAiTeam(roomId, aiId, team) {
        const room = this.rooms.get(roomId);
        if (!room) return;
        
        const aiPlayer = room.players.get(aiId);
        if (!aiPlayer || !aiPlayer.isAI) return;
        
        // 更新 AI 隊伍
        aiPlayer.team = team;
        
        // 廣播房間更新
        const roomData = {
            id: room.id,
            name: room.name,
            maxPlayers: room.maxPlayers,
            host: room.host,
            players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                ready: p.ready,
                team: p.team,
                isAI: p.isAI
            }))
        };
        
        io.to(roomId).emit('roomUpdated', roomData);
        
        // 發送聊天消息通知
        const teamNames = {
            red: '🔴 紅隊',
            blue: '🔵 藍隊',
            green: '🟢 綠隊',
            yellow: '🟡 黃隊'
        };
        
        io.to(roomId).emit('chatMessage', {
            playerName: '系統',
            message: `🤖 ${aiPlayer.name} 已切換到 ${teamNames[team]}`,
            timestamp: Date.now(),
            isSystem: true
        });
        
        console.log(`AI 玩家 ${aiPlayer.name} 在房間 ${roomId} 切換到隊伍 ${team}`);
    }
    
    // 開發者功能
    deleteAllRooms() {
        this.rooms.forEach((room, roomId) => {
            this.stopGameLoop(roomId);
        });
        this.rooms.clear();
        this.players.clear();
        console.log('所有房間已被開發者刪除');
    }

    broadcastGameState(roomId) {
        const room = this.rooms.get(roomId);
        if (!room) return;

        const gameState = {
            players: Array.from(room.players.values()).map(p => ({
                id: p.id,
                name: p.name,
                x: p.gameData.x,
                y: p.gameData.y,
                health: p.gameData.health,
                kills: p.gameData.kills,
                deaths: p.gameData.deaths,
                angle: p.gameData.angle,
                color: p.gameData.color
            })),
            bullets: room.gameData.bullets,
            obstacles: room.gameData.obstacles,
            gameTime: room.gameData.startTime ? 
                Math.floor((Date.now() - room.gameData.startTime) / 1000) : 0
        };

        io.to(roomId).emit('gameState', gameState);
    }

    generateObstacles() {
        const obstacles = [];
        const obstacleTypes = [
            { emoji: '🟫', size: 40 },
            { emoji: '🌳', size: 35 },
            { emoji: '🪨', size: 30 },
            { emoji: '🏠', size: 45 }
        ];

        for (let i = 0; i < 12; i++) {
            const type = obstacleTypes[Math.floor(Math.random() * obstacleTypes.length)];
            obstacles.push({
                x: Math.random() * (800 - type.size),
                y: Math.random() * (600 - type.size),
                width: type.size,
                height: type.size,
                emoji: type.emoji
            });
        }

        return obstacles;
    }

    generateRoomId() {
        return Math.random().toString(36).substring(2, 8).toUpperCase();
    }

    getRoomList() {
        return Array.from(this.rooms.values())
            .filter(room => room.gameState === 'waiting' && room.players.size < room.maxPlayers)
            .map(room => ({
                id: room.id,
                name: room.name,
                players: room.players.size,
                maxPlayers: room.maxPlayers
            }));
    }
}

const gameServer = new GameServer();

// Socket.IO 連接處理
io.on('connection', (socket) => {
    console.log(`玩家連接: ${socket.id}`);

    // 創建房間
    socket.on('createRoom', (data) => {
        const roomData = {
            name: data.roomName,
            maxPlayers: data.maxPlayers,
            hostId: data.playerId
        };
        
        const room = gameServer.createRoom(roomData);
        
        // 房主自動加入房間
        const playerData = {
            id: data.playerId,
            name: data.playerName,
            socketId: socket.id,
            team: data.team
        };
        
        gameServer.joinRoom(room.id, playerData);
        socket.join(room.id);
        
        socket.emit('roomCreated', {
            roomId: room.id,
            room: {
                id: room.id,
                name: room.name,
                maxPlayers: room.maxPlayers,
                host: room.host,
                players: Array.from(room.players.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    ready: p.ready,
                    team: p.team,
                    isAI: p.isAI
                }))
            }
        });
    });

    // 加入房間
    socket.on('joinRoom', (data) => {
        const result = gameServer.joinRoom(data.roomId, {
            id: data.playerId,
            name: data.playerName,
            socketId: socket.id
        });

        if (result && !result.error) {
            socket.join(data.roomId);
            
            const roomData = {
                id: result.id,
                name: result.name,
                maxPlayers: result.maxPlayers,
                host: result.host,
                players: Array.from(result.players.values()).map(p => ({
                    id: p.id,
                    name: p.name,
                    ready: p.ready,
                    team: p.team,
                    isAI: p.isAI
                }))
            };
            
            socket.emit('roomJoined', { room: roomData });
            socket.to(data.roomId).emit('playerJoined', {
                player: {
                    id: data.playerId,
                    name: data.playerName,
                    ready: false
                }
            });
        } else {
            socket.emit('joinError', { message: result?.error || '無法加入房間' });
        }
    });

    // 獲取房間列表
    socket.on('getRoomList', () => {
        socket.emit('roomList', gameServer.getRoomList());
    });

    // 玩家準備
    socket.on('playerReady', (data) => {
        const playerInfo = gameServer.players.get(socket.id);
        if (playerInfo) {
            const room = gameServer.rooms.get(playerInfo.roomId);
            const player = room?.players.get(playerInfo.playerId);
            if (player) {
                player.ready = data.ready;
                io.to(playerInfo.roomId).emit('playerReadyUpdate', {
                    playerId: playerInfo.playerId,
                    ready: data.ready
                });
            }
        }
    });

    // 開始遊戲
    socket.on('startGame', () => {
        const playerInfo = gameServer.players.get(socket.id);
        if (playerInfo) {
            const room = gameServer.rooms.get(playerInfo.roomId);
            if (room && room.host === playerInfo.playerId) {
                if (gameServer.startGame(playerInfo.roomId)) {
                    io.to(playerInfo.roomId).emit('gameStarted');
                }
            }
        }
    });

    // 玩家動作
    socket.on('playerAction', (action) => {
        gameServer.handlePlayerAction(socket.id, action);
    });

    // 聊天訊息
    socket.on('chatMessage', (data) => {
        const playerInfo = gameServer.players.get(socket.id);
        if (playerInfo) {
            const room = gameServer.rooms.get(playerInfo.roomId);
            const player = room?.players.get(playerInfo.playerId);
            if (player) {
                io.to(playerInfo.roomId).emit('chatMessage', {
                    playerName: player.name,
                    message: data.message,
                    timestamp: Date.now()
                });
            }
        }
    });

    // 隊伍選擇
    socket.on('selectTeam', (data) => {
        const playerInfo = gameServer.players.get(socket.id);
        if (playerInfo) {
            const room = gameServer.rooms.get(playerInfo.roomId);
            const player = room?.players.get(playerInfo.playerId);
            if (player) {
                player.team = data.team;
                io.to(playerInfo.roomId).emit('playerTeamChanged', {
                    playerId: player.id,
                    team: data.team
                });
            }
        }
    });
    
    // 添加 AI 玩家
    socket.on('addAiPlayer', () => {
        const playerInfo = gameServer.players.get(socket.id);
        if (playerInfo) {
            const room = gameServer.rooms.get(playerInfo.roomId);
            if (room && room.players.size < room.maxPlayers) {
                gameServer.addAiPlayer(playerInfo.roomId);
                
                // 廣播房間更新
                const roomData = {
                    id: room.id,
                    name: room.name,
                    maxPlayers: room.maxPlayers,
                    host: room.host,
                    players: Array.from(room.players.values()).map(p => ({
                        id: p.id,
                        name: p.name,
                        ready: p.ready,
                        team: p.team,
                        isAI: p.isAI
                    }))
                };
                
                io.to(playerInfo.roomId).emit('roomUpdated', roomData);
                
                // 發送聊天消息通知
                io.to(playerInfo.roomId).emit('chatMessage', {
                    playerName: '系統',
                    message: `🤖 AI 玩家已加入房間`,
                    timestamp: Date.now(),
                    isSystem: true
                });
            }
        }
    });
    
    // 開發者功能
    socket.on('getDeveloperData', () => {
        socket.emit('developerData', {
            rooms: Array.from(gameServer.rooms.values()),
            totalPlayers: gameServer.players.size
        });
    });
    
    socket.on('deleteAllRooms', () => {
        gameServer.deleteAllRooms();
        io.emit('allRoomsDeleted');
    });
    
    socket.on('getAllRooms', () => {
        socket.emit('allRoomsData', Array.from(gameServer.rooms.values()));
    });
    
    socket.on('spectateRoom', (data) => {
        const room = gameServer.rooms.get(data.roomId);
        if (room) {
            socket.join(data.roomId);
            // 通知房間內的玩家有開發者進入觀戰
            io.to(data.roomId).emit('chatMessage', {
                playerName: '系統',
                message: '🔧 開發者進入房間觀戰',
                timestamp: Date.now(),
                isSystem: true
            });
            socket.emit('spectateStarted', { room });
        }
    });
    
    // 踢人功能
    socket.on('kickPlayer', (data) => {
        const playerInfo = gameServer.players.get(socket.id);
        if (playerInfo) {
            const room = gameServer.rooms.get(playerInfo.roomId);
            if (room && room.host === playerInfo.playerId) {
                // 只有房主可以踢人
                gameServer.kickPlayer(playerInfo.roomId, data.playerId, socket.id);
            }
        }
    });
    
    // 改變 AI 隊伍
    socket.on('changeAiTeam', (data) => {
        const playerInfo = gameServer.players.get(socket.id);
        if (playerInfo) {
            const room = gameServer.rooms.get(playerInfo.roomId);
            if (room && room.host === playerInfo.playerId) {
                // 只有房主可以改變 AI 隊伍
                gameServer.changeAiTeam(playerInfo.roomId, data.aiId, data.team);
            }
        }
    });

    // 斷線處理
    socket.on('disconnect', () => {
        console.log(`玩家斷線: ${socket.id}`);
        gameServer.leaveRoom(socket.id);
    });
});

// 健康檢查端點
app.get('/health', (req, res) => {
    res.status(200).json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        rooms: gameServer.rooms.size,
        players: gameServer.players.size
    });
});

// 靜態檔案路由
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 啟動服務器
server.listen(PORT, () => {
    console.log(`🎮 多人遊戲服務器運行在端口 ${PORT}`);
    console.log(`🌐 訪問: http://localhost:${PORT}`);
});