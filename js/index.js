import numToPx from './helpers/num-to-px.js';
import delay from './helpers/delay.js';
import randomBetween from './helpers/random-between.js';
import reset from './mixins/reset.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.setGameAreaChildBasePositions();
  game.fillGameAreaWithBricks();
  showHowToPlayInstructionOnce();
});

function showHowToPlayInstructionOnce() {
  if (localStorage.isHowToPlayInstructionShown) return;
  alert('press enter to start game, <- or -> to move racket');
  localStorage.isHowToPlayInstructionShown = true;
}

document.addEventListener('keydown', async (e) => {
  const keyCode = e.code;
  switch (keyCode) {
    case 'ArrowLeft':
    case 'ArrowRight':
      const racketMoving = new RacketMoving(keyCode);
      racketMoving.move();
      break;
    case 'Enter':
      const game = new Game();
      await game.startGame();
      break;
  }
});

class RacketMoving {
  constructor(keyCode) {
    this.keyCode = keyCode;
  }
  move() {
    const RACKET_X_MOVE_STEP = 60;
    const gameAreaRect = document
      .querySelector('.game-area__inner')
      .getBoundingClientRect();
    const racket = document.querySelector(`.racket`);
    const racketRect = racket.getBoundingClientRect();
    const racketLeft = racketRect.left - gameAreaRect.left;
    const racketStyle = racket.style;
    const keyCode = this.keyCode;
    switch (keyCode) {
      case 'ArrowLeft':
        if (racketLeft - RACKET_X_MOVE_STEP < 0) {
          racketStyle.left = numToPx(0);
        } else {
          racketStyle.left = numToPx(racketLeft - RACKET_X_MOVE_STEP);
        }
        break;
      case 'ArrowRight':
        if (racketRect.right + RACKET_X_MOVE_STEP > gameAreaRect.right) {
          racketStyle.left = numToPx(gameAreaRect.width - racketRect.width);
        } else {
          racketStyle.left = numToPx(racketLeft + RACKET_X_MOVE_STEP);
        }
        break;
    }
    if (Game.isPlaying) return;
    const ballEl = document.querySelector(`.ball`);
    const ballRect = ballEl.getBoundingClientRect();;
    const ballLeft = ballRect.left - gameAreaRect.left;
    const ballStyle = ballEl.style;
    switch (keyCode) {
      case 'ArrowLeft':
        if (racketLeft - RACKET_X_MOVE_STEP < 0) {
          ballStyle.left = numToPx((racketRect.width - ballRect.width) / 2);
        } else {
          ballStyle.left = numToPx(ballLeft - RACKET_X_MOVE_STEP);
        }
        break;
      case 'ArrowRight':
        if (racketRect.right + RACKET_X_MOVE_STEP > gameAreaRect.right) {
          ballStyle.left = numToPx(gameAreaRect.width - ((racketRect.width - ballRect.width) / 2 + ballRect.width));
        } else {
          ballStyle.left = numToPx(ballLeft + RACKET_X_MOVE_STEP);
        }
        break;
    }
  }
}

