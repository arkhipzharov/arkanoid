import delay from './helpers/delay.js';

document.addEventListener('DOMContentLoaded', () => {
  setGameAreaChildPositions();
  showHowToPlayInstructionOnce();
});

function setGameAreaChildPositions() {
  const RACKET_TOP = 250;
  centerAndSetBottomCoordGameAreaChild('racket', RACKET_TOP);
  const ballEl = document.querySelector('.ball');
  centerAndSetBottomCoordGameAreaChild(
    'ball',
    RACKET_TOP - ballEl.offsetHeight,
  );
}

function centerAndSetBottomCoordGameAreaChild(className, top) {
  const gameAreaRect = document
    .querySelector('.game-area__inner')
    .getBoundingClientRect();
  const child = document.querySelector(`.${className}`);
  const rect = child.getBoundingClientRect();
  const style = child.style;
  style.left = numToPx((gameAreaRect.width - rect.width) / 2);
  style.top = numToPx(top);
}

function numToPx(num) {
  return `${num}px`;
}

function showHowToPlayInstructionOnce() {
  if (!localStorage.isHowToPlayInstructionShown) {
    alert('press enter to start game, <- or -> to move racket');
    localStorage.isHowToPlayInstructionShown = true;
  }
}

class Keydown {
  constructor() {
    this.isPlayingGame = false;
    this.keyCode = '';
  }
  // method name is like this only for addEventListener to properly work, because
  // we are passing object to it
  async handleEvent(e) {
    const keyCode = e.code;
    this.keyCode = keyCode;
    switch (keyCode) {
      case 'ArrowLeft':
      case 'ArrowRight':
        this.handleRacketMovingControls();
        break;
      case 'Enter':
        if (this.isPlayingGame) return;
        this.isPlayingGame = true;
        const ball = new Ball();
        await ball.movePossiblyChangeDirectionRecursive();
        break;
    }
  }
  handleRacketMovingControls() {
    const RACKET_MOVE_STEP = 60;
    const gameAreaRect = document
      .querySelector('.game-area__inner')
      .getBoundingClientRect();
    const racket = document.querySelector(`.racket`);
    const racketRect = racket.getBoundingClientRect();
    const racketStyle = racket.style;
    const racketLeft = racketRect.left - gameAreaRect.left;
    const keyCode = this.keyCode
    switch (keyCode) {
      case 'ArrowLeft':
        if (racketLeft - RACKET_MOVE_STEP < 0) {
          racketStyle.left = numToPx(0);
        } else {
          racketStyle.left = numToPx(racketLeft - RACKET_MOVE_STEP);
        }
        break;
      case 'ArrowRight':
        if (racketRect.right + RACKET_MOVE_STEP > gameAreaRect.right) {
          racketStyle.left = numToPx(gameAreaRect.width - racketRect.width);
        } else {
          racketStyle.left = numToPx(racketLeft + RACKET_MOVE_STEP);
        }
        break;
    }
  }
}

// this line here because 'Cannot access 'Keydown' before initialization'
document.addEventListener('keydown', new Keydown());

class Ball {
  constructor() {
    const BASE_JUMP_OFFSET_DIRECTION_DEG = 30;
    // it will be always 2 values for angles after clash because we mirror
    // them to change ball direction completely
    this.BASE_JUMP_OFFSET_DIRECTION_DEG
      = BASE_JUMP_OFFSET_DIRECTION_DEG;
    this.NEW_ANGLE_AFTER_CLASH = 180 - 90 - BASE_JUMP_OFFSET_DIRECTION_DEG;
    this.movementData = {
      // degrees, 360* is to the right side, and 180* to the left, clockwise.
      // Base currAngle will be 270 bcs it's perpendicular to racket
      currAngle: 270 + BASE_JUMP_OFFSET_DIRECTION_DEG,
      // ball jumping from horizontal racket first
      edgeNextToBareerOld: 'bottom',
      oldTop: null,
      oldLeft: null,
    };
  }
  async movePossiblyChangeDirectionRecursive() {
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
    if (!baseTop) {
      baseTop = top;
      this.baseTop = baseTop;
      isMovingToNotStuckInBareerAtStart = true;
      this.isMovingToNotStuckInBareerAtStart
        = isMovingToNotStuckInBareerAtStart;
    }
    let movementData = this.movementData;
    // incrementally move ball by >= 2px in Y coordinate after game start
    // to not get stuck in racket first because it's bareer
    if (top > baseTop - 2 && isMovingToNotStuckInBareerAtStart) {
      this.move(movementData, left, top);
      await delay(0);
      await this.movePossiblyChangeDirectionRecursive();
      return;
    }
    this.isMovingToNotStuckInBareerAtStart = false;
    const BASE_JUMP_OFFSET_DIRECTION_DEG
      = this.BASE_JUMP_OFFSET_DIRECTION_DEG;
    const NEW_ANGLE_AFTER_CLASH = this.NEW_ANGLE_AFTER_CLASH;
    const edgeNextToBareer = this.getMaxContactWithBareerPointsNumEdge();
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
      await delay(0);
      await this.movePossiblyChangeDirectionRecursive();
    } else {
      this.move(movementData, left, top);
      await delay(0);
      await this.movePossiblyChangeDirectionRecursive();
    }
  }
  getMaxContactWithBareerPointsNumEdge() {
    const elementsData = this.getElementsDataFromPointsNextToAllEdges();
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
}
