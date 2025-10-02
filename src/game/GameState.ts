interface INodeInfo {
    /**
     * x position of the node
     */
    x: number, 

    /**
     * y position of the node
     */
    y: number,

    /**
     * true if the location has a diamond
     */
    hasDiamond: boolean,

    /**
     * true if the lcoation has light source
     */
    hasLightSource: boolean,

    /**
     * true if the location has light destination
     */
    hasLightDestination: boolean,

    /**
     * true if this node has a light obstacle
     */
    hasLightObstacle: boolean,

    /**
     * Is the object lit, e.g. diamond glowing, or laser beam passing through
     */
    isLit: boolean,

    isBeingPicked: boolean,

    /**
     * orientation of the object (e.g. diamond), ranges from 1-top, 2-right, 3-bottom, 4-left 
     */
    objectOrientation: number, // 1-4

    /**
     * Orientation of laser in this cell if isLit is true, 0-top, 1-right, 2-bottom, 3-left
     */
    laserOrientation: boolean[] 
}

export interface IGameLoaderParams {
    /**
     * full text of the level info
     */
    levelDescription: any,
}

export class GameState {
    _isSolved: boolean;
    _nodes: INodeInfo[][];
    _lightSource: INodeInfo | undefined;
    _lightDest: INodeInfo | undefined; 

    __isBeingPicked: boolean;

    constructor(loaderParams: IGameLoaderParams) {
        this._isSolved = false;
        this._nodes = [];
        this.__isBeingPicked = false;

        this._processLevelFile(loaderParams.levelDescription);
        this._computeLightPath();
    }

    get GridInfo() {
        return this._nodes;
    }

    clearPickedState() {
        if(this.__isBeingPicked) {
            this._nodes.forEach(n => {
                n.forEach(n2 => {
                    if(n2.isBeingPicked) {
                        n2.isBeingPicked = false;
                    }
                })
            });
            this.__isBeingPicked = false;
        }
    }

    setBeingPickedState(x: number, y: number) {
        this._nodes[y][x].isBeingPicked = true;
        this.__isBeingPicked = true;
    }

    updateDiamondStateOnClick(x: number, y: number, nextOrientation: number) {

        if(x < 0 || y < 0 || y >= this._nodes.length || x >= this._nodes[0].length) {
            console.log("ERROR: invalid bounds for updating state - ", x, ",", y);
            return;
        }

        if(nextOrientation < 1 || nextOrientation > 4) {
            console.log("ERROR: invalid orientation - ",x, ",", y, " -- ", nextOrientation);
            return;
        }

        let n = this._nodes[y][x];

        if(n.hasDiamond && n.objectOrientation != nextOrientation) {
            n.objectOrientation = nextOrientation;
            this._cleanLightPath();
            this._computeLightPath();
        }
    }

    _processLevelFile(current_level: any) {
        for(let y=0; y< current_level.layout.length; ++y){
            this._nodes.push([]);
            for(let x=0; x< current_level.layout[y].length; ++x) {
              let val: number = current_level.layout[y][x];

              let nodeInfo: INodeInfo = {
                x,
                y,
                hasDiamond: false,
                hasLightSource: false,
                hasLightDestination: false,
                objectOrientation: 0,
                isLit: false,
                isBeingPicked: false,
                laserOrientation: [false, false, false, false],
                hasLightObstacle: false
              };

              if(val == 11 || val == 12 || val == 13 || val == 14) {
                this._lightSource = nodeInfo;
                nodeInfo.hasLightSource = true;
                nodeInfo.objectOrientation = (val%10);
              } else if (val == 21) {
                nodeInfo.hasLightDestination = true;
                nodeInfo.objectOrientation = (val%10);
                this._lightDest = nodeInfo;
              } else if (val == 101 || val == 102 || val == 103 || val == 104) {
                nodeInfo.hasDiamond = true;
                nodeInfo.objectOrientation = (val%10);
              } else if (val == 31) {
                nodeInfo.hasLightObstacle = true;
                nodeInfo.objectOrientation = (val%10);
              }

              this._nodes[y].push(nodeInfo);
            }
          }
    }

    _cleanLightPath() {
        let lightSourceX = this._lightSource?.x;
        let lightSourceY = this._lightSource?.y;

        this._nodes.forEach(n=>{
            n.forEach(n2 =>  {
                n2.isLit = false;
                n2.laserOrientation = [false, false, false, false];
            });
        });

        if(lightSourceX != null && lightSourceY!=null) {
            let srcNode = this._nodes[lightSourceY][lightSourceX];
            srcNode.isLit = true;
            srcNode.laserOrientation[srcNode.objectOrientation-1] = true;
            console.log("LS = ",srcNode.x,",",srcNode.y," -- ", srcNode.laserOrientation);
        }
    }

    _computeLightPath() {
        let lightSourceX = this._lightSource?.x;
        let lightSourceY = this._lightSource?.y;
        let lightSourceOrientation = this._lightSource?.objectOrientation;

        if(lightSourceX != null && lightSourceY != null && lightSourceOrientation !=null) {
            this.__computePathCore(lightSourceX, lightSourceY, lightSourceOrientation, 0);
        }
    }

    __computePathCore(x: number, y: number, dir: number, depthCount: number) {
        
        if(depthCount > 200) return;

        if(x < 0 || y < 0 || y >= this._nodes.length || x >= this._nodes[0].length) {
            return;
        }

        depthCount = depthCount+1;

        let currX = x;
        let currY = y; 
        let nextX = currX;
        let nextY = currY;

        this._nodes[y][x].isLit = true;
        
        if(currX == this._lightDest?.x && currY == this._lightDest.y) {
          this._isSolved = true;
          return;
        }

        let node = this._nodes[y][x];

        let lightSourceDir = 0; // where is the light coming from in this cell

        if(dir == 1) { lightSourceDir = 3; }
        else if ( dir == 2) { lightSourceDir = 4; }
        else if ( dir == 3) { lightSourceDir = 1; }
        else { lightSourceDir = 2; }
        
        if(node.hasDiamond) {
            // there is a diamond, change direction
            dir = node.objectOrientation;

            //set laser beam directions explicitly
            node.laserOrientation[dir-1] = true;
            node.laserOrientation[lightSourceDir-1] = true;
        } 
        else if(node.hasLightObstacle) {
            // has light obstacle
            node.laserOrientation[lightSourceDir-1] = true;
            return; // stop path exploration
        }
        else {
            // no diamond
            if(!node.hasLightSource && !node.hasLightDestination) {
                // set orientation of empty node, for laser beam
                node.objectOrientation = dir;

                //set laser beam directions explicitly
                node.laserOrientation[dir-1] = true;
                node.laserOrientation[lightSourceDir-1] = true;

                console.log("LS = ",node.x,",",node.y," -- ", node.laserOrientation);
            }
        }

        if(dir == 1) { nextY = currY-1;  }
        else if ( dir == 2) { nextX = currX+1;  }
        else if ( dir == 3) { nextY = currY+1;  }
        else { nextX = currX-1;  }
        
        this.__computePathCore(nextX, nextY, dir, depthCount);
    }
}