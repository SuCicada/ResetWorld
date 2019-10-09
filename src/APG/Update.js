console.log("Update.js has been loaded successfully.")

/* ================ update ==============================*/
/**
 * @class APG.Update.listenKey
 */
APG.Update.listenKey;

/**
 * 按键无效
 * @method APG.Update.listenKey#stopListenKey
 */
APG.Update.listenKey.stopListenKey = function(){
    game.input.keyboard.stop();
};

/**
 * 开启按键监听功能
 * @method APG.Update.listenKey#startListenKey
 */
APG.Update.listenKey.startListenKey = function(){
    game.input.keyboard.start();
};

/**
 * 修改移动按键
 * @method APG.Update.listenKey#setMoveKey
 * @param {string} direction - 方向`up`，`down`，`left`，`right`
 * @param {string} key - 按键
 */
APG.Update.listenKey.setMoveKey = function(direction, key){
    var direction = direction.toUpperCase();
    var key = key.toUpperCase();
    APG.Keys.move[direction] = key;
};

/**
 * 添加按键功能
 * @method APG.Update.listenKey#addKeyEvent
 * @param {string} key - 按键
 * @param {function} feedback - 功能函数
 * @param {Array} context - 函数传入的参数
 * @param {{}} [that = APG.DeveloperModel] - 回调上下文
 */
APG.Update.listenKey.addKeyEvent = function(key, feedback, context, that=APG.DeveloperModel){
    APG.Update.listenKey.keyEventList.push({
        key: key,
        feedback: feedback,
        context: context,
        that: that,
    });
};

/**
 * 角色移动相关事件。
 * @method APG.Update.listenKey#characterMoveEvent
 * @param {Phaser.Group} playerG - 角色组
 * @param {function} role - 移动判断函数
 * @param {function} resolve - 移动成功执行函数,
 * @param {Array} resolveContext - 成功函数传入的参数
 * @param {function} reject - 移动失败执行函数
 * @param {Array} rejectContext - 失败函数传入的参数
 * @param {{}} [that = APG.DeveloperModel] - 回调上下文
 */
APG.Update.listenKey.characterMoveEvent = function(playerG, role, resolve, resolveContext, reject, rejectContext, that=APG.DeveloperModel, secretKey) {
    for (var k in APG.Keys.move) {
        if (APG.Keys[APG.Keys.move[k]].justDown || k == secretKey) {
            console.log(k+" is justDown.")
            var playerGroup = playerG;
            var player = APG.Character.getCharacterSprite(playerGroup);

            /* 设置方向 */
            player.direction.x = APG.UDLRDir[k].x;
            player.direction.y = APG.UDLRDir[k].y;

            var nowSite = APG.Character.getCharacterSite(player);

            /* 预设新的相对坐标 */
            var newX = nowSite.x + player.direction.x;
            var newY = nowSite.y + player.direction.y;
            let newSite = {x:newX, y:newY};
            {
                //  ====== 检测玩家是否可走 =====
                var canMove = true;
                /* 地图超出 */
                if (APG.Update.collideWorldBounds) {
                    if (newX < 0 || newY < 0 || newX >= APG.MapArea.rows || newY >= APG.MapArea.columns) {
                        canMove = false;
                    }
                }
                /* 检测组碰撞 */
                APG.Update.collision.block.playerGroupList.forEach(
                    function (object) {
                        if (object.group) {
                            object.group.forEach(function (sprite) {
                                let site = APG.Sprite.getSpriteSite(sprite);
                                if (site.x == newSite.x && site.y == newSite.y) {
                                    canMove = false;
                                    if (object.feedback) {
                                        object.feedback.apply(that, [playerGroup, sprite]);
                                    }
                                }
                            })
                        }
                    });

                /* 检测砖块碰撞 */
                APG.Update.collision.block.playerTileList.forEach(
                    function (object) {
                        var tile = APG.Tile.getTileFromSite(newX, newY);
                        if ((tile && tile.index == object.tileIndex) ||
                            (!tile && object.tileIndex == 0)) {
                            canMove = false;
                            if (object.feedback) {
                                object.feedback.apply(that, [playerGroup, sprite]);
                            }
                        }
                    });

                /* 调用用户自定义规则,根据返回值判断能否走,
                 * 可以覆盖以上规则 (?合适不)
                 * 如果没有返回值, 则canMove不变
                 */
                if (role) {
                    var flag = role.apply(that,[newX, newY]);
                    canMove = flag == undefined ? canMove : flag;
                }

                /* 无论能不能走, 都变化方向动画 */
                if(playerGroup.Assets && playerGroup.Assets.move[k]){
                    APG.Assets.setAnimations(playerGroup, k,playerGroup.Assets.move[k], 1);
                }
                if (canMove) {
                    console.log('player move from ' + nowSite.x + ", " + nowSite.y + " to " + newX + ", " + newY);
                    APG.Character.setCharacterSite(playerGroup, newX, newY);
                    if (resolve) {
                        resolve.apply(that, resolveContext);
                    }
                } else {
                    console.log('player can\'t move.');
                    if (reject) {
                        reject.apply(that, rejectContext);
                    }
                }
            }
        }
    }
};


/*APG.Update.collideWorldBounds = false;*/
/**
 * @class APG.Update.collision
 */
APG.Update.collision;

/**
 * 边界碰撞，默认不开，用于玩家移动检测。
 * @method APG.Update.collision#setCollideWorldBounds
 * @param {boolean} [f = false]
 */
APG.Update.collision.setCollideWorldBounds = function(f){
    APG.Update.collideWorldBounds = f;
};

/*APG.Update.collision = {};*/
/* 碰撞检测之禁止覆盖 */
APG.Update.collision.block = {
    GroupList: [],        /* 需要检测的团队列表 */
    TileList: [],         /* 需要检测的瓷砖列表 */
    playerGroupList: [],  /* 需要检测的团队列表（对于玩家） */
    playerTileList: [],   /* 需要检测的瓷砖列表（对于玩家） */
};

/* 碰撞检测之覆盖后果 */
APG.Update.collision.active = {
    GroupList: [],        /* 需要检测的团队列表 */
    TileList: [],         /* 需要检测的瓷砖列表 */
    playerGroupList: [],  /* 需要检测的团队列表（对于玩家） */
    playerTileList: [],   /* 需要检测的瓷砖列表（对于玩家） */
};

/**
 * 设置组对象和瓷砖的阻挡碰撞
 * @method APG.Update.collision#blockTileOverlap
 * @param {Phaser.Group} group
 * @param {integer} tileIndex - 瓷砖id
 * @param {function} [feedback] - 碰撞后的触发函数
 * @param {Array} context - 函数参数
 * @param {{}} [that = APG.DeveloperModel] - 回调上下文
 */
APG.Update.collision.blockTileOverlap = function(group, tileIndex, feedback, context, that=APG.DeveloperModel){
    if(group == APG.CharacterGroups.player){
        APG.Update.collision.block.playerTileList.push({
            tileIndex: tileIndex,
            feedback: feedback,
            context: context,
            that: that,
        });
    }else{
        APG.Update.collision.block.TileList.push({
            group: group,
            tileIndex: tileIndex,
            feedback: feedback,
            context: context,
            that: that,
        });
    }
};

/**
 * 设置组对象和组对象的阻挡碰撞
 * @method APG.Update.collision#blockGroupOverlap
 * @param {Phaser.Group} group1
 * @param {Phaser.Group} group2
 * @param {function} [feedback] - 碰撞后的触发函数
 * @param {Array} context - 函数参数
 * @param {{}} [that = APG.DeveloperModel] - 回调上下文
 */
APG.Update.collision.blockGroupOverlap = function(group1, group2, feedback, context, that=APG.DeveloperModel) {
    if (group1 == APG.CharacterGroups.player) {
        APG.Update.collision.block.playerGroupList.push({
            group: group2,
            feedback: feedback,
            context: context,
            that: that,
        });
    }else{
        APG.Update.collision.block.GroupList.push({
            group1: group1,
            group2: group2,
            feedback: feedback,
            // isCollided: false,
            context: context,
            that: that,
        });
    }
};

/**
 * 设置组对象和组对象的重叠检测
 * @method APG.Update.collision#activeGroupOverlap
 * @param {Phaser.Group} group1
 * @param {Phaser.Group} group2
 * @param {function} [feedback] - 碰撞后的触发函数
 * @param {Array} context - 函数参数
 * @param {{}} [that = APG.DeveloperModel] - 回调上下文
 */
APG.Update.collision.activeGroupOverlap = function(group1, group2, feedback, context, that=APG.DeveloperModel){
    var obj = {
        actor: "",
        feedback: feedback,
        // isCollided: false,
        context: context,
        that: that,
    };
    obj.group1 = group1;
    obj.group2 = group2;
    if (group1 == APG.CharacterGroups.player) {
        obj.actor = "player";
    }
    APG.Update.collision.active.GroupList.push(obj);
};

/**
 * 设置组对象和瓷砖对象的重叠检测
 * @method APG.Update.collision#activeTileOverlap
 * @param {Phaser.Group} group
 * @param {integer} tileIndex - 瓷砖id
 * @param {function} [feedback] - 碰撞后的触发函数
 * @param {Array} context - 函数参数
 * @param {{}} [that = APG.DeveloperModel] - 回调上下文 * @param group
 */
APG.Update.collision.activeTileOverlap = function(group, tileIndex, feedback, context, that=APG.DeveloperModel){
    if(group == APG.CharacterGroups.player){
        APG.Update.collision.active.TileList.push({
            tileIndex: tileIndex,
            feedback: feedback,
            // isCollided: false,
            context: context,
            that: that,
        });
    }else{
        APG.Update.collision.active.TileList.push({
            group: group,
            tileIndex: tileIndex,
            feedback: feedback,
            // isCollided: false,
            context: context,
            that: that,
        });
    }
};

// =========================
// ========= 施工中 ==========

/**
 * 检测两个对象是否碰撞【未完成】
 * @method APG.Update.collision#isCollided
 * @param {Phaser.Group} group1
 * @param {Phaser.Group} group2
 */
APG.Update.collision.isCollided = function(group1, group2){

};