class Game {
  static basePlayerLifes = 3;
  static currLevelInd = 0;
  static finalLevelInd = 2;
  static remainingBricksNum = null;
  static isPlaying = false;
  constructor() {
    Game.currPlayerLifes = Game.basePlayerLifes;
  }
  async startGame() {
    if (Game.isPlaying) return;
    Game.isPlaying = true;
    const ballEl = document.querySelector(`.ball`);
    ballEl.classList.remove('moving-with-racket');
    const ball = new Ball();
    await ball.movePossiblyProcessGameRecursive();
  }
  setGameAreaChildBasePositions() {
    const RACKET_TOP = 250;
    this.centerAndSetBottomCoordGameAreaChild('racket', RACKET_TOP);
    const ballEl = document.querySelector('.ball');
    this.centerAndSetBottomCoordGameAreaChild(
      'ball',
      RACKET_TOP - ballEl.offsetHeight,
    );
  }
  centerAndSetBottomCoordGameAreaChild(className, top) {
    const gameAreaRect = document
      .querySelector('.game-area__inner')
      .getBoundingClientRect();
    const child = document.querySelector(`.${className}`);
    const rect = child.getBoundingClientRect();
    const style = child.style;
    style.left = numToPx((gameAreaRect.width - rect.width) / 2);
    style.top = numToPx(top);
  }
  fillGameAreaWithBricks() {
    // null is empty space instead of brick
    const BRICKS_GRID_POINTS_MATRIXES_GROUPED_BY_LEVELS = [
      [
        [1, 2, 3, 4]
      ],
      [
        [null, 1, null, 4],
        [2, null, null, 3]
      ],
      [
        [4, null, 2, 3],
        [3, 1, null, 1]
      ],
    ];
    const bricksGrid = document.querySelector('.bricks-grid');
    if (bricksGrid.firstElementChild) {
      bricksGrid.innerHTML = '';
    }
    BRICKS_GRID_POINTS_MATRIXES_GROUPED_BY_LEVELS[Game.currLevelInd].forEach(
      (row) => row.forEach(
        (pointsNum) => {
          bricksGrid.insertAdjacentHTML('beforeend', `
            <div
              class="
                bricks-grid__item
                ${pointsNum === null ? 'empty-space' : ''}
                bareer
              "
              data-points="${pointsNum}">${pointsNum}
            </div>
          `);
          if (pointsNum) {
            if (!Game.remainingBricksNum === null) {
              Game.remainingBricksNum = 0;
            }
            Game.remainingBricksNum++;
          }
        }
      )
    );
  }
  processGameAfterClashToBareer(elementsData, edgeNextToBareer) {
    const bareerEl = this.getBareerEl(elementsData, edgeNextToBareer);
    this.possiblyRemoveBrickGetPoints(bareerEl);
    this.reducePlayerLifesAfterBallClashGameAreaBottom(bareerEl, edgeNextToBareer);
  }
  getBareerEl(elementsData, edgeNextToBareer) {
    return elementsData[edgeNextToBareer].find(
      (el) => el.classList.contains('bareer'),
    );
  }
  possiblyRemoveBrickGetPoints(bareerEl) {
    const pointsNum = bareerEl.dataset && bareerEl.dataset.points;
    if (pointsNum) {
      bareerEl.classList.add('empty-space');
      if (Game.remainingBricksNum > 1) {
        Game.remainingBricksNum--;
      } else {
        Game.remainingBricksNum = null;
        this.restartGameChangeLevel();
      }
    }
  }
  reducePlayerLifesAfterBallClashGameAreaBottom(bareerEl, edgeNextToBareer) {
    if (Game.currPlayerLifes > 1) {
      Game.currPlayerLifes--;
    } else {
      Game.currPlayerLifes = Game.basePlayerLifes;
    }
  }
  restartGameChangeLevel() {
    Game.isPlaying = false;
    const ballEl = document.querySelector(`.ball`);
    ballEl.classList.add('moving-with-racket');
    this.setGameAreaChildBasePositions();
    if (Game.currLevelInd === Game.finalLevelInd) {
      Game.currLevelInd = 0;
    } else {
      Game.currLevelInd++;
    }
    this.fillGameAreaWithBricks();
    this.reset();
  }
}

