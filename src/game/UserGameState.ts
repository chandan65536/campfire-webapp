export interface IGameScore {
    diamondsUsed: number,
    pathLength: number
}

export interface IGameLevelHistory {
    level: number, 
    score: IGameScore,
    completedOn: string
}

export interface IGameUISettings {
    enableShadows: boolean,
    shadowType: string;
    enableBloom: boolean;
}

export interface IUserGameState {
    playerName: string,
    currentLevel: number,
    levelsCompleted?: IGameLevelHistory[]
    highestLevel: number,
    settings: IGameUISettings
}

export class UserGameState {

    _gameState: IUserGameState;
    readonly __gameStateKey = "LIGHT-TORCH-V001";

    constructor(){
        let s = localStorage.getItem(this.__gameStateKey);

        try {
            if(s != null) {
                this._gameState = JSON.parse(s);
                return;
            }
        }
        catch {
            console.log("ERROR: Game state is corrupted. Resetting !!");
        }

        // start fresh
        this._gameState = { 
            currentLevel: 0,
            playerName: "Guest-" + Math.floor(Math.random()*100),
            highestLevel: 0,
            settings: {
                enableBloom: true,
                enableShadows: true,
                shadowType: "pcf-soft"
            },
            levelsCompleted: []
        };

        this.__saveStateCore();
    }

    getState() {
        return this._gameState;
    }

    updateState(newState: IUserGameState) {
        if(newState!=null) {
            this._gameState = newState;

            let maxLevel = this._gameState.currentLevel;
            this._gameState.levelsCompleted?.forEach(lvl => { maxLevel = Math.max(maxLevel, lvl.level) });
            maxLevel = Math.max(this._gameState.highestLevel, maxLevel);
            this._gameState.highestLevel = maxLevel;

            if(["basic", "pcf", "pcf-soft"].indexOf(this._gameState.settings.shadowType) == -1){
                this._gameState.settings.shadowType = "basic";
            }

            // keep only first 20 scores
            if( this._gameState.levelsCompleted !=null && this._gameState.levelsCompleted.length > 20) {
                this._gameState.levelsCompleted.length = 20;
            }

            this.__saveStateCore();
        }
    }

    __saveStateCore() {
        localStorage.setItem(this.__gameStateKey, JSON.stringify(this._gameState));
    }
}