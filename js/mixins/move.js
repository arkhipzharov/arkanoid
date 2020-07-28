import numToPx from '../helpers/num-to-px.js';

// call this function inside classe's (which on top of inheritance)
// constructor() {} to register mixin
export default function move(classInstanceContextOrClassItlesf) {
  const mixin = {
    getElementsDataFromPointsNextToAllEdges(
      edgesElClass,
      isElementsToClashToSmaller,
    ) {
      const rect = document
        .querySelector(`.${edgesElClass}`)
        .getBoundingClientRect();
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
        // we can skip most of area because only 2 edgepoints will always clash to
        // bareer if it's near
        if (
          i > 2
          && i < nextToEdgeAreaToCheckBareersLength - 1
          && !isElementsToClashToSmaller
        ) continue;
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
        if (
          i > 1
          && i < nextToEdgeAreaToCheckBareersLength - 1
          && !isElementsToClashToSmaller
        ) continue;
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
    },
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
    },
    setElCoords(elOrClass, left, top) {
      let el = elOrClass;
      if (typeof elOrClass === 'string') {
        el = document.querySelector(`.${elOrClass}`);
      }
      const style = el.style;
      const isLeftZero = left === 0;
      const isTopZero = top === 0;
      if (left || isLeftZero) {
        style.left = isLeftZero ? '0' : numToPx(left);
      }
      if (top || isTopZero) {
        style.top = isTopZero ? '0' : numToPx(top);
      }
    },
  };
  Object.assign(classInstanceContextOrClassItlesf, mixin);
}
