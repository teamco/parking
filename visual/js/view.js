/**
 * The pathfinding visualization.
 * It uses raphael.js to show the grids.
 */
function getNodeSize() {
    var w = screen.width;
    return (15 * w) / 1280;
}
var View = {
    nodeSize: getNodeSize(), // width and height of a single node, in pixel
    nodeStyle: {
        normal: {
            fill: 'white',
            'stroke-opacity': 0.2, // the border
        },
        blocked: {
            fill: 'grey',
            'stroke-opacity': 0.2,
        },
        blue: {
            fill: 'blue',
            'stroke-opacity': 0.2,
        },
        orange: {
            fill: 'orange',
            'stroke-opacity': 0.2,
        },
        start: {
            fill: '#0d0',
            'stroke-opacity': 0.2,
        },
        end: {
            fill: '#e40',
            'stroke-opacity': 0.2,
        },
        opened: {
            fill: '#98fb98',
            'stroke-opacity': 0.2,
        },
        closed: {
            fill: '#afeeee',
            'stroke-opacity': 0.2,
        },
        failed: {
            fill: '#ff8888',
            'stroke-opacity': 0.2,
        },
        tested: {
            fill: '#e5e5e5',
            'stroke-opacity': 0.2,
        },
    },
    nodeColorizeEffect: {
        duration: 50,
    },
    nodeZoomEffect: {
        duration: 200,
        transform: 's1.2', // scale by 1.2x
        transformBack: 's1.0',
    },
    pathStyle: {
        stroke : "rgba(0,0,0,0)" ,  fill: "rgba(0,0,0,0)"
    },
    supportedOperations: ['opened', 'closed', 'tested'],
    init: function (opts) {
        this.numCols = opts.numCols;
        this.numRows = opts.numRows;
        this.paper = Raphael('draw_area');
        this.$stats = $('#stats');
    },
    toogleRectVisibility: function(){
        this.rects.forEach(function(e){
            var rect;
            for(var x = 0; x<e.length; x++){
                rect = e[x];
                if (!!rect.data('hidden')){
                    rect.data('hidden', false);
                    rect.show();
                } else {
                    rect.data('hidden', true);
                    rect.hide();
                }
            }
        })
    },
    drawpath1: function ( canvas, pathstr, duration, attr, callback )
    {
        var guide_path = canvas.path( pathstr ).attr( { stroke : "rgba(0,0,0,0)" ,  fill: "rgba(0,0,0,0)" } );
        var path = canvas.path( guide_path.getSubpath( 0, 1 ) ).attr( attr );
        var total_length = guide_path.getTotalLength( guide_path );
        duration = duration * total_length/600;
        var last_point = guide_path.getPointAtLength( 0 );
        var cir = canvas.circle(last_point.x, last_point.y, 15, 0).attr({
            stroke: "none",
            fill: "url(lib/themes/images/car.png)"
        });
        var start_time = new Date().getTime();
        var interval_length = 50;
        var result = path;
        var interval_id = setInterval( function()
        {
            var elapsed_time = new Date().getTime() - start_time;
            var this_length = elapsed_time / duration * total_length;
            var subpathstr = guide_path.getSubpath( 0, this_length );
            var lp = guide_path.getPointAtLength(this_length);
            cir.attr({cx : lp.x, cy: lp.y});
            attr.path = subpathstr;
            path.animate( attr, interval_length );
            if ( elapsed_time >= duration )
            {
                clearInterval( interval_id );
                cir.remove();
                if ( callback != undefined ) callback();
                guide_path.remove();
            }
        }, interval_length );
        return result;
    },
    /**
     * Generate the grid asynchronously.
     * This method will be a very expensive task.
     * Therefore, in order to not to block the rendering of browser ui,
     * I decomposed the task into smaller ones. Each will only generate a row.
     */
    generateGrid: function (callback) {
        var i, j, x, y,
            rect,
            normalStyle, nodeSize,
            createRowTask, sleep, tasks,
            nodeSize = this.nodeSize,
            normalStyle = this.nodeStyle.normal,
            numCols = this.numCols,
            numRows = this.numRows,
            paper = this.paper,
            rects = this.rects = [],
            $stats = this.$stats;

        paper.setSize(numCols * nodeSize, numRows * nodeSize);

        createRowTask = function (rowId) {
            return function (done) {
                rects[rowId] = [];
                for (j = 0; j < numCols; ++j) {
                    x = j * nodeSize;
                    y = rowId * nodeSize;

                    rect = paper.rect(x, y, nodeSize, nodeSize);
                    rect.attr(normalStyle);
                    rects[rowId].push(rect);
                }
                $stats.text(
                    'generating grid ' +
                    Math.round((rowId + 1) / numRows * 100) + '%'
                );
                done(null);
            };
        };

        sleep = function (done) {
            setTimeout(function () {
                done(null);
            }, 0);
        };

        tasks = [];
        for (i = 0; i < numRows; ++i) {
            tasks.push(createRowTask(i));
            tasks.push(sleep);
        }

        async.series(tasks, function () {
            if (callback) {
                callback();
            }
        });
    },
    setStartPos: function (gridX, gridY) {
        var coord = this.toPageCoordinate(gridX, gridY);
        if (!this.startNode) {
            this.startNode = this.paper.rect(
                coord[0],
                coord[1],
                this.nodeSize,
                this.nodeSize
            ).attr(this.nodeStyle.normal)
                .animate(this.nodeStyle.start, 1000);
        } else {
            this.startNode.attr({x: coord[0], y: coord[1]}).toFront();
        }
    },
    setEndPos: function (gridX, gridY) {
        var coord = this.toPageCoordinate(gridX, gridY);
        if (!this.endNode) {
            this.endNode = this.paper.rect(
                coord[0],
                coord[1],
                this.nodeSize,
                this.nodeSize
            ).attr(this.nodeStyle.normal)
                .animate(this.nodeStyle.end, 1000);
        } else {
            this.endNode.attr({x: coord[0], y: coord[1]}).toFront();
        }
    },
    /**
     * Set the attribute of the node at the given coordinate.
     */
    setAttributeAt: function (gridX, gridY, attr, value) {
        var color, nodeStyle = this.nodeStyle;
        switch (attr) {
            case 'walkable':
                color = value ? nodeStyle.normal.fill : nodeStyle.blocked.fill;
                this.setWalkableAt(gridX, gridY, value);
                break;
            case 'blue':
                var node = this.blockedNodes[gridY][gridX];
                node.data('blue', true);
                this.colorizeNode(node, nodeStyle.blue.fill);
                this.zoomNode(node);
                break;
            case 'orange':
                var node = this.blockedNodes[gridY][gridX];
                node.data('orange', true);
                this.colorizeNode(node, nodeStyle.orange.fill);
                this.zoomNode(node);
                break;
            case 'opened':
                this.colorizeNode(this.rects[gridY][gridX], nodeStyle.opened.fill);
                this.setCoordDirty(gridX, gridY, true);
                break;
            case 'closed':
                this.colorizeNode(this.rects[gridY][gridX], nodeStyle.closed.fill);
                this.setCoordDirty(gridX, gridY, true);
                break;
            case 'tested':
                color = (value === true) ? nodeStyle.tested.fill : nodeStyle.normal.fill;

                this.colorizeNode(this.rects[gridY][gridX], color);
                this.setCoordDirty(gridX, gridY, true);
                break;
            case 'parent':
                // XXX: Maybe draw a line from this node to its parent?
                // This would be expensive.
                break;
            default:
                console.error('unsupported operation: ' + attr + ':' + value);
                return;
        }
    },
    colorizeNode: function (node, color) {
        node.animate({
            fill: color
        }, this.nodeColorizeEffect.duration);
    },
    getNodeColor: function (gridX, gridY, color) {
        return this.blockedNodes[gridY][gridX].data(color);
    },
    zoomNode: function (node) {
        node.toFront().attr({
            transform: this.nodeZoomEffect.transform,
        }).animate({
            transform: this.nodeZoomEffect.transformBack,
        }, this.nodeZoomEffect.duration);
    },
    setWalkableAt: function (gridX, gridY, value) {
        var node, i, blockedNodes = this.blockedNodes;
        if (!blockedNodes) {
            blockedNodes = this.blockedNodes = new Array(this.numRows);
            for (i = 0; i < this.numRows; ++i) {
                blockedNodes[i] = [];
            }
        }
        node = blockedNodes[gridY][gridX];
        if (value) {
            // clear blocked node
            if (node) {
                this.colorizeNode(node, this.rects[gridY][gridX].attr('fill'));
                this.zoomNode(node);
                setTimeout(function () {
                    node.remove();
                }, this.nodeZoomEffect.duration);
                blockedNodes[gridY][gridX] = null;
            }
        } else {
            // draw blocked node
            if (node) {
                return;
            }
            node = blockedNodes[gridY][gridX] = this.rects[gridY][gridX].clone();
            this.colorizeNode(node, this.nodeStyle.blocked.fill);
            this.zoomNode(node);
        }
    },
    clearFootprints: function () {
        var i, x, y, coord, coords = this.getDirtyCoords();
        for (i = 0; i < coords.length; ++i) {
            coord = coords[i];
            x = coord[0];
            y = coord[1];
            this.rects[y][x].attr(this.nodeStyle.normal);
            this.setCoordDirty(x, y, false);
        }
    },
    clearBlockedNodes: function () {
        var i, j, blockedNodes = this.blockedNodes;
        if (!blockedNodes) {
            return;
        }
        for (i = 0; i < this.numRows; ++i) {
            for (j = 0; j < this.numCols; ++j) {
                if (blockedNodes[i][j]) {
                    blockedNodes[i][j].remove();
                    blockedNodes[i][j] = null;
                }
            }
        }
    },
    drawPath: function (path) {
        if (!path.length) {
            return;
        }
        var svgPath = this.buildSvgPath(path);
        this.path = this.drawpath1(this.paper, svgPath, 5000, this.pathStyle);
        //this.path = this.paper.path(svgPath).attr(this.pathStyle);//
    },
    /**
     * Given a path, build its SVG represention.
     */
    buildSvgPath: function (path) {
        var i, strs = [], size = this.nodeSize;

        strs.push('M' + (path[0][0] * size + size / 2) + ' ' +
            (path[0][1] * size + size / 2));
        for (i = 1; i < path.length; ++i) {
            strs.push('L' + (path[i][0] * size + size / 2) + ' ' +
                (path[i][1] * size + size / 2));
        }

        return strs.join('');
    },
    clearPath: function () {
        if (this.path) {
            this.path.remove();
        }
    },
    /**
     * Helper function to convert the page coordinate to grid coordinate
     */
    toGridCoordinate: function (pageX, pageY) {
        return [
            Math.floor(pageX / this.nodeSize),
            Math.floor(pageY / this.nodeSize)
        ];
    },
    /**
     * helper function to convert the grid coordinate to page coordinate
     */
    toPageCoordinate: function (gridX, gridY) {
        return [
            gridX * this.nodeSize,
            gridY * this.nodeSize
        ];
    },
    showStats: function (opts) {
        var texts = [
            'length: ' + Math.round(opts.pathLength * 100) / 100,
            'time: ' + opts.timeSpent + 'ms',
            'operations: ' + opts.operationCount
        ];
        $('#stats').show().html(texts.join('<br>'));
    },
    setCoordDirty: function (gridX, gridY, isDirty) {
        var x, y,
            numRows = this.numRows,
            numCols = this.numCols,
            coordDirty;

        if (this.coordDirty === undefined) {
            coordDirty = this.coordDirty = [];
            for (y = 0; y < numRows; ++y) {
                coordDirty.push([]);
                for (x = 0; x < numCols; ++x) {
                    coordDirty[y].push(false);
                }
            }
        }

        this.coordDirty[gridY][gridX] = isDirty;
    },
    getDirtyCoords: function () {
        var x, y,
            numRows = this.numRows,
            numCols = this.numCols,
            coordDirty = this.coordDirty,
            coords = [];

        if (coordDirty === undefined) {
            return [];
        }

        for (y = 0; y < numRows; ++y) {
            for (x = 0; x < numCols; ++x) {
                if (coordDirty[y][x]) {
                    coords.push([x, y]);
                }
            }
        }
        return coords;
    },
};
