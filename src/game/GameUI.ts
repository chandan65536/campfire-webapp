
// Import all of Bootstrap's JS
import * as bootstrap from 'bootstrap';
import Handlebars from 'handlebars';

import helpTmpl from '../game/helpModal.hbs?raw';
import levelComplete from '../game/levelCompleteModal.hbs?raw';
import levelNav from '../game/gameLevelNav.hbs?raw';
import { GameConstants } from './GameEngine';
import { UserGameState } from './UserGameState';

Handlebars.registerHelper('isEq', (exp1, exp2) => {
    let v1 = Handlebars.escapeExpression(exp1);
    let v2 = Handlebars.escapeExpression(exp2);

    return v1 == v2;
});

export class GameUI {

    _helpEl: HTMLElement;
    _completeEl: HTMLElement;
    _levelNavEl: HTMLElement;

    _tmplHelp: HandlebarsTemplateDelegate<any>;
    _tmplLevelComplete: HandlebarsTemplateDelegate<any>;
    _tmplLevelNav: HandlebarsTemplateDelegate<any>;

    constructor(
        helpModalElement: HTMLElement,
        levelCompleteModalElement: HTMLElement,
        levelNavEl: HTMLElement) {

        this._helpEl = helpModalElement;
        this._completeEl = levelCompleteModalElement;
        this._levelNavEl = levelNavEl;

        this._tmplHelp = Handlebars.compile(helpTmpl);
        this._tmplLevelComplete = Handlebars.compile(levelComplete);
        this._tmplLevelNav = Handlebars.compile(levelNav);


        this._completeEl.addEventListener('show.bs.modal', _ => {
            let gs = new UserGameState().getState();
            let el = this._completeEl.querySelector(".modal-body");
            
            if(gs !=null && el !=null) {
                let tmplData: any = {...gs};
                tmplData.isFinalLevel = gs.currentLevel == GameConstants.MaxLevel;
                el.innerHTML = this._tmplLevelComplete(tmplData);
            }

            this.__renderNav();
        });

        this._helpEl.addEventListener('show.bs.modal', _ => {
            let e0 = this._helpEl.querySelector(".modal-body");
            let cs = new UserGameState().getState();
            let templateData: any = {...cs};
            
            templateData.levelsCompleted?.forEach((lvl: any) => {
                let dt = new Date(Date.parse(lvl.completedOn));
                let date = dt.getDate();
                let monthName = dt.toLocaleString('default', { month: 'long' });
                let yr = dt.getFullYear();

                let tm = dt.toLocaleTimeString();
                lvl.ViewFriendlyTime = `${date} ${monthName} ${yr} ${tm}`;
            })

            if(e0 != null) {
                // TODO: code template properly
                e0.innerHTML = this._tmplHelp(templateData);
                setTimeout(() => {
                    let shadowState = (this._helpEl.querySelector("#game-setting--enable-shadow-checkbox") as HTMLInputElement)
                    .checked;
                    this.__updateViewOnShadowSettingChanged(shadowState);
                }, 0);
            }
        });

        this._helpEl.addEventListener('click', evt => {
            let el = evt.target as HTMLElement; 
            let className = el?.getAttribute('class') || "";

            if(className.indexOf("game-action--button") > -1) {
                let act = el.getAttribute("data-action");

                if (act == "player-name-update") {
                    let newName = (this._helpEl.querySelector("#game-setting--player-name") as HTMLInputElement)?.value || "";

                    if(newName.length > 0) {
                        let gs = new UserGameState();
                        let localState = gs.getState();
                        localState.playerName = newName;
                        gs.updateState(localState);
                        let successEl = this._helpEl.querySelector('#game-setting--player-name-save-success') as HTMLElement;
                        if(successEl !=null) successEl.style.visibility = 'visible';
                    }
                }
                else if (act == "apply-settings") {
                    let gs = new UserGameState();
                    let cs = gs.getState();
                    cs.settings.enableShadows = 
                        (this._helpEl.querySelector("#game-setting--enable-shadow-checkbox") as HTMLInputElement)
                        .checked;
                    cs.settings.enableBloom = 
                        (this._helpEl.querySelector("#game-setting--enable-bloom-checkbox") as HTMLInputElement)
                        .checked;
                    cs.settings.shadowType = 
                        (this._helpEl.querySelector("#game-setting--shadow-type") as HTMLInputElement)
                        .value;
                    cs.settings.showFps = 
                        (this._helpEl.querySelector("#game-setting--enable-fps-checkbox") as HTMLInputElement)
                        .checked;
                    
                    gs.updateState(cs);
                    window.location.reload();
                }
            }
        });

        this._helpEl.addEventListener('change', evt => {
            console.log("Change event = ", evt);
            let el = evt.target as HTMLElement;
            let elId = el.id;

            if(elId == "game-setting--enable-shadow-checkbox") {
                // shadow enable checkbox changed
                let isEnabled = (el as HTMLInputElement).checked;
                this.__updateViewOnShadowSettingChanged(isEnabled);
            }
        });

        this._completeEl.addEventListener('click', evt => {
            evt.stopImmediatePropagation();
            let el = evt.target as HTMLElement; 
            let className = el?.getAttribute('class') || "";
            
            if(className.indexOf("game-action--button") > -1) {
                let act = el.getAttribute("data-action");

                if(act == "main-menu") {
                    alert("Quitting, i.e. closing the application");
                    window.location.assign("/");
                } else if (act == "next-level") {
                    let gs = new UserGameState();
                    let localState = gs.getState();

                    if(localState.currentLevel >= GameConstants.MaxLevel) {
                        localState.currentLevel = 0;
                    } else {
                        localState.currentLevel = localState.currentLevel + 1;
                    }
                    
                    gs.updateState(localState);
                    window.location.reload();
                } else if (act == "player-name-update") {
                    let newName = (this._completeEl.querySelector("#game-setting--player-name") as HTMLInputElement)?.value || "";

                    if(newName.length > 0) {
                        let gs = new UserGameState();
                        let localState = gs.getState();
                        localState.playerName = newName;
                        gs.updateState(localState);
                        let successEl = this._completeEl.querySelector('#game-setting--player-name-save-success') as HTMLElement;
                        if(successEl !=null) successEl.style.visibility = 'visible';
                    }
                }
            }
        });

        this._levelNavEl.addEventListener('click', evt => {
            let el = evt.target as HTMLElement; 
            let className = el?.getAttribute('class') || "";
            
            if(className.indexOf("game-action--button") > -1) {
                let act = el.getAttribute("data-action") || "";
                let val = el.getAttribute("data-action-value") || "";

                if(act == "navigate-level") {
                    let newLevel = parseInt(val);
                    let gs = new UserGameState();
                    let state = gs.getState();
                    state.currentLevel = newLevel;
                    gs.updateState(state);
                    window.location.reload();
                }
            }
        });

        this.__renderNav();
    }

