/**
 * The visualization controller will works as a state machine.
 * See files under the `doc` folder for transition descriptions.
 * See https://github.com/jakesgordon/javascript-state-machine
 * for the document of the StateMachine module.
 */
var Controller = StateMachine.create({
    initial: 'none',
    events: [
        {
            name: 'init',
            from: 'none',
            to:   'ready'
        },
        {
            name: 'search',
            from: 'starting',
            to:   'searching'
        },
        {
            name: 'search',
            from: 'randomstarting',
            to:   'searching'
        },
        {
            name: 'pause',
            from: 'searching',
            to:   'paused'
        },
        {
            name: 'finish',
            from: 'searching',
            to:   'finished'
        },
        {
            name: 'resume',
            from: 'paused',
            to:   'searching'
        },
        {
            name: 'cancel',
            from: 'paused',
            to:   'ready'
        },
        {
            name: 'modify',
            from: 'finished',
            to:   'modified'
        },
        {
            name: 'reset',
            from: '*',
            to:   'ready'
        },
        {
            name: 'loadpersist',
            from: '*',
            to:   'ready'
        },
        {
            name: 'randompath',
            from: '*',
            to: 'ready'
        },
        {
            name: 'storepersist',
            from: '*',
            to:   'ready'
        },
        {
            name: 'clear',
            from: ['finished', 'modified'],
            to:   'ready'
        },
        {
            name: 'start',
            from: ['ready', 'modified', 'restarting'],
            to:   'starting'
        },
        {
            name: 'restart',
            from: ['searching', 'finished'],
            to:   'restarting'
        },
        {
            name: 'dragStart',
            from: ['ready', 'finished'],
            to:   'draggingStart'
        },
        {
            name: 'dragEnd',
            from: ['ready', 'finished'],
            to:   'draggingEnd'
        },
        {
            name: 'drawWall',
            from: ['ready', 'finished'],
            to:   'drawingWall'
        },
        {
            name: 'drawBlueWall',
            from: ['ready', 'finished'],
            to:   'drawingBlueWall'
        },
        {
            name: 'drawOrangeWall',
            from: ['ready', 'finished'],
            to:   'drawingOrangeWall'
        },
        {
            name: 'eraseWall',
            from: ['ready', 'finished'],
            to:   'erasingWall'
        },
        {
            name: 'rest',
            from: ['draggingStart', 'draggingEnd', 'drawingWall', 'drawingBlueWall', 'drawingOrangeWall', 'erasingWall'],
            to  : 'ready'
        },
    ]
});

window.printGrid = function(g){
    var matrix = "",
        grid = g || window.grid;

    matrix = [];
    for (var x = 0; x < grid.nodes.length; x++){
        matrix.push([]);
        for (var y = 0; y < grid.nodes[0].length; y++){
            if (grid.nodes[x][y].walkable) {
                matrix[x].push(0);
            }else {
                if (grid.nodes[x][y].blue) {
                    matrix[x].push(2);
                } else if (grid.nodes[x][y].orange) {
                    matrix[x].push(3);
                } else {
                    matrix[x].push(1);
                }
            }
            //line += grid.nodes[i][x].walkable? "0,": "1,";
        }
    }
    return matrix;
};

ARandomPath = function ARandomPath(){};

ARandomPath.prototype.findPath = function(startX, startY, endX, endY, grid) {
    var  startNode = grid.getNodeAt(startX, startY),
        endNode = grid.getNodeAt(endX, endY),
        node, neighbors, neighbor, i, l, x, y, ng;

    neighbors = grid.getNeighbors(node, diagonalMovement);
    for (i = 0, l = neighbors.length; i < l; ++i) {
        neighbor = neighbors[i];
        if (neighbor.closed) {
            continue;
        }

        x = neighbor.x;
        y = neighbor.y;

    }

    return [];
};