class Ball extends Game {
  constructor() {
    super();
    const BASE_JUMP_OFFSET_DIRECTION_DEG = randomBetween(30, 60);
    this.BASE_JUMP_OFFSET_DIRECTION_DEG
      = BASE_JUMP_OFFSET_DIRECTION_DEG;
    // it will be always 2 values for angles after clash because we mirror
    // them to change ball direction completely
    this.NEW_ANGLE_AFTER_CLASH = 180 - 90 - BASE_JUMP_OFFSET_DIRECTION_DEG;
    const dataToReset = {
      movementData: {
        // degrees, 360* is to the right side, and 180* to the left, clockwise.
        // Base currAngle will be 270 bcs it's perpendicular to racket
        currAngle: 270 + BASE_JUMP_OFFSET_DIRECTION_DEG,
        // ball jumping from horizontal racket first
        edgeNextToBareerOld: 'bottom',
        oldTop: null,
        oldLeft: null,
      },
      baseTop: null,
      isMovingToNotStuckInBareerAtStart: false,
    };
    reset.init(Ball, dataToReset, this);
  }
  async movePossiblyProcessGameRecursive() {
    if (!Game.isPlaying) return;
    const gameAreaRect = document
      .querySelector('.game-area__inner')
      .getBoundingClientRect();
    const ballEl = document.querySelector('.ball');
    let rect = ballEl.getBoundingClientRect();
    let left = rect.left - gameAreaRect.left;
    let top = rect.top - gameAreaRect.top;
    let baseTop = this.baseTop;
    let isMovingToNotStuckInBareerAtStart
      = this.isMovingToNotStuckInBareerAtStart;
    let movementData = this.movementData;
    if (!baseTop) {
      this.lmao = true;
      baseTop = top;
      this.baseTop = baseTop;
      isMovingToNotStuckInBareerAtStart = true;
      this.isMovingToNotStuckInBareerAtStart
        = isMovingToNotStuckInBareerAtStart;
      movementData.oldTop = top;
      movementData.oldLeft = left;
    }
    // incrementally move ball by >= 2px in Y coordinate after game start
    // to not get stuck in racket first because it's bareer
    if (top > baseTop - 2 && isMovingToNotStuckInBareerAtStart) {
      this.move(movementData, left, top);
      await delay(0);
      await this.movePossiblyProcessGameRecursive();
      return;
    }
    this.isMovingToNotStuckInBareerAtStart = false;
    const BASE_JUMP_OFFSET_DIRECTION_DEG
      = this.BASE_JUMP_OFFSET_DIRECTION_DEG;
    const NEW_ANGLE_AFTER_CLASH = this.NEW_ANGLE_AFTER_CLASH;
    const elementsData = this.getElementsDataFromPointsNextToAllEdges();
    const edgeNextToBareer = this.getMaxContactWithBareerPointsNumEdge(elementsData);
    if (edgeNextToBareer) {
      let angleNew;
      const { oldTop, oldLeft } = movementData;
      let xCoordDirectionDegAntiClockwise;
      switch (edgeNextToBareer) {
        case 'top':
          xCoordDirectionDegAntiClockwise = 180;
          if (oldLeft < left) {
            angleNew
              = xCoordDirectionDegAntiClockwise
                - 180
                + BASE_JUMP_OFFSET_DIRECTION_DEG;
          } else {
            angleNew
              = xCoordDirectionDegAntiClockwise
                - BASE_JUMP_OFFSET_DIRECTION_DEG;
          }
          break;
        case 'right':
          xCoordDirectionDegAntiClockwise = 270;
          if (oldTop < top) {
            angleNew
              = xCoordDirectionDegAntiClockwise
                - 180
                + NEW_ANGLE_AFTER_CLASH;
          } else {
            angleNew
              = xCoordDirectionDegAntiClockwise
                - NEW_ANGLE_AFTER_CLASH;
          }
          break;
        case 'bottom':
          xCoordDirectionDegAntiClockwise = 360;
          if (oldLeft > left) {
            angleNew
              = xCoordDirectionDegAntiClockwise
                - 180
                + BASE_JUMP_OFFSET_DIRECTION_DEG;
          } else {
            angleNew
              = xCoordDirectionDegAntiClockwise
                - BASE_JUMP_OFFSET_DIRECTION_DEG;
          }
          break;
        case 'left':
          xCoordDirectionDegAntiClockwise = 90;
          if (oldTop > top) {
            angleNew
              = xCoordDirectionDegAntiClockwise
                - 180
                + NEW_ANGLE_AFTER_CLASH;
          } else {
            angleNew
              = xCoordDirectionDegAntiClockwise
                - NEW_ANGLE_AFTER_CLASH;
          }
          break;
      }
      movementData.currAngle = angleNew;
      movementData.edgeNextToBareerOld = edgeNextToBareer;
      movementData.oldTop = top;
      movementData.oldLeft = left;
      this.movementData = movementData;
      this.move(movementData, left, top);
      super.processGameAfterClashToBareer(elementsData, edgeNextToBareer);
      await delay(0);
      await this.movePossiblyProcessGameRecursive();
    } else {
      this.move(movementData, left, top);
      await delay(0);
      await this.movePossiblyProcessGameRecursive();
    }
  }
  getElementsDataFromPointsNextToAllEdges() {
    const rect = document.querySelector('.ball').getBoundingClientRect();
    const areasNextToEdgesToCheckBareerCoords = {
      top: rect.top - 1,
      right: rect.right + 1,
      bottom: rect.bottom + 1,
      left: rect.left - 1,
    };
    const elementsDataGroupedByEdges = {
      top: [],
      right: [],
      bottom: [],
      left: [],
    }
    let nextToEdgeAreaToCheckBareersLength;
    nextToEdgeAreaToCheckBareersLength = rect.width + 2;
    for (let i = 0; i < nextToEdgeAreaToCheckBareersLength; i++) {
      // skipping most of area because only 2 edgepoints will always clash to
      // bareer if it's near
      if (i > 2 && i < nextToEdgeAreaToCheckBareersLength - 1) continue;
      const pointX = areasNextToEdgesToCheckBareerCoords.left + i;
      elementsDataGroupedByEdges
        .top
        .push(
          document.elementFromPoint(
            pointX,
            areasNextToEdgesToCheckBareerCoords.top,
          ),
        );
      elementsDataGroupedByEdges
        .bottom
        .push(
          document.elementFromPoint(
            pointX,
            areasNextToEdgesToCheckBareerCoords.bottom,
          ),
        );
    }
    nextToEdgeAreaToCheckBareersLength = rect.height + 2;
    for (let i = 0; i < nextToEdgeAreaToCheckBareersLength; i++) {
      if (i > 1 && i < nextToEdgeAreaToCheckBareersLength - 1) continue;
      const pointY = areasNextToEdgesToCheckBareerCoords.top + i;
      elementsDataGroupedByEdges
        .left
        .push(
          document.elementFromPoint(
            areasNextToEdgesToCheckBareerCoords.left,
            pointY,
          ),
        );
      elementsDataGroupedByEdges
        .right
        .push(
          document.elementFromPoint(
            areasNextToEdgesToCheckBareerCoords.right,
            pointY,
          ),
        );
    }
    return elementsDataGroupedByEdges;
  }
  getMaxContactWithBareerPointsNumEdge(elementsData) {
    let maxContactWithBareerPointsNumEdge;
    Object.keys(elementsData).reduce((maxContactWithBareerPointsNum, edge) => {
      const maxContactWithBareerPointsNumNew = elementsData[edge]
        .filter((el) => el.classList.contains('bareer')).length;
      if (maxContactWithBareerPointsNumNew > maxContactWithBareerPointsNum) {
        maxContactWithBareerPointsNumEdge = edge;
        return maxContactWithBareerPointsNumNew;
      }
      return maxContactWithBareerPointsNum;
    }, 0);
    return maxContactWithBareerPointsNumEdge;
  }
  move(movementData, left, top) {
    const style = document.querySelector('.ball').style;
    const angleRadian = movementData.currAngle * Math.PI / 180;
    // broser will update coords with this value as soon as he can, because we using
    // setTimeout(0) promisification
    const SPEED_PX = 2;
    style.left = numToPx(left + SPEED_PX * Math.cos(angleRadian));
    style.top = numToPx(top + SPEED_PX * Math.sin(angleRadian));
  }
}