    __updateViewOnShadowSettingChanged(isEnabled: boolean) {
        let affectedSections = this._helpEl.querySelectorAll(".game-setting--shadow-config");
        let affectedSelectBox = this._helpEl.querySelector("#game-setting--shadow-type");

        if(isEnabled) {
            affectedSections.forEach(e => {
                let e2 = e as HTMLElement;
                e2.style.opacity = "1";
            });
            affectedSelectBox?.removeAttribute('disabled');
        } else {
            affectedSections.forEach(e => {
                let e2 = e as HTMLElement;
                e2.style.opacity = "0";
            });
            affectedSelectBox?.setAttribute("disabled", "disabled");
        }
    }

    __renderNav() {
        let cs = new UserGameState().getState();
        let currentLevel = cs.currentLevel;
        let prevLevels = [];
        let maxLevel = cs.highestLevel;

        for(let i=0; i<= maxLevel; ++i) {
            let isCurrentLevel = i == currentLevel;
            let isLastLevel = i == GameConstants.MaxLevel;
            prevLevels.push({levelNum: i, isCurrentLevel: isCurrentLevel, isLastLevel: isLastLevel});
        }

        let tmplData = {currentLevel: currentLevel, allLevels: prevLevels};
        this._levelNavEl.innerHTML = this._tmplLevelNav(tmplData);
    }

    showHelp() {
        this._showModalCore(this._helpEl, {});
    }

    showLevelComplete() {
        this._showModalCore(this._completeEl, {});
    }

    _showModalCore(el: HTMLElement, opt: any) {
        const myModal = new bootstrap.Modal(el, opt);
        myModal.show();
    }
}