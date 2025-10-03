import * as THREE from 'three';

import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { Fire } from '../artifacts/Fire';
import { LaserBeam } from '../artifacts/LaserBeam';
import { Picker } from '../artifacts/Picker';

import { GameUI } from './GameUI';
import { GameState } from './GameState';
import { type IGameScore, UserGameState } from './UserGameState';
import { ObjectUtils } from '../artifacts/ObjectUtils';
import { GlobalLoader, RESOURCE } from '../utils/LoaderPopup';

export type Nullable<T> = T | undefined | null;

export class GameConstants {
    static readonly MaxLevel = 10;
    
    static LevelConfigPath(level: number) { return "../assets/config/level-" + level + ".json";}; 
}

export class GameEngine {
    
    _camera: THREE.PerspectiveCamera;
    _scene: THREE.Scene;
    _canvas: HTMLCanvasElement;
    _renderer: THREE.WebGLRenderer;
    _composer: EffectComposer;
    _globalShadowLight: THREE.DirectionalLight;

    _controls: OrbitControls;

    _gameUI: GameUI;
    _gameUserState: UserGameState;

    readonly _model_pickablePrefix = "pickable_";

    readonly _gemRenderMap: {[key: string]: string} = {
        "11": ObjectUtils._model_lightSourceName,
        "12": ObjectUtils._model_lightSourceName,
        "13": ObjectUtils._model_lightSourceName,
        "14": ObjectUtils._model_lightSourceName,

        "21": ObjectUtils._model_lightDestName,
        "22": ObjectUtils._model_lightDestName,
        "23": ObjectUtils._model_lightDestName,
        "24": ObjectUtils._model_lightDestName,

        "101": ObjectUtils._model_clickableDiamondName,
        "102": ObjectUtils._model_clickableDiamondName,
        "103": ObjectUtils._model_clickableDiamondName,
        "104": ObjectUtils._model_clickableDiamondName
    };

    //#region 3d objects
    _lightSource: THREE.Object3D | undefined;
    _lightDest: THREE.Object3D | undefined;
    __obstacleBase: THREE.Object3D | undefined;
    __clickableDiamondBase: THREE.Object3D | undefined;
    __diamondBaseMaterial: THREE.Material | undefined;
    __diamondLitMaterial: THREE.Material | undefined;

    _levelGrid: Nullable<THREE.Object3D>[][] = [];

    /**
     * Laser beam from center of cell to either direction, format [y][x][orientation(0-3)]
     */
    _laserBeam: Nullable<THREE.Object3D>[][][] = [];

    readonly _laserBeamHeight: number = 0.5;
    
    /**
     * contains fire objects, 0 - source, 1 - destination
     */
    _fires: Fire[] = [];

    /**
     * contains picker object
     */
    _picker: Nullable<Picker>;
    //#endregion

    //#region game state
    _gameState: GameState | undefined;
    _gridSizeX: number = 1;
    _gridSizeY: number = 1;
    _cellSizeX: number = 1;
    _cellSizeY: number = 1;
    //#endregion

    __lastTime: number = 0;
    __isReady: boolean = false;
    __clock: THREE.Clock;
    __currentScore: IGameScore = { diamondsUsed:0, pathLength: 0 };
    __currentLevel: number = 0;

    __renderWindowWidth = () => window.innerWidth;
    __renderWindowHeight = () => window.innerHeight-this._canvas.offsetTop-20;
    
