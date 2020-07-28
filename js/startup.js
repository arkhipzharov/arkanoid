import delay from './helpers/delay.js';
import randomBetween from './helpers/random-between.js';
import move from './mixins/move.js';
import reset from './mixins/reset.js';

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.setupGame();
});

document.addEventListener('click', async (e) => {
  const game = new Game();
  await game.startGame();
});

document.querySelector('.settings-button').addEventListener('click', (e) => {
  const game = new Game();
  game.possiblySetNewCannonShotsLevelByUser(e);
});

class Game {
  static isPlaying = false;
  static cannonShotsLevel = 2;
  static finalLevel = null;
  static BASE_LEVEL = 1;
  constructor() {
    const staticDataToReset = {
      statsAndProgressData: {
        lives: 3,
        level: Game.BASE_LEVEL,
        points: 0,
      },
      remainingBricksNum: null,
      isLose: false,
      isOnFinalLevel: false,
    };
    reset.register(Game, staticDataToReset, this, true);
    move(this);
  }
  setupGame() {
    this.setOrGetCannonShotsLevelWithStorage();
    this.setCurrBaseElCoordsData();
    this.setGameAreaChildBasePositions(true);
    this.fillGameAreaWithBricks();
    this.refreshStatsAndProgressDOM();
    this.showHowToPlayInstructionOnce();
  }
  setOrGetCannonShotsLevelWithStorage() {
    let cannonShotsLevel = Game.cannonShotsLevel;
    const cannonShotsLevelStorage = +(localStorage.cannonShotsLevel);
    if (cannonShotsLevelStorage) {
      cannonShotsLevel = cannonShotsLevelStorage;
    } else {
      localStorage.cannonShotsLevel = cannonShotsLevel;
    }
    Game.cannonShotsLevel = cannonShotsLevel;
  }
  setCurrBaseElCoordsData() {
    const racketTop = document
      .querySelector('.game-area__inner').offsetHeight / 100 * 83;
    Game.currBaseElCoordsDataGroupedByClasses = {
      'racket': {
        isCenterOnSetup: true,
        top: racketTop,
      },
      'ball': {
        isCenterOnSetup: true,
        top: racketTop - document.querySelector('.ball').offsetHeight,
        left: null,
      },
      'cannon-shots': {
        isCenterOnSetup: false,
        top: -(100 + document.querySelector('.cannon-shots').offsetHeight),
        left: 0,
      },
    };
  }
  setGameAreaChildBasePositions(isSetup) {
    const data = Game.currBaseElCoordsDataGroupedByClasses;
    Object.keys(data).forEach((className) => {
      this.setCoordsGameAreaChild(className, data[className], isSetup);
    });
  }
  setCoordsGameAreaChild(
    className,
    { top, left, isCenterOnSetup },
    isSetup,
  ) {
    const gameAreaRect = document
      .querySelector('.game-area__inner')
      .getBoundingClientRect();
    const child = document.querySelector(`.${className}`);
    const rect = child.getBoundingClientRect();
    this.setElCoords(
      child,
      isCenterOnSetup && isSetup
        ? (gameAreaRect.width - rect.width) / 2
        : left,
      top,
    );
  }
  async startGame() {
    if (Game.isPlaying) return;
    Game.isPlaying = true;
    const ballMove = new BallMove();
    BallMove.isMoving = true;
    await ballMove.movePossiblyProcessGameRecursive();
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
    Game.finalLevel = BRICKS_GRID_POINTS_MATRIXES_GROUPED_BY_LEVELS.length;
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
          data-points="${points}"
          data-max-clashes="${randomBetween(1, 3)}"
        >
          ${points}
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
  async processGameAfterClashToBareer(elementsData, edgeNextToBareer) {
    const bareerEl = this.getBareerEl(elementsData, edgeNextToBareer);
    await Promise.all([
      this.reducePlayerLivesAfterBallMovingClashGameAreaBottom(
        bareerEl,
        edgeNextToBareer,
      ),
      this.possiblyRemoveBrickGetPoints(bareerEl)
    ]);
  }
  getBareerEl(elementsData, edgeNextToBareer) {
    return elementsData[edgeNextToBareer].find(
      (el) => el.classList.contains('bareer'),
    );
  }
  async possiblyRemoveBrickGetPoints(bareerEl) {
    const dataset = bareerEl.dataset;
    let maxClashes = +(dataset && dataset.maxClashes);
    if (!maxClashes) return;
    if (maxClashes > 1) {
      maxClashes--;
      dataset.maxClashes = maxClashes;
      return;
    }
    const points = +(dataset.points);
    bareerEl.classList.add('empty-space');
    let allPoints = Game.statsAndProgressData.points;
    allPoints += points;
    this.findStatsOrProgressDatasetElUpdateText('points', allPoints);
    Game.statsAndProgressData.points = allPoints;
    if (Game.remainingBricksNum > 1) {
      Game.remainingBricksNum--;
    } else {
      Game.reset('remainingBricksNum');
      await this.refreshGame();
    }
  }
  async reducePlayerLivesAfterBallMovingClashGameAreaBottom(
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
      await this.refreshGame();
    }
  }
  async refreshGame() {
    BallMove.isMoving = false;
    await this.possiblyStartCannonShots();
    Game.isPlaying = false;
    this.refreshRacketAndBallLeftData();
    this.possiblyChangeLevel();
    this.possiblyNotifyUserResetGameState();
    this.possiblyMakeBallVisibleAgainAfterCannonShots();
    this.setGameAreaChildBasePositions();
    this.fillGameAreaWithBricks();
    BallMove.reset();
  }
  refreshRacketAndBallLeftData() {
    const gameArea = document.querySelector(`.game-area`);
    const ballEl = document.querySelector(`.ball`);
    const racketEl = document.querySelector(`.racket`);
    const racketLeftRelative = racketEl.offsetLeft;
    const { racket: racketData, ball: ballData } =
      Game.currBaseElCoordsDataGroupedByClasses;
    ballData.left = racketLeftRelative + (racketEl.offsetWidth - ballEl.offsetWidth) / 2;
  }
  possiblyChangeLevel() {
    if (Game.isLose) return;
    let level = Game.statsAndProgressData.level;
    if (level < Game.finalLevel) {
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
  possiblyMakeBallVisibleAgainAfterCannonShots() {
    const ballElClassList = document.querySelector('.ball').classList;
    if (!ballElClassList.contains('empty-space')) return;
    ballElClassList.remove('empty-space');
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
  async possiblyStartCannonShots() {
    if (
      Game.remainingBricksNum === null
      && Game.statsAndProgressData.level === Game.cannonShotsLevel
    ) {
      const cannonShotsMove = new CannonShotsMove();
      const racketMove = new RacketMove();
      await Promise.all([
        cannonShotsMove.move(),
        racketMove.watchCannonShotsForClashRecursive(),
      ]);
    }
  }
  showHowToPlayInstructionOnce() {
    if (localStorage.isHowToPlayInstructionShown) return;
    alert(
      'hover on game area with mouse to move racket, left click to start game'
    );
    localStorage.isHowToPlayInstructionShown = true;
  }
  possiblySetNewCannonShotsLevelByUser(e) {
    e.stopPropagation();
    const minLevel = Game.BASE_LEVEL;
    const maxLevel = Game.finalLevel;
    let isInputValidOrClosingPopup;
    while (!isInputValidOrClosingPopup) {
      const newLevel = prompt(
        `
          Choose on which level you will face cannon shots.
          Min level - ${minLevel}, max level - ${maxLevel}
        `,
        Game.cannonShotsLevel,
      );
      const newLevelNum = +newLevel;
      if (
        newLevel !== null
        && (!newLevelNum || newLevelNum < minLevel || newLevelNum > maxLevel)
      ) {
        alert('Level number is incorrect, try again');
        continue;
      }
      if (newLevelNum) {
        Game.cannonShotsLevel = newLevelNum;
        localStorage.cannonShotsLevel = newLevelNum;
      }
      isInputValidOrClosingPopup = true;
    }
  }
}

class BallMove extends Game {
  static isMoving = true;
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
      isMovingToNotStuckAtStart: false,
    };
    reset.register(BallMove, dataToReset, this);
  }
  async movePossiblyProcessGameRecursive() {
    if (!BallMove.isMoving) return;
    const gameAreaRect = document
      .querySelector('.game-area__inner')
      .getBoundingClientRect();
    const ballEl = document.querySelector('.ball');
    let rect = ballEl.getBoundingClientRect();
    let left = rect.left - gameAreaRect.left;
    let top = rect.top - gameAreaRect.top;
    let baseTop = this.baseTop;
    let moveData = this.moveData;
    let isMovingToNotStuckAtStart = this.isMovingToNotStuckAtStart;
    if (!baseTop) {
      baseTop = top;
      this.baseTop = baseTop;
      isMovingToNotStuckAtStart = true;
      this.isMovingToNotStuckAtStart = isMovingToNotStuckAtStart;
      moveData.oldTop = top;
      moveData.oldLeft = left;
    }
    // incrementally move ball by >= 2px in Y coordinate after game start
    // to not get stuck in racket first because it's bareer, mb it's because
    // of subpixel rendering, but cause not found
    if (top > baseTop - 2 && isMovingToNotStuckAtStart) {
      this.move(left, top);
      await delay(0);
      await this.movePossiblyProcessGameRecursive();
      return;
    }
    this.isMovingToNotStuckAtStart = false;
    const elementsData = this.getElementsDataFromPointsNextToAllEdges('ball');
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
      this.move(left, top);
      await super.processGameAfterClashToBareer(elementsData, edgeNextToBareer);
      await delay(0);
      await this.movePossiblyProcessGameRecursive();
    } else {
      this.move(left, top);
      await delay(0);
      await this.movePossiblyProcessGameRecursive();
    }
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
  move(left, top) {
    const angleRadian = this.moveData.currAngle * Math.PI / 180;
    const SPEED_PX = 2;
    this.setElCoords(
      'ball',
      left + SPEED_PX * Math.cos(angleRadian),
      top + SPEED_PX * Math.sin(angleRadian),
    );
  }
}

document.addEventListener(
  'mousemove',
  (e) => {
    const racketMove = new RacketMove();
    racketMove.moveWhenMouseOverGameArea(e);
  },
  { passive: true }
);

export default class RacketMove {
  constructor() {
    move(this);
  }
  moveWhenMouseOverGameArea(e) {
    this.refreshRacketAndBallPositionBasedOnMouseMoveOverGameArea(e);
  }
  refreshRacketAndBallPositionBasedOnMouseMoveOverGameArea(e) {
    const gameAreaRect = document
      .querySelector('.game-area__inner')
      .getBoundingClientRect();
    const racketEl = document.querySelector(`.racket`);
    const ballEl = document.querySelector(`.ball`);
    const racketRect = racketEl.getBoundingClientRect();
    const ballRect = ballEl.getBoundingClientRect();
    const racketWidth = racketRect.width;
    const racketWidthHalf = racketWidth / 2;
    const ballWidth = ballRect.width;
    const { left: gameAreaLeft, width: gameAreaWidth } = gameAreaRect;
    const clientX = e.clientX;
    const clientXRelativeToGameArea = clientX - gameAreaLeft;
    const gameAreaMiddleXCoord = gameAreaLeft + gameAreaWidth / 2;
    const ballOffsetToCenterInRacket = (racketWidth - ballRect.width) / 2;
    let newRacketLeftRelativeToGameArea;
    if (
      clientX > gameAreaLeft + racketWidthHalf
      && clientX < gameAreaRect.right - racketWidthHalf
    ) {
      newRacketLeftRelativeToGameArea = clientX - gameAreaLeft - racketWidthHalf;
      this.setElCoords(racketEl, newRacketLeftRelativeToGameArea);
      if (Game.isPlaying && !CannonShotsMove.isMoving) return;
      this.setElCoords(
        ballEl,
        newRacketLeftRelativeToGameArea + ballOffsetToCenterInRacket,
      );
    } else  {
      if (clientX < gameAreaMiddleXCoord) {
        newRacketLeftRelativeToGameArea = 0;
      }
      if (clientX > gameAreaMiddleXCoord) {
        newRacketLeftRelativeToGameArea = gameAreaWidth - racketWidth;
      }
      this.setElCoords(racketEl, newRacketLeftRelativeToGameArea);
      if (Game.isPlaying && !CannonShotsMove.isMoving) return;
      this.setElCoords(
        ballEl,
        newRacketLeftRelativeToGameArea + ballOffsetToCenterInRacket,
      );
    }
  }
  async watchCannonShotsForClashRecursive() {
    if (!CannonShotsMove.isMoving) return;
    const elementsData = this.getElementsDataFromPointsNextToAllEdges('racket', true);
    if (
      Object.keys(elementsData).some((edge) => elementsData[edge].some((el) => {
        const elClassList = el.classList;
        return (
          elClassList.contains('bareer')
          && elClassList.contains('cannon-shots__item')
        );
      }))
    ) {
      const cannonShotsMove = new CannonShotsMove();
      cannonShotsMove.startOrStop(false);
      Game.isLose = true;
      return;
    }
    await delay(0);
    await this.watchCannonShotsForClashRecursive();
  }
}

class CannonShotsMove {
  isCannonShotsMove = false;
  constructor() {
    move(this);
  }
  async move() {
    this.startOrStop(true);
    await Promise.all([
      this.moveRecursive(),
      this.watchCannonShotsMoveStopIfPlayerNotDead(),
    ]);
  }
  // not moving with css transitions because document.elementFromPoint don't see it,
  // cause not found
  async moveRecursive() {
    if (!CannonShotsMove.isMoving) return;
    const cannonShots = document.querySelector('.cannon-shots');
    const SPEED_PX = 1;
    this.setElCoords(
      cannonShots,
      undefined,
      cannonShots.offsetTop + SPEED_PX,
    );
    await delay(10);
    await this.moveRecursive();
  }
  startOrStop(isStart) {
    CannonShotsMove.isMoving = isStart;
    document
      .querySelector('.cannon-shots')
      .classList[isStart ? 'add' : 'remove']('visible');
    if (!isStart) return;
    document.querySelector('.ball').classList.add('empty-space');
  }
  async watchCannonShotsMoveStopIfPlayerNotDead() {
    await delay(7000);
    if (!CannonShotsMove.isMoving) return;
    this.startOrStop(false);
  }
}
