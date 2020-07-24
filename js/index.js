import numToPx from './helpers/num-to-px.js';
import delay from './helpers/delay.js';
import randomBetween from './helpers/random-between.js';
import capitalizeFirstLetter from './helpers/capitalize-first-letter.js';
import reset from './mixins/reset.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  const RACKET_TOP = 250;
  const ballEl = document.querySelector('.ball');
  game.setGameAreaChildBasePositions(
    [
      {
        className: 'racket',
        top: RACKET_TOP,
      },
      {
        className: 'ball',
        top: RACKET_TOP - ballEl.offsetHeight,
      },
    ],
    true,
  );
  game.fillGameAreaWithBricks();
  game.setPlayerStatsAndGameInfo();
  showHowToPlayInstructionOnce();
});

function showHowToPlayInstructionOnce() {
  if (localStorage.isHowToPlayInstructionShown) return;
  alert('press enter to start game, <- or -> to move racket');
  localStorage.isHowToPlayInstructionShown = true;
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

document.addEventListener('click', async (e) => {
  const game = new Game();
  await game.startGame();
});

class Game {
  static RACKET_TOP = 250;
  static statsAndProgressData = {
    lifes: 3,
    level: 1,
    finalLevel: 3,
    points: 0,
  };
  static STAT_OR_PROGRESS_INFO_NAMES = ['level', 'lifes', 'points'];
  static remainingBricksNum = null;
  static isPlaying = false;
  constructor() {
    reset.init(Game, ['statsAndProgressData'], this);
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
        if (!Game.remainingBricksNum === null) {
          Game.remainingBricksNum = 0;
        }
        Game.remainingBricksNum++;
      }
    }));
  }
  setPlayerStatsAndGameInfo() {
    const statsEl = document.querySelector('.stats__inner');
    Game.STAT_OR_PROGRESS_INFO_NAMES.forEach(
      (name) => {
        statsEl.insertAdjacentHTML('beforeend', `
          <li class="stats__item">
            <span>
              ${capitalizeFirstLetter(name)}:
            </span>
            <span data-stat-or-progress-info-name="${name}">
              ${Game.statsAndProgressData[name]}
            </span>
          </li>
        `);
      }
    )
  }
  processGameAfterClashToBareer(elementsData, edgeNextToBareer) {
    const bareerEl = this.getBareerEl(elementsData, edgeNextToBareer);
    this.possiblyRemoveBrickGetPoints(bareerEl);
    this.reducePlayerLifesAfterBallMovingClashGameAreaBottom(
      bareerEl,
      edgeNextToBareer,
    );
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
      if (Game.remainingBricksNum > 1) {
        let allPoints = Game.statsAndProgressData.points;
        allPoints += points;
        this.findDatasetElUpdateText('points', allPoints);
        Game.statsAndProgressData.points = allPoints;
        Game.remainingBricksNum--;
      } else {
        Game.remainingBricksNum = null;
        this.resetGameDataChangeLevel();
      }
    }
  }
  async reducePlayerLifesAfterBallMovingClashGameAreaBottom(
    bareerEl,
    edgeNextToBareer,
  ) {
    if (
      !bareerEl.classList.contains('game-area')
      || edgeNextToBareer !== 'bottom'
    ) return;
    const lifesEl = document
      .querySelector('[data-stat-or-progress-info-name="lifes"]')
    let lifes = Game.statsAndProgressData.lifes;
    if (lifes > 1) {
      lifes--;
      lifesEl.textContent = lifes;
      Game.statsAndProgressData.lifes = lifes;
    } else {
      lifesEl.textContent = 0;
      Game.reset();
      lifes = Game.statsAndProgressData.lifes;
      // for user to see new lifes number before  alert
      await delay(0);
      alert('You are lose, restarting game');
      lifesEl.textContent = lifes;
      await this.resetGameDataChangeLevel(true);
    }
  }
  resetGameDataChangeLevel(isLose, isWin) {
    Game.isPlaying = false;
    const ballEl = document.querySelector(`.ball`);
    const racket = document.querySelector(`.racket`);
    this.setGameAreaChildBasePositions([
      {
        className: 'ball',
        top: Game.RACKET_TOP - ballEl.offsetHeight,
        left:
          RacketMoving.currRacketLeftRelativeToGameArea
          + ((racket.offsetWidth - ballEl.offsetWidth) / 2),
      },
    ]);
    this.changeLevel(isLose);
    this.fillGameAreaWithBricks();
    if (!isLose) return;
    this.resetStatsOrProgress();
  }
  changeLevel(isLose) {
    let level = Game.statsAndProgressData.level;
    let isPassedWholeGame;
    if (level === Game.statsAndProgressData.finalLevel) {
      alert('You are passed the whole game, play again if you want');
      level = 1;
      isPassedWholeGame = true;
    } else if (!isLose) {
      level++;
      this.findDatasetElUpdateText('level', level);
    }
    Game.statsAndProgressData.level = level;
    if (!isPassedWholeGame) return;
    this.resetStatsOrProgress();
  }
  resetStatsOrProgress() {
    Game.reset();
    Game.STAT_OR_PROGRESS_INFO_NAMES.forEach((name) => {
      this.findDatasetElUpdateText(name, Game.statsAndProgressData[name]);
    });
  }
  findDatasetElUpdateText(datasetValue, valueAndFutureText) {
    const el = document.querySelector(
      `[data-stat-or-progress-info-name="${datasetValue}"]`,
    );
    el.textContent = valueAndFutureText;
  }
}