    constructor(
        webGLcanvasElement: HTMLCanvasElement,
        helpModalEl: HTMLElement,
        levelCompleteModalEl: HTMLElement,
        levelNavEl: HTMLElement
        ) {

        this._gameUI = new GameUI(helpModalEl, levelCompleteModalEl, levelNavEl);
        this._gameUserState = new UserGameState();
        
        this._canvas = webGLcanvasElement;
        
        this._scene = new THREE.Scene();
        this._scene.background = new THREE.Color(0x87cefa);
        this._scene.fog = new THREE.Fog(0x87cefa, 5, 80);
        this._camera = new THREE.PerspectiveCamera( 60, this.__renderWindowWidth() / this.__renderWindowHeight (), 0.1, 1000 );
        this._renderer = new THREE.WebGLRenderer({canvas: this._canvas, antialias: true});
        this._renderer.setSize(this.__renderWindowWidth(), this.__renderWindowHeight());
        this._renderer.setPixelRatio(1.5);

        this._controls = new OrbitControls(this._camera, this._canvas);

        this._camera.position.set(-6, 8 , 6);
        this._camera.lookAt(new THREE.Vector3(0,0,0));
        this._camera.near = 1;
        this._camera.far = 10000;

        this._controls.enableDamping = true;
        this._controls.enablePan = false;
        this._controls.minPolarAngle = Math.PI / 4;
        this._controls.maxPolarAngle = Math.PI / 4;
        this._controls.enableZoom = false;

        this._controls.update();

        const ambientLight = new THREE.AmbientLight(0xffffff, 0.25);
        this._scene.add(ambientLight);

        //shadow gen directional light
        let light = new THREE.DirectionalLight( 0xfffff0, 3 );
        light.position.set( 14, 12, -4 );
        light.target.position.set(0,0,0);
        
        if(this._gameUserState.getState().settings.enableShadows) {
            // enable shadow in game
            let shadowType = this._gameUserState.getState().settings.shadowType;
            this._renderer.shadowMap.enabled = true;

            if (shadowType == "pcf") {
                this._renderer.shadowMap.type = THREE.PCFShadowMap;
            } else if (shadowType == "pcf-soft") {
                this._renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            } else {
                this._renderer.shadowMap.type = THREE.BasicShadowMap;
            }

            let shadowCoord = 20;
            light.castShadow = true;
            light.shadow.camera.top = shadowCoord;
            light.shadow.camera.bottom = - shadowCoord;
            light.shadow.camera.left = - shadowCoord;
            light.shadow.camera.right = shadowCoord;
            light.shadow.camera.near = 1;
            light.shadow.camera.far = 50;
            light.shadow.bias = 0.0001; // 0.00001;

            const sz = 4096;
            light.shadow.mapSize.width = sz;
            light.shadow.mapSize.height = sz;
        }

        this._globalShadowLight = light;
        this._scene.add(light);


        const renderScene = new RenderPass( this._scene, this._camera );

        const bloomPass = new UnrealBloomPass( new THREE.Vector2( this.__renderWindowWidth(), this.__renderWindowHeight() ), 1.5, 0.4, 0.85 );
        bloomPass.threshold = 0.6;
        bloomPass.strength = 0.5;
        bloomPass.radius = 0.15;

        const outputPass = new OutputPass();

        this._composer = new EffectComposer(this._renderer);
        this._composer.addPass( renderScene );
        
        if(this._gameUserState.getState().settings.enableBloom) {
            this._composer.addPass( bloomPass );
        }

        this._composer.addPass( outputPass );

        this.__clock = new THREE.Clock();
    }

    /**
     * Load Scene from gltf (or glb) file
     * @param levelObjectFile path to the file
     * @param levelConfigFile path to the config file which is loaded
     */
    setupScene() {
        const gltfLoader = new GLTFLoader();

        let gs = this._gameUserState.getState();
        let levelConfigFile: string = GameConstants.LevelConfigPath(gs.currentLevel);

        this.__currentLevel = gs.currentLevel;

        GlobalLoader?.ReportProgress({
                    isComplete: false,
                    resourceName: RESOURCE.LEVEL_CONFIG
                });

        GlobalLoader?.ReportProgress({
                    isComplete: false,
                    resourceName: RESOURCE.SCENE
                });

        fetch(levelConfigFile).then((response) => {
            if(!response.ok) {
                console.log("ERROR: can't load level config file - ", levelConfigFile);
                return;
            }

             GlobalLoader?.ReportProgress({
                    isComplete: true,
                    resourceName: RESOURCE.LEVEL_CONFIG
                });

            return response.json();
        })
        .then((data) => {
            console.log("loaded level config successfully");
            this._gameState = new GameState({levelDescription: data});

            let levelObjectFile: string = data.model;
            
            gltfLoader.load(levelObjectFile, (gltf) => {
                console.log("Loaded level object successfully");
                GlobalLoader?.ReportProgress({
                    isComplete: true,
                    resourceName: RESOURCE.SCENE
                });

                const root = gltf.scene;
                this._scene.add(root);
                root.traverse(obj => {
                    if(obj.castShadow == false && obj.type == "Mesh") {
                        obj.castShadow = true;
                        obj.receiveShadow = true;
                    }
                });
                this._fetchObjectsFromLoadedScene(gltf.scene);
                this._setupGridOfObjects();
                this.setupEventListners();

                setTimeout(() => {
                    this._computeLightPathVisually();
                    this.__lastTime = performance.now();
                    this.__isReady = true;

                    if(this.__currentLevel == 0) {
                        // if this is first level, show tutorial
                        setTimeout(() => this._gameUI.showHelp(), 250);
                    }

                }, 0);
                
            }, 
            (xhr) => {
                GlobalLoader?.ReportProgress({
                    isComplete: false,
                    loadedSize: xhr.loaded,
                    targetSize: xhr.total,
                    resourceName: RESOURCE.SCENE
                });
            });
        })
        .catch((error) => {
            console.error("Fatal error : ", error);
        });
    }

