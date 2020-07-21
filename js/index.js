import delay from './helpers/delay.js';

document.addEventListener('DOMContentLoaded', async () => {
  if (!localStorage.isHowToPlayInstructionShown) {
    alert('press enter to start game, <- or -> to move raket');
    localStorage.isHowToPlayInstructionShown = true;
  }
  const RACKET_TOP = 250;
  centerAndSetBottomCoordinateGameAreaChild('racket', RACKET_TOP);
  const ball = document.querySelector('.ball');
  centerAndSetBottomCoordinateGameAreaChild('ball', RACKET_TOP - ball.offsetHeight);
});

document.addEventListener('keydown', async (e) => {
  const keyCode = e.code;
  switch (keyCode) {
    case 'ArrowLeft':
    case 'ArrowRight':
      const racketXMoveStep = 60;
      const gameAreaRect = document.querySelector('.game-area__inner').getBoundingClientRect();
      const racket = document.querySelector(`.racket`);
      const racketRect = racket.getBoundingClientRect();
      const racketStyle = racket.style;
      const racketLeft = racketRect.left - gameAreaRect.left;
      switch (keyCode) {
        case 'ArrowLeft':
          if (racketLeft - racketXMoveStep < 0) {
            racketStyle.left = numToPx(0);
          } else {
            racketStyle.left = numToPx(racketLeft - racketXMoveStep);
          }
          break;
        case 'ArrowRight':
          if (racketRect.right + racketXMoveStep > gameAreaRect.right) {
            racketStyle.left = numToPx(gameAreaRect.width - racketRect.width);
          } else {
            racketStyle.left = numToPx(racketLeft + racketXMoveStep);
          }
          break;
      }
      break;
    case 'Enter':
      await moveBallPossiblyChangeDirectionRecursive();
      break;
  }
});

async function moveBallPossiblyChangeDirectionRecursive() {
  const gameAreaRect = document.querySelector('.game-area__inner').getBoundingClientRect();
  const ball = document.querySelector('.ball');
  let rect = ball.getBoundingClientRect();
  let left = rect.left - gameAreaRect.left;
  let top = rect.top - gameAreaRect.top;
  if (!moveBallPossiblyChangeDirectionRecursive.isCalledFirstTime) {
    moveBall(left, top);
    moveBallPossiblyChangeDirectionRecursive.isCalledFirstTime = true;
  }
  const elementsData = getElementsDataFromPointsNextToAllEdges();
  if (Object.values(elementsData).flat().every((el) => !el.classList.contains('bareer'))) {
    moveBall(left, top);
    await delay(10);
    await moveBallPossiblyChangeDirectionRecursive();
  }
}

function moveBall(left, top) {
  const style = document.querySelector('.ball').style;
  const speedDataPx = {
    x: 0,
    /* set value that is > 1 || 0 if doing it manually, it doesn't work with 1 idk why */
    y: 2,
  };
  style.left = numToPx(left + speedDataPx.x);
  style.top = numToPx(top - speedDataPx.y);
}

function getElementsDataFromPointsNextToAllEdges() {
  const ballRect = document.querySelector('.ball').getBoundingClientRect();
  const ballRectCoordsNextToEdges = {
    top: ballRect.top - 1,
    right: ballRect.right + 1,
    bottom: ballRect.bottom + 1,
    left: ballRect.left - 1,
  };
  const elementsDataGroupedByEdges = {
    top: [],
    right: [],
    bottom: [],
    left: [],
  }
  for (let i = 0; i < ballRect.width + 2; i++) {
    const pointX = ballRectCoordsNextToEdges.left + i;
    elementsDataGroupedByEdges.top.push(document.elementFromPoint(pointX, ballRectCoordsNextToEdges.top));
    elementsDataGroupedByEdges.bottom.push(document.elementFromPoint(pointX, ballRectCoordsNextToEdges.bottom));
  }
  for (let i = 0; i < ballRect.height + 2; i++) {
    const pointY = ballRectCoordsNextToEdges.top + i;
    elementsDataGroupedByEdges.left.push(document.elementFromPoint(ballRectCoordsNextToEdges.left, pointY));
    elementsDataGroupedByEdges.right.push(document.elementFromPoint(ballRectCoordsNextToEdges.right, pointY));
  }
  return elementsDataGroupedByEdges;
}

function centerAndSetBottomCoordinateGameAreaChild(className, top, left = 0) {
  const gameAreaRect = document.querySelector('.game-area__inner').getBoundingClientRect();
  const child = document.querySelector(`.${className}`);
  const rect = child.getBoundingClientRect();
  const style = child.style;
  style.left = numToPx((gameAreaRect.width - rect.width) / 2 - left);
  style.top = numToPx(top);
}

function numToPx(num) {
  return `${num}px`;
}