class BallMoving extends Game {
  constructor() {
    super();
    const BASE_JUMP_OFFSET_DIRECTION_DEG = randomBetween(30, 60);
    this.BASE_JUMP_OFFSET_DIRECTION_DEG =
      BASE_JUMP_OFFSET_DIRECTION_DEG;
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
      isMoving: false,
    };
    reset.init(BallMoving, dataToReset, this);
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
    let movementData = this.movementData;
    if (!baseTop) {
      baseTop = top;
      this.baseTop = baseTop;
      isMoving = true;
      this.isMoving = isMoving;
      movementData.oldTop = top;
      movementData.oldLeft = left;
    }
    // incrementally move ball by >= 2px in Y coordinate after game start
    // to not get stuck in racket first because it's bareer
    if (top > baseTop - 2 && isMoving) {
      this.move(movementData, left, top);
      await delay(0);
      await this.movePossiblyProcessGameRecursive();
      return;
    }
    this.isMoving = false;
    const BASE_JUMP_OFFSET_DIRECTION_DEG =
      this.BASE_JUMP_OFFSET_DIRECTION_DEG;
    const NEW_ANGLE_AFTER_CLASH = this.NEW_ANGLE_AFTER_CLASH;
    const elementsData = this.getElementsDataFromPointsNextToAllEdges();
    const edgeNextToBareer = this.getMaxContactWithBareerPointsNumEdge(
      elementsData,
    );
    if (edgeNextToBareer) {
      let angleNew;
      const { oldTop, oldLeft } = movementData;
      let xCoordDirectionDegAntiClockwise;
      switch (edgeNextToBareer) {
        case 'top':
          xCoordDirectionDegAntiClockwise = 180;
          if (oldLeft < left) {
            angleNew =
              xCoordDirectionDegAntiClockwise
              - 180
              + BASE_JUMP_OFFSET_DIRECTION_DEG;
          } else {
            angleNew =
              xCoordDirectionDegAntiClockwise - BASE_JUMP_OFFSET_DIRECTION_DEG;
          }
          break;
        case 'right':
          xCoordDirectionDegAntiClockwise = 270;
          if (oldTop < top) {
            angleNew =
              xCoordDirectionDegAntiClockwise
              - 180
              + NEW_ANGLE_AFTER_CLASH;
          } else {
            angleNew =
              xCoordDirectionDegAntiClockwise - NEW_ANGLE_AFTER_CLASH;
          }
          break;
        case 'bottom':
          xCoordDirectionDegAntiClockwise = 360;
          if (oldLeft > left) {
            angleNew =
              xCoordDirectionDegAntiClockwise
              - 180
              + BASE_JUMP_OFFSET_DIRECTION_DEG;
          } else {
            angleNew =
              xCoordDirectionDegAntiClockwise
              - BASE_JUMP_OFFSET_DIRECTION_DEG;
          }
          break;
        case 'left':
          xCoordDirectionDegAntiClockwise = 90;
          if (oldTop > top) {
            angleNew =
              xCoordDirectionDegAntiClockwise - 180 + NEW_ANGLE_AFTER_CLASH;
          } else {
            angleNew = xCoordDirectionDegAntiClockwise - NEW_ANGLE_AFTER_CLASH;
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
    // setTimeout(fun, 0) promisification
    const SPEED_PX = 2;
    style.left = numToPx(left + SPEED_PX * Math.cos(angleRadian));
    style.top = numToPx(top + SPEED_PX * Math.sin(angleRadian));
  }
}