    shouldShowFPS() {
        return this._gameUserState.getState().settings.showFps;
    }

    /**
     * Run this function in requestAnimationFrame
     */
    animate() {
        if(!this.__isReady) return;

        let timeDiff = this.__clock.getDelta();

        this._controls.update();
        
        // do stuff here
        let currLightPos = this._globalShadowLight.position.clone();
        currLightPos.applyAxisAngle(new THREE.Vector3(0,1,0), timeDiff*Math.PI/500);
        this._globalShadowLight.position.set(currLightPos.x, currLightPos.y, currLightPos.z);

        this._fires[0]?.updateState(timeDiff);
        this._fires[1]?.updateState(timeDiff);

        this._composer.render();
    }

    setupEventListners() {
        window.addEventListener('mousemove', (evt: MouseEvent) => this._onMouseMove(evt));
        window.addEventListener("mouseup", () => this._onMouseClick());
        window.addEventListener( 'resize', () => this._onWindowResize());
    }

    _setupGridOfObjects() {
        let gridInfo = this._gameState?.GridInfo;

        if(gridInfo == null) return;

        this._gridSizeX = gridInfo[0].length;
        this._gridSizeY = gridInfo.length;

        let laserBeamBase = new LaserBeam();
        
        for(let y=0; y< gridInfo.length; ++y){
            this._levelGrid.push([]);
            this._laserBeam.push([]);
            for(let x=0; x< gridInfo[y].length; ++x) {
                let obj: Nullable<THREE.Object3D>;

                if(gridInfo[y][x].hasLightSource) {
                    obj = this._lightSource;
                    obj?.position.set(this._gridXFromState(x), 0.15, this._gridYFromState(y));
                    let fire = new Fire();
                    fire.RenderArtifact.position.set(this._gridXFromState(x), 0, this._gridYFromState(y));
                    this._scene.add(fire.RenderArtifact);
                    this._fires[0] = fire;
                } 
                else if (gridInfo[y][x].hasLightDestination) {
                    obj = this._lightDest;
                    obj?.position.set(this._gridXFromState(x), 0.15, this._gridYFromState(y));
                    let fire = new Fire();
                    fire.RenderArtifact.position.set(this._gridXFromState(x), 0, this._gridYFromState(y));
                    fire.RenderArtifact.visible = false;
                    this._scene.add(fire.RenderArtifact);
                    this._fires[1] = fire;
                } 
                else if (gridInfo[y][x].hasDiamond) {
                    obj = this.__cloneObject(this.__clickableDiamondBase as THREE.Mesh);

                    if(obj !=null) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;
                        obj.applyMatrix4(ObjectUtils._model_clickableDiamondMatrix);
                        obj.name = this._model_pickablePrefix + x + "_" + y + "_" + this.__clickableDiamondBase?.name;
                        obj.position.set(this._gridXFromState(x), 0.5, this._gridYFromState(y));
                        ObjectUtils._model_clickableDiamondRotation(obj, gridInfo[y][x].objectOrientation);
                        this._scene.add(obj);
                    }
                }
                else if (gridInfo[y][x].hasLightObstacle) {
                    obj = this.__obstacleBase?.clone();

                    if(obj !=null) {
                        obj.castShadow = true;
                        obj.receiveShadow = true;
                        obj.applyMatrix4(ObjectUtils._model_obstacleMatrix);
                        obj.name = (this.__obstacleBase?.name || "") + x + "_" + y + "_" + this.__obstacleBase?.name;
                        obj.position.set(this._gridXFromState(x), 0.12, this._gridYFromState(y));
                        this._scene.add(obj);
                    }
                }

                if(obj != null) {
                    this._levelGrid[y].push(obj);
                } else {
                    this._levelGrid[y].push(null);
                }

                //init laser beams
                let laserObjTop = laserBeamBase.object3d.clone();
                let laserObjRight = laserBeamBase.object3d.clone();
                let laserObjBottom = laserBeamBase.object3d.clone();
                let laserObjLeft = laserBeamBase.object3d.clone();

                this._laserBeam[y].push([laserObjTop, laserObjRight, laserObjBottom, laserObjLeft]);

                let pos = new THREE.Vector3(this._gridXFromState(x), this._laserBeamHeight, this._gridYFromState(y));

                if(y == 0) laserObjTop.scale.set(2.75,1,1);
                else laserObjTop.scale.set(0.5,1,1);

                laserObjTop.rotateY(Math.PI/2);
                laserObjTop.position.set(pos.x, pos.y, pos.z);

                if(x >= this._gridSizeX-1) laserObjRight.scale.set(2.75,1,1);
                else laserObjRight.scale.set(0.5,1,1);
                laserObjRight.rotateY(0);
                laserObjRight.position.set(pos.x, pos.y, pos.z);

                if(y >= this._gridSizeY-1) laserObjBottom.scale.set(2.75,1,1);
                else laserObjBottom.scale.set(0.5,1,1);
                laserObjBottom.rotateY(-Math.PI/2);
                laserObjBottom.position.set(pos.x, pos.y, pos.z);

                if(x == 0) laserObjLeft.scale.set(2.75,1,1);
                else laserObjLeft.scale.set(0.5,1,1);
                laserObjLeft.rotateY(-2*Math.PI/2);
                laserObjLeft.position.set(pos.x, pos.y, pos.z);

                laserObjTop.visible = false;
                laserObjRight.visible = false;
                laserObjBottom.visible = false;
                laserObjLeft.visible = false;

                this._scene.add(laserObjTop, laserObjRight, laserObjBottom, laserObjLeft);
            }
        }

