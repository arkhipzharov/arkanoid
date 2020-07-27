import numToPx from './helpers/num-to-px.js';
import delay from './helpers/delay.js';
import randomBetween from './helpers/random-between.js';
import capitalizeFirstLetter from './helpers/capitalize-first-letter.js';
import reset from './mixins/reset.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.setupGame();
});

document.addEventListener('click', async () => {
  const game = new Game();
  await game.startGame();
});

class Game {
  static isPlaying = false;
  constructor() {
    Game.racketTop
      = document.querySelector('.game-area__inner').offsetHeight / 100 * 83;
    const staticDataToReset = {
      statsAndProgressData: {
        lives: 3,
        level: 1,
        finalLevel: 3,
        points: 0,
      },
      remainingBricksNum: null,
      isLose: false,
      isOnFinalLevel: false,
    };
    reset.register(Game, staticDataToReset, this, true);
  }
  setupGame() {
    const racketTop = Game.racketTop;
    const ballEl = document.querySelector('.ball');
    this.setGameAreaChildBasePositions(
      [
        {
          className: 'racket',
          top: racketTop,
        },
        {
          className: 'ball',
          top: racketTop - ballEl.offsetHeight,
        },
      ],
      true,
    );
    this.fillGameAreaWithBricks();
    this.refreshStatsAndProgressDOM();
    this.showHowToPlayInstructionOnce();
  }
  async startGame() {
    if (Game.isPlaying) return;
    Game.isPlaying = true;
    const ball = new BallMoving();
    await ball.movePossiblyProcessGameRecursive();
  }
  setGameAreaChildBasePositions(childClassesWithCoordsData, isCenter) {
    childClassesWithCoordsData.forEach((data) => {
      this.setCoordsGameAreaChild(data, isCenter);
    });
  }
  setCoordsGameAreaChild({ className, top, left }, isCenter) {
    const gameAreaRect = document
      .querySelector('.game-area__inner')
      .getBoundingClientRect();
    const child = document.querySelector(`.${className}`);
    const rect = child.getBoundingClientRect();
    const style = child.style;
    if (isCenter) {
      style.left = numToPx((gameAreaRect.width - rect.width) / 2);
    } else {
      style.left = numToPx(left);
    }
    style.top = numToPx(top);
  }
  fillGameAreaWithBricks() {
    const BRICKS_GRID_POINTS_MATRIXES_GROUPED_BY_LEVELS = [
      [
        [1, 2, 3, 4],
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
    BRICKS_GRID_POINTS_MATRIXES_GROUPED_BY_LEVELS[
      Game.statsAndProgressData.level - 1
    ].forEach((row) => row.forEach((points) => {
      bricksGrid.insertAdjacentHTML('beforeend', `
        <div
          class="
            bricks-grid__item
            ${points === null ? 'empty-space' : ''}
            bareer
          "
          data-points="${points}">${points}
        </div>
      `);
      if (points) {
        if (Game.remainingBricksNum === null) {
          Game.remainingBricksNum = 0;
        }
        Game.remainingBricksNum++;
      }
    }));
  }
  processGameAfterClashToBareer(elementsData, edgeNextToBareer) {
    const bareerEl = this.getBareerEl(elementsData, edgeNextToBareer);
    this.reducePlayerLivesAfterBallMovingClashGameAreaBottom(
      bareerEl,
      edgeNextToBareer,
    );
    this.possiblyRemoveBrickGetPoints(bareerEl);
  }
  getBareerEl(elementsData, edgeNextToBareer) {
    return elementsData[edgeNextToBareer].find(
      (el) => el.classList.contains('bareer'),
    );
  }
  possiblyRemoveBrickGetPoints(bareerEl) {
    const points = +(bareerEl.dataset && bareerEl.dataset.points);
    if (points) {
      bareerEl.classList.add('empty-space');
      let allPoints = Game.statsAndProgressData.points;
      allPoints += points;
      this.findStatsOrProgressDatasetElUpdateText('points', allPoints);
      Game.statsAndProgressData.points = allPoints;
      if (Game.remainingBricksNum > 1) {
        Game.remainingBricksNum--;
      } else {
        Game.reset('remainingBricksNum');
        this.refreshGame();
      }
    }
  }
  reducePlayerLivesAfterBallMovingClashGameAreaBottom(
    bareerEl,
    edgeNextToBareer,
  ) {
    if (
      !bareerEl.classList.contains('game-area')
      || edgeNextToBareer !== 'bottom'
    ) return;
    const livesEl = document
      .querySelector('[data-stat-or-progress-info-name="lives"]')
    let lives = Game.statsAndProgressData.lives;
    if (lives > 1) {
      lives--;
      livesEl.textContent = lives;
      Game.statsAndProgressData.lives = lives;
    } else {
      Game.isLose = true;
      this.refreshGame();
    }
  }
  refreshGame() {
    Game.isPlaying = false;
    const ballEl = document.querySelector(`.ball`);
    const racket = document.querySelector(`.racket`);
    this.setGameAreaChildBasePositions([
      {
        className: 'ball',
        top: Game.racketTop - ballEl.offsetHeight,
        left:
          RacketMoving.currRacketLeftRelativeToGameArea
          + ((racket.offsetWidth - ballEl.offsetWidth) / 2),
      },
    ]);
    this.possiblyChangeLevel();
    this.possiblyNotifyUserResetGameState();
    this.fillGameAreaWithBricks();
    BallMoving.reset();
  }
  possiblyChangeLevel() {
    if (Game.isLose) return;
    let level = Game.statsAndProgressData.level;
    if (level < Game.statsAndProgressData.finalLevel) {
      level++;
      Game.statsAndProgressData.level = level;
      this.findStatsOrProgressDatasetElUpdateText('level', level);
    } else {
      Game.isOnFinalLevel = true;
    }
  }
  possiblyNotifyUserResetGameState() {
    const { isLose, isOnFinalLevel } = Game;
    if (!(isLose || isOnFinalLevel)) return;
    if (isLose) {
      alert('You are dead, restarting the game');
    } else if (isOnFinalLevel) {
      alert('You are passed the whole game, play again if you want');
    }
    this.resetStateRefreshDOM();
  }
  resetStateRefreshDOM() {
    Game.reset();
    this.refreshStatsAndProgressDOM();
  }
  refreshStatsAndProgressDOM() {
    const elements = document.querySelectorAll(
      '[data-stat-or-progress-info-name]',
    );
    elements.forEach((el) => {
      el.textContent = Game.statsAndProgressData[
        el.dataset.statOrProgressInfoName
      ];
    });
  }
  findStatsOrProgressDatasetElUpdateText(datasetValue, valueAndFutureText) {
    const el = document.querySelector(
      `[data-stat-or-progress-info-name="${datasetValue}"]`,
    );
    el.textContent = valueAndFutureText;
  }
  showHowToPlayInstructionOnce() {
    if (localStorage.isHowToPlayInstructionShown) return;
    alert(
      'hover on game area with mouse to move racket, left click to start game'
    );
    localStorage.isHowToPlayInstructionShown = true;
  }
}

class BallMoving extends Game {
  constructor() {
    super();
    const baseJumpOffsetDirectionDeg = randomBetween(20, 60);
    this.baseJumpOffsetDirectionDeg = baseJumpOffsetDirectionDeg;
    // it will be always 2 values for angles after clash because we mirror
    // them to change ball direction completely
    this.newAngleAfterClash = 180 - 90 - baseJumpOffsetDirectionDeg;
    const dataToReset = {
      moveData: {
        // degrees, 360* is to the right side, and 180* to the left, clockwise.
        // Base currAngle will be 270 bcs it's perpendicular to racket
        currAngle: 270 + baseJumpOffsetDirectionDeg,
        // ball jumping from horizontal racket first
        edgeNextToBareerOld: 'bottom',
        oldTop: null,
        oldLeft: null,
      },
      baseTop: null,
      isMoving: false,
    };
    reset.register(BallMoving, dataToReset, this);
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
    let isMoving = this.isMoving;
    let moveData = this.moveData;
    if (!baseTop) {
      baseTop = top;
      this.baseTop = baseTop;
      isMoving = true;
      this.isMoving = isMoving;
      moveData.oldTop = top;
      moveData.oldLeft = left;
    }
    // incrementally move ball by >= 2px in Y coordinate after game start
    // to not get stuck in racket first because it's bareer
    if (top > baseTop - 2 && isMoving) {
      this.move(moveData, left, top);
      await delay(0);
      await this.movePossiblyProcessGameRecursive();
      return;
    }
    this.isMoving = false;
    const elementsData = this.getElementsDataFromPointsNextToAllEdges();
    const edgeNextToBareer = this.getMaxContactWithBareerPointsNumEdge(
      elementsData,
    );
    if (edgeNextToBareer) {
      let xCoordDirectionDegAntiClockwise;
      const { oldTop, oldLeft } = moveData;
      let newAngle;
      switch (edgeNextToBareer) {
        case 'top':
          xCoordDirectionDegAntiClockwise = 180;
          if (oldLeft < left) {
            newAngle = this.getNewAngle(
              xCoordDirectionDegAntiClockwise,
              true,
              false,
            );
          } else {
            newAngle = this.getNewAngle(
              xCoordDirectionDegAntiClockwise,
              false,
              false,
            );
          }
          break;
        case 'right':
          xCoordDirectionDegAntiClockwise = 270;
          if (oldTop < top) {
            newAngle = this.getNewAngle(
              xCoordDirectionDegAntiClockwise,
              true,
              true,
            );
          } else {
            newAngle = this.getNewAngle(
              xCoordDirectionDegAntiClockwise,
              false,
              true,
            );
          }
          break;
        case 'bottom':
          xCoordDirectionDegAntiClockwise = 360;
          if (oldLeft > left) {
            newAngle = this.getNewAngle(
              xCoordDirectionDegAntiClockwise,
              true,
              false,
            );
          } else {
            newAngle = this.getNewAngle(
              xCoordDirectionDegAntiClockwise,
              false,
              false,
            );
          }
          break;
        case 'left':
          xCoordDirectionDegAntiClockwise = 90;
          if (oldTop > top) {
            newAngle = this.getNewAngle(
              xCoordDirectionDegAntiClockwise,
              true,
              true,
            );
          } else {
            newAngle = this.getNewAngle(
              xCoordDirectionDegAntiClockwise,
              false,
              true,
            );
          }
          break;
      }
      moveData.currAngle = newAngle;
      moveData.edgeNextToBareerOld = edgeNextToBareer;
      moveData.oldTop = top;
      moveData.oldLeft = left;
      this.moveData = moveData;
      this.move(moveData, left, top);
      super.processGameAfterClashToBareer(elementsData, edgeNextToBareer);
      await delay(0);
      await this.movePossiblyProcessGameRecursive();
    } else {
      this.move(moveData, left, top);
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
  getNewAngle(
    xCoordDirectionDegAntiClockwise,
    isNewAngleSharp,
    isBaseJumpAngleRelativeToRacket,
  ) {
    const baseJumpOffsetDirectionDeg = this.baseJumpOffsetDirectionDeg;
    const newAngleAfterClash = this.newAngleAfterClash;
    const currSavedAngleFrom2Possible =
      isBaseJumpAngleRelativeToRacket
       ? baseJumpOffsetDirectionDeg
       : newAngleAfterClash
    let angle;
    if (isNewAngleSharp) {
      angle =
        xCoordDirectionDegAntiClockwise - 180 + currSavedAngleFrom2Possible;
    } else {
      angle = xCoordDirectionDegAntiClockwise - currSavedAngleFrom2Possible;
    }
    return angle;
  }
  move(moveData, left, top) {
    const style = document.querySelector('.ball').style;
    const angleRadian = moveData.currAngle * Math.PI / 180;
    // broser will update coords with this value as soon as he can, because we using
    // setTimeout(fun, 0) promisification
    const SPEED_PX = 2;
    style.left = numToPx(left + SPEED_PX * Math.cos(angleRadian));
    style.top = numToPx(top + SPEED_PX * Math.sin(angleRadian));
  }
}

document.addEventListener(
  'mousemove',
  (e) => {
    const racketMoving = new RacketMoving();
    racketMoving.moveRacketWhenMouseOverGameArea(e);
  },
  { passive: true }
);

class RacketMoving {
  static currRacketLeftRelativeToGameArea = null;
  moveRacketWhenMouseOverGameArea(e) {
    const gameAreaRect = document
      .querySelector('.game-area__inner')
      .getBoundingClientRect();
    const racket = document.querySelector(`.racket`);
    this.setElPositionBasedOnMouseMoveOverGameArea(gameAreaRect, e, racket);
    if (Game.isPlaying) return;
    const ballEl = document.querySelector(`.ball`);
    this.setElPositionBasedOnMouseMoveOverGameArea(gameAreaRect, e, ballEl, racket);
  }
  setElPositionBasedOnMouseMoveOverGameArea(
    gameAreaRect,
    mouseMoveEvent,
    el,
    elToCenterPrevElRelativeTo,
  ) {
    const elRect = el.getBoundingClientRect();
    const elWidth = elRect.width;
    const elWidthHalf = elWidth / 2;;
    const elStyle = el.style;
    const { left: gameAreaLeft, width: gameAreaWidth } = gameAreaRect;
    const clientX = mouseMoveEvent.clientX;
    const clientXRelativeToGameArea = clientX - gameAreaLeft;
    const gameAreaMiddleXCoord = gameAreaLeft + gameAreaWidth / 2;
    let elToCenterPrevElRelativeToWidth;
    let offsetToCenterElRelativeToOther = 0;
    if (elToCenterPrevElRelativeTo) {
      elToCenterPrevElRelativeToWidth = elToCenterPrevElRelativeTo.offsetWidth;
      offsetToCenterElRelativeToOther =
        (elToCenterPrevElRelativeToWidth - elWidth) / 2;
    }
    let newElLeftRelativeToGameArea;
    if (
      clientX > gameAreaLeft + offsetToCenterElRelativeToOther + elWidthHalf
      && clientX < gameAreaRect.right - elWidthHalf - offsetToCenterElRelativeToOther
    ) {
      newElLeftRelativeToGameArea = clientX - gameAreaLeft - elWidthHalf;
      elStyle.left = numToPx(newElLeftRelativeToGameArea);
    } else  {
      if (clientX < gameAreaMiddleXCoord) {
        newElLeftRelativeToGameArea = offsetToCenterElRelativeToOther;
      }
      if (clientX > gameAreaMiddleXCoord) {
        newElLeftRelativeToGameArea =
          gameAreaWidth
          - elWidth
          - offsetToCenterElRelativeToOther;
      }
      elStyle.left = numToPx(newElLeftRelativeToGameArea);
    }
    if (el.classList.contains('racket')) {
      RacketMoving.currRacketLeftRelativeToGameArea = newElLeftRelativeToGameArea;
    }
  }
}