$.extend(Controller, {
    gridSize: [128, 64], // number of nodes horizontally and vertically
    operationsPerSecond: 300,
    fbInstance: 'https://dazzling-fire-7859.firebaseio.com/', // Prod
    //fbInstance: 'https://paveldemo.firebaseio.com//', // Test
    loadPersist: function(){
        var fireBase = new Firebase(this.fbInstance);
        fireBase.child('myGrid').on('value', function(snapshot){
            var gridPersist = snapshot.val();
            for (var x = 0; x < this.grid.nodes.length;  x++){
                for (var y = 0; y < this.grid.nodes[0].length; y++){
                    switch(gridPersist[x][y]){
                        case 1:
                            this.setWalkableAt(y, x, false);
                            break;
                        case 2:
                            this.setBlueAt(y, x, false);
                            this.grid.nodes[x][y].blue = true;
                            break;
                        case 3:
                            this.setOrangeAt(y, x, false);
                            this.grid.nodes[x][y].orange = true;
                            break;
                    }
                }
            }
        }.bind(this));
        fireBase.child('aStartPoint').on('value', function(snapshot){
            var point = snapshot.val();
            this.setStartPos(point.startX, point.startY);
        }.bind(this));
        fireBase.child('aEndPoint').on('value', function(snapshot){
            var point = snapshot.val();
            this.setEndPos(point.endX, point.endY);
        }.bind(this));
    },
    /**
     * Asynchronous transition from `none` state to `ready` state.
     */
    onleavenone: function() {
        var numCols = this.gridSize[0],
            numRows = this.gridSize[1];

        this.grid = new PF.Grid(numCols, numRows);

        window.grid = this.grid;

        View.init({
            numCols: numCols,
            numRows: numRows
        });
        View.generateGrid(function() {
            Controller.setDefaultStartEndPos();
            Controller.bindEvents();
            Controller.transition(); // transit to the next state (ready)
        });

        this.$buttons = $('.control_button');

        this.hookPathFinding();

        window.that = this;

        return StateMachine.ASYNC;
        // => ready
    },
    ondrawWall: function(event, from, to, gridX, gridY) {
        this.setWalkableAt(gridX, gridY, false);
        // => drawingWall
    },
    ondrawBlueWall: function(event, from, to, gridX, gridY) {
        this.setBlueAt(gridX, gridY);
        delete this.grid.nodes[gridY][gridX].orange;
        this.grid.nodes[gridY][gridX].blue = true
        // => drawingBlueWall
    },
    ondrawOrangeWall: function(event, from, to, gridX, gridY) {
        this.setOrangeAt(gridX, gridY);
        delete this.grid.nodes[gridY][gridX].blue;
        this.grid.nodes[gridY][gridX].orange = true;
        // => drawingOrangeWall
    },
    oneraseWall: function(event, from, to, gridX, gridY) {
        delete this.grid.nodes[gridX][gridY].blue;
        delete this.grid.nodes[gridX][gridY].orange;
        this.setWalkableAt(gridX, gridY, true);

        // => erasingWall
    },

    nextRandomCell: function() {
        var arr = [1,2,3,4,5,6,7,8];
        var newRandArr = [];
        var i, n;
        for (i=0; i < arr.length; i++){
            n = Math.floor(Math.random() * arr.length);
            newRandArr.push(arr.splice(n,1)[0]);
            i--;
        };
        return newRandArr;
    },

    onsearch: function(event, from, to) {
        var grid,
            timeStart, timeEnd,
            finder = Panel.getFinder();

        timeStart = window.performance ? performance.now() : Date.now();
        grid = this.grid.clone();

        this.path = finder.findPath(
            this.startX, this.startY, this.endX, this.endY, grid
        );

        this.operationCount = this.operations.length;
        timeEnd = window.performance ? performance.now() : Date.now();
        this.timeSpent = (timeEnd - timeStart).toFixed(4);

        this.loop();
        // => searching
    },
    onrestart: function() {
        // When clearing the colorized nodes, there may be
        // nodes still animating, which is an asynchronous procedure.
        // Therefore, we have to defer the `abort` routine to make sure
        // that all the animations are done by the time we clear the colors.
        // The same reason applies for the `onreset` event handler.
        setTimeout(function() {
            Controller.clearOperations();
            Controller.clearFootprints();
            Controller.start();
        }, View.nodeColorizeEffect.duration * 1.2);
        // => restarting
    },
    onpause: function(event, from, to) {
        // => paused
    },
    onresume: function(event, from, to) {
        this.loop();
        // => searching
    },
    oncancel: function(event, from, to) {
        this.clearOperations();
        this.clearFootprints();
        // => ready
    },
    onfinish: function(event, from, to) {
        View.showStats({
            pathLength: PF.Util.pathLength(this.path),
            timeSpent:  this.timeSpent,
            operationCount: this.operationCount,
        });
        View.drawPath(this.path);

        // => finished
    },
    onclear: function(event, from, to) {
        this.clearOperations();
        this.clearFootprints();
        // => ready
    },
    onmodify: function(event, from, to) {
        // => modified
    },
    onreset: function(event, from, to) {
        setTimeout(function() {
            Controller.clearOperations();
            Controller.clearAll();
            Controller.buildNewGrid();
        }, View.nodeColorizeEffect.duration * 1.2);
        // => ready
    },

    getCarDirection: function(){
        this.direction = this.direction || 'down';
        x = this.startX;
        y = this.startY;
        //Down
        if (this.direction === 'down' && this.grid.nodes[x+1][y].walkable && (x+1) < this.grid.nodes[0].length) {
            return [x+1,y];
        }else {
            this.direction = 'right';
        };
        //right
        if (this.direction === 'right' && this.grid.nodes[x][y-1].walkable && (y-1) >= 0) {
            return [x,y-1];
        }else {
            this.direction = 'down';
            return this.getCarDirection();
        }
        //Down
        if (this.direction === 'left' && this.grid.nodes[x-1][y].walkable && (x-1) >= 0) {
            return [x-1,y];
        }else {
            this.direction = 'down';
            return this.getCarDirection();
        }

    },

    onrandompath: function (event, from, to) {
        // When clearing the colorized nodes, there may be
        // nodes still animating, which is an asynchronous procedure.
        // Therefore, we have to defer the `abort` routine to make sure
        // that all the animations are done by the time we clear the colors.
        // The same reason applies for the `onreset` event handler.
        setTimeout(function() {
            Controller.clearOperations();
            Controller.clearFootprints();
            Controller.start();
        }, View.nodeColorizeEffect.duration * 1.2);

        /*var i = 0;
        for (i = 0; i < 5; i++) {
            setTimeout(function(){
                jQuery('#button1').click();

            },i*300);
        }*/
/*
        var grid,
            timeStart, timeEnd,
            finder = new PF.randomFinder();

        timeStart = window.performance ? performance.now() : Date.now();
        grid = this.grid.clone();

        this.path = finder.findPath(
            this.startX, this.startY, this.endX, this.endY, grid
        );
        this.operationCount = this.operations.length;
        timeEnd = window.performance ? performance.now() : Date.now();
        this.timeSpent = (timeEnd - timeStart).toFixed(4);

        this.loop();*/
    },
    onloadpersist: function(event, from, to) {
        this.clearAll();
        this.loadPersist();
    },
    onstorepersist: function(event, from, to) {
        if (confirm('Are you sure you want to store persist?')){
            var fireBase = new Firebase(this.fbInstance);
            var aStartPoint = {startX : Controller.startX, startY : Controller.startY}
            var aEndPoint = {endX : Controller.endX, endY : Controller.endY}
            fireBase.set({myGrid : printGrid(), aStartPoint : aStartPoint, aEndPoint : aEndPoint})
        }
    },

    /**
     * The following functions are called on entering states.
     */

    onready: function() {
        console.log('=> ready');
        this.setButtonStates({
            id: 1,
            text: 'Start Search',
            enabled: true,
            callback: $.proxy(this.start, this),
        }, {
            id: 2,
            text: 'Pause Search',
            enabled: false,
        }, {
            id: 3,
            text: 'Clear Walls',
            enabled: true,
            callback: $.proxy(this.reset, this),
        },{
            id: 4,
            text: 'Load Persist',
            enabled: true,
            callback: $.proxy(this.loadpersist, this)
        },{
            id: 5,
            text: 'Store Persist',
            enabled: true,
            callback: $.proxy(this.storepersist, this)
        },
        {
            id: 6,
            text: 'Random Path',
            enabled: true,
            callback: $.proxy(this.randompath, this)
        }
        );
        // => [starting, draggingStart, draggingEnd, drawingStart, drawingEnd]
    },
    onrandomstarting: function (){
        console.log('=> starting');
        // Clears any existing search progress
        this.clearFootprints();
        this.setButtonStates({
            id: 2,
            enabled: true,
        });
        this.search();
    },

    onstarting: function(event, from, to) {
        console.log('=> starting');
        // Clears any existing search progress
        this.clearFootprints();
        this.setButtonStates({
            id: 2,
            enabled: true,
        });
        this.search();
        // => searching
    },
    onsearching: function() {
        console.log('=> searching');
        this.setButtonStates({
            id: 1,
            text: 'Restart Search',
            enabled: true,
            callback: $.proxy(this.restart, this),
        }, {
            id: 2,
            text: 'Pause Search',
            enabled: true,
            callback: $.proxy(this.pause, this)
        });
        // => [paused, finished]
    },
    onpaused: function() {
        console.log('=> paused');
        this.setButtonStates({
            id: 1,
            text: 'Resume Search',
            enabled: true,
            callback: $.proxy(this.resume, this),
        }, {
            id: 2,
            text: 'Cancel Search',
            enabled: true,
            callback: $.proxy(this.cancel, this),
        });
        // => [searching, ready]
    },
    onfinished: function() {
        console.log('=> finished');
        this.setButtonStates({
            id: 1,
            text: 'Restart Search',
            enabled: true,
            callback: $.proxy(this.restart, this),
        }, {
            id: 2,
            text: 'Clear Path',
            enabled: true,
            callback: $.proxy(this.clear, this),
        });
    },
    onmodified: function() {
        console.log('=> modified');
        this.setButtonStates({
            id: 1,
            text: 'Start Search',
            enabled: true,
            callback: $.proxy(this.start, this),
        }, {
            id: 2,
            text: 'Clear Path',
            enabled: true,
            callback: $.proxy(this.clear, this),
        });
    },

    /**
     * Define setters and getters of PF.Node, then we can get the operations
     * of the pathfinding.
     */
    hookPathFinding: function() {

        PF.Node.prototype = {
            get opened() {
                return this._opened;
            },
            set opened(v) {
                this._opened = v;
                Controller.operations.push({
                    x: this.x,
                    y: this.y,
                    attr: 'opened',
                    value: v
                });
            },
            get closed() {
                return this._closed;
            },
            set closed(v) {
                this._closed = v;
                Controller.operations.push({
                    x: this.x,
                    y: this.y,
                    attr: 'closed',
                    value: v
                });
            },
            get tested() {
                return this._tested;
            },
            set tested(v) {
                this._tested = v;
                Controller.operations.push({
                    x: this.x,
                    y: this.y,
                    attr: 'tested',
                    value: v
                });
            },
        };

        this.operations = [];
    },
    bindEvents: function() {
        $('#draw_area').mousedown($.proxy(this.mousedown, this));

        $(window)
            .mousemove($.proxy(this.mousemove, this))
            .mouseup($.proxy(this.mouseup, this));
        $(window).keypress(function(event) {
            if (!(event.which == 113 && event.ctrlKey) && !(event.which == 17)){
                return true;
            }
            View.toogleRectVisibility();
            event.preventDefault();
            return false;
        });
    },
    loop: function() {
        var interval = 1000 / this.operationsPerSecond;
        (function loop() {
            if (!Controller.is('searching')) {
                return;
            }
            Controller.step();
            //setTimeout(loop, 0.00000001);
            loop();
        })();
    },
    step: function() {
        var operations = this.operations,
            op, isSupported;

        do {
            if (!operations.length) {
                this.finish(); // transit to `finished` state
                return;
            }
            op = operations.shift();
            isSupported = View.supportedOperations.indexOf(op.attr) !== -1;
        } while (!isSupported);

        //View.setAttributeAt(op.x, op.y, op.attr, op.value);
    },
    clearOperations: function() {
        this.operations = [];
    },
    clearFootprints: function() {
        View.clearFootprints();
        View.clearPath();
    },
    clearAll: function() {
        this.clearFootprints();
        View.clearBlockedNodes();
    },
    buildNewGrid: function() {
        this.grid = new PF.Grid(this.gridSize[0], this.gridSize[1]);
    },
    mousedown: function (event) {
        var coord = View.toGridCoordinate(event.pageX, event.pageY),
            gridX = coord[0],
            gridY = coord[1],
            grid  = this.grid;

        if (this.can('dragStart') && this.isStartPos(gridX, gridY)) {
            this.dragStart();
            return;
        }
        if (this.can('dragEnd') && this.isEndPos(gridX, gridY)) {
            this.dragEnd();
            return;
        }
        if (this.can('drawWall') && grid.isWalkableAt(gridX, gridY)) {
            this.drawWall(gridX, gridY);
            return;
        }
        if (this.can('drawBlueWall')){
            if (!View.getNodeColor(gridX, gridY, 'blue') && !View.getNodeColor(gridX, gridY, 'orange')){
                this.drawBlueWall(gridX, gridY);
            }else {
                if (!View.getNodeColor(gridX, gridY, 'orange')){
                    this.drawOrangeWall(gridX, gridY);
                } else{
                    this.eraseWall(gridX, gridY);
                }
            }
            return;
        }
        if (this.current === 'drawingOrangeWall' && !grid.isWalkableAt(gridX, gridY)) {
            this.eraseWall(gridX, gridY);
            return;
        }
    },
    mousemove: function(event) {
        var coord = View.toGridCoordinate(event.pageX, event.pageY),
            grid = this.grid,
            gridX = coord[0],
            gridY = coord[1];

        if (this.isStartOrEndPos(gridX, gridY)) {
            return;
        }

        switch (this.current) {
        case 'draggingStart':
            if (grid.isWalkableAt(gridX, gridY)) {
                this.setStartPos(gridX, gridY);
            }
            break;
        case 'draggingEnd':
            if (grid.isWalkableAt(gridX, gridY)) {
                this.setEndPos(gridX, gridY);
            }
            break;
        case 'drawingWall':
            this.setWalkableAt(gridX, gridY, false);
            break;
        case 'erasingWall':
            this.setWalkableAt(gridX, gridY, true);
            break;
        }
    },
    mouseup: function(event) {
        if (Controller.can('rest')) {
            Controller.rest();
        }
    },
    setButtonStates: function() {
        $.each(arguments, function(i, opt) {
            var $button = Controller.$buttons.eq(opt.id - 1);
            if (opt.text) {
                $button.text(opt.text);
            }
            if (opt.callback) {
                $button
                    .unbind('click')
                    .click(opt.callback);
            }
            if (opt.enabled === undefined) {
                return;
            } else if (opt.enabled) {
                $button.removeAttr('disabled');
            } else {
                $button.attr({ disabled: 'disabled' });
            }
        });
    },
    /**
     * When initializing, this method will be called to set the positions
     * of start node and end node.
     * It will detect user's display size, and compute the best positions.
     */
    setDefaultStartEndPos: function() {
        var width, height,
            marginRight, availWidth,
            centerX, centerY,
            endX, endY,
            nodeSize = View.nodeSize;

        width  = $(window).width();
        height = $(window).height();

        marginRight = $('#algorithm_panel').width();
        availWidth = width - marginRight;

        centerX = Math.ceil(availWidth / 2 / nodeSize);
        centerY = Math.floor(height / 2 / nodeSize);

        this.setStartPos(centerX - 5, centerY);
        this.setEndPos(centerX + 5, centerY);
    },
    setStartPos: function(gridX, gridY) {
        this.startX = gridX;
        this.startY = gridY;
        this.startPosArray = this.startPosArray || [];
        this.startPosArray.push([gridX, gridY]);
        View.setStartPos(gridX, gridY, this.startPosArray);
    },
    setEndPos: function(gridX, gridY) {
        this.endX = gridX;
        this.endY = gridY;
        this.endPosArray = this.endPosArray || [];
        this.endPosArray.push([gridX, gridY]);
        View.setEndPos(gridX, gridY, this.endPosArray);
    },
    setWalkableAt: function(gridX, gridY, walkable) {
        this.grid.setWalkableAt(gridX, gridY, walkable);
        View.setAttributeAt(gridX, gridY, 'walkable', walkable);
    },
    setBlueAt: function(gridX, gridY) {
        this.setWalkableAt(gridX, gridY, false);
        View.setAttributeAt(gridX, gridY, 'blue', true);
    },
    setOrangeAt: function(gridX, gridY) {
        this.setWalkableAt(gridX, gridY, false);
        View.setAttributeAt(gridX, gridY, 'orange', true);
    },
    isStartPos: function(gridX, gridY) {
        return gridX === this.startX && gridY === this.startY;
    },
    isEndPos: function(gridX, gridY) {
        return gridX === this.endX && gridY === this.endY;
    },
    isStartOrEndPos: function(gridX, gridY) {
        return this.isStartPos(gridX, gridY) || this.isEndPos(gridX, gridY);
    }
});