        //Setup picker
        this._picker = new Picker(this._camera);
        this._scene.add(this._picker._baseObject);
    }

    _fetchObjectsFromLoadedScene(gltfScene: THREE.Group) {
        this._lightSource = gltfScene.getObjectByName(ObjectUtils._model_lightSourceName)?.clone();

        if(this._lightSource == null) {
            console.log("ERROR: can not load light source object, quitting");
            return;
        }

        this._lightSource.applyMatrix4(ObjectUtils._model_lightSourceMatrix);
        this._scene.add(this._lightSource);

        this._lightDest = gltfScene.getObjectByName(ObjectUtils._model_lightDestName)?.clone();

        if(this._lightDest == null) {
            console.log("ERROR: can not load light destination object, quitting");
            return;
        }

        this._lightDest.applyMatrix4(ObjectUtils._model_lightSourceMatrix);
        this._scene.add(this._lightDest);

        this.__clickableDiamondBase = gltfScene.getObjectByName(ObjectUtils._model_clickableDiamondName);

        if(this.__clickableDiamondBase == null) {
            console.log("ERROR: can not load clickable diamond object, quitting");
            return;
        }

        this.__obstacleBase = gltfScene.getObjectByName(ObjectUtils._model_staticObstacleName);

        if(this.__obstacleBase == null) {
            console.log("ERROR: can't load obstacle object, quitting");
            return;
        }
    }

    /**
     * Compute light path visually
     */
    _computeLightPathVisually() {

        let score: IGameScore = { diamondsUsed: 0, pathLength: 0};

        for(let y=0; y<this._gridSizeY;++y) {
            for(let x=0; x<this._gridSizeX;++x) {
                let cellInfo = this._gameState?.GridInfo[y][x];
                if(cellInfo == null) continue;

                if(cellInfo.isLit) {
                    score.pathLength = score.pathLength + 1;

                    if(cellInfo.hasDiamond) {
                        score.diamondsUsed = score.diamondsUsed + 1;
                    }
                }

                // process diamond
                if(cellInfo.hasDiamond)
                {
                    let obj = this._levelGrid[y][x] as THREE.Mesh;

                    if(obj !=null) {
                        let mat = obj.material as THREE.MeshStandardMaterial;

                        if(cellInfo.isLit) {
                            mat.emissive.set(0x008ff);
                            mat.emissiveIntensity = 0.5;
                        } else {
                            mat.emissiveIntensity = 0;
                        }
                    }
                }

                // process destination fire
                if(cellInfo.hasLightDestination && cellInfo.isLit) {
                    let destFire = this._fires[1];

                    if(destFire !=null) {
                        destFire.RenderArtifact.visible = true;
                    }
                }

                if(!cellInfo.isLit) {
                    this._laserBeam[y][x].forEach(l => { 
                        if(l !=null) l.visible = false; 
                    });
                }

                if(!cellInfo.hasLightSource && !cellInfo.hasLightDestination){
                    // empty cell, can draw laser now
                    if(!cellInfo.isLit) {
                        
                    } else {
                        // cell is lit, determine which lasers to draw

                        for(let ort = 0; ort < 4; ++ort) {
                            let lb = this._laserBeam[y][x][ort];

                            if(lb !=null) lb.visible = cellInfo.laserOrientation[ort]; 
                        }
                    }
                }
            }
        }

        this.__currentScore = score;
    }

    /**
     * Deep clone object, cloning geometry and material
     * @param baseObject object to be cloned
     * @returns new object
     */
    __cloneObject(baseObject: THREE.Mesh): Nullable<THREE.Mesh> {
        let newObj: THREE.Mesh | undefined;

        if(baseObject == null) {
            return null;
        }

        if(Array.isArray(baseObject.material)) {
            let matDest: THREE.Material[] = [];
            baseObject.material.forEach(msrc => { matDest.push(new THREE.Material().copy(msrc)); });
            newObj = new THREE.Mesh(baseObject.geometry.clone(), matDest);
        } else {
            newObj = new THREE.Mesh(baseObject.geometry.clone(), new THREE.MeshStandardMaterial().copy(baseObject.material));
        }

        return newObj;
    }

    _onMouseMove(evt: MouseEvent) {

        if(evt.buttons != 0 || this._gameState?._isSolved) return;

        var raycaster = new THREE.Raycaster(); 
        var mouse = new THREE.Vector2(); 

        let canvasRect = this._canvas.getBoundingClientRect();
        let x = (evt.clientX - canvasRect.left) * this._canvas.width / canvasRect.width;
        let y = (evt.clientY - canvasRect.top ) * this._canvas.height / canvasRect.height
        mouse.x = (x / this._canvas.width) * 2 - 1;
        mouse.y = ( y / this._canvas.height ) * -2 + 1;

        raycaster.setFromCamera( mouse, this._camera );

        var intersects = raycaster.intersectObjects(this._scene.children);

        // clear picked state
        this._gameState?.clearPickedState();

        for(let i=0 ; i<intersects.length; ++i) {
            let obj : THREE.Object3D = intersects[i].object;
            
            if(obj !=null && (obj.name || "").length > 0){
                let name = obj.name;

                if(name.startsWith("pickable_")) {
                    let splitName = name.split("_");
                    let xCoord = parseInt(splitName[1]);
                    let yCoord = parseInt(splitName[2]);
                    this._gameState?.setBeingPickedState(xCoord, yCoord);
                    this._picker?.setVisible(this._gridXFromState(xCoord), 0.5, this._gridYFromState(yCoord));
                    return;
                }
            }
        }
    }

    _onMouseClick() {
        
        if(this._gameState?._isSolved) return;

        this._gameState?.GridInfo.forEach(g => {
            g.forEach(n => {
                let xCoord = n.x;
                let yCoord = n.y;
                let currOrt = n.objectOrientation;

                if(n.hasDiamond && n.isBeingPicked) {
                    setTimeout(() => {
                        let ort = currOrt - 1;
                        ort = (ort + 1)%4;
                        this._gameState?.updateDiamondStateOnClick(xCoord, yCoord, ort + 1);
                        
                        let obj = this._levelGrid[yCoord][xCoord];

                        if(obj !=null) {
                            ObjectUtils._model_clickableDiamondRotation(obj, n.objectOrientation);
                        }

                        setTimeout(() => {
                            this._computeLightPathVisually();

                            if(this._gameState?._isSolved) {
                                setTimeout(() => {
                                    let gs = this._gameUserState.getState();
    
                                    if(gs.levelsCompleted == null) gs.levelsCompleted = [];

                                    gs.levelsCompleted.unshift({
                                        level: this.__currentLevel, 
                                        score: this.__currentScore,
                                        completedOn: new Date().toString()
                                    });

                                    this._gameUserState.updateState(gs);
                                    this._gameUI.showLevelComplete();
                                }, 250);
                            }
                        }, 0);
                    }, 0);
                }
            })
        });
    }

    _onWindowResize() {

        this._camera.aspect = this.__renderWindowWidth() / this.__renderWindowHeight();
        this._camera.updateProjectionMatrix();
        this._renderer.setSize( this.__renderWindowWidth(), this.__renderWindowHeight() );
    }

    _gridXFromState(x: number) {
        return x - 0.5 * this._gridSizeX + 0.5*this._cellSizeX;
    }

    _gridYFromState(y: number) {
        return y - 0.5 * this._gridSizeY + 0.5*this._cellSizeY;
    }
}