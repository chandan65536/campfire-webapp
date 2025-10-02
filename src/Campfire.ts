import './scss/styles.scss';

import Stats from 'three/examples/jsm/libs/stats.module.js';
import { GameEngine } from './game/GameEngine';
import { UserGameState } from './game/UserGameState';

function onReady(callback: () => void): void {
  if (document.readyState !== 'loading') {
    callback();
  } else {
    document.addEventListener('DOMContentLoaded', callback);
  }
}

onReady(() => {
  let canvasEl = document.querySelector(".webgl") as HTMLCanvasElement;
  let helpModal = document.getElementById("gameHelpModal");
  let levelCompleteModal = document.getElementById("gameLevelCompleteModal");
  let levelNavEl = document.getElementById("game-state--level-nav");

  if(canvasEl == null || helpModal == null || levelCompleteModal == null || levelNavEl == null) {
    alert("Can not initialize");
    console.log("ERROR: elements not defined in base page");
    return;
  }

  let mainGame = new GameEngine(canvasEl, helpModal, levelCompleteModal, levelNavEl);
  mainGame.setupScene();

  let stats = new Stats();
  let showFps = false;
  
  if(showFps){ 
    stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: custom
    stats.dom.style.top = canvasEl.offsetTop + "px";
    document.body.appendChild( stats.dom );
  }

  let animate = function () {
    if(showFps) stats.begin();

    mainGame.animate();

    if(showFps) stats.end();

    requestAnimationFrame(animate);
  };

  animate();
});
