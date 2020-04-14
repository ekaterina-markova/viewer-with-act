import csTools from 'cornerstone-tools';
import cornestone from 'cornerstone-core';

import { ChamferDistance } from './acm_test';

const { drawBrushPixels } = csTools.importInternal('util/segmentationUtils');
const segmentationModule = csTools.getModule('segmentation');
const BaseBrushTool = csTools.importInternal('base/BaseBrushTool');
const MouseCursor = csTools.importInternal('tools/cursors/MouseCursor');

const activeContourCursor = new MouseCursor(
  `<path stroke="ACTIVE_COLOR" fill="none" stroke-width="3" d="M30.74 15.76C30.74 20.99 24.14 25.23 16
    25.23C7.86 25.23 1.26 20.99 1.26 15.76C1.26 10.54 7.86 6.3 16 6.3C24.14
    6.3 30.74 10.54 30.74 15.76Z"
    />`,
  {
    viewBox: {
      x: 32,
      y: 32,
    },
  }
);

export default class ActiveContourTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'ActiveContour',
      supportedInteractionTypes: ['Mouse', 'Touch'],
      svgCursor: activeContourCursor,
    };

    super(props, defaultProps);
    this.preMouseDownCallback = this.preMouseDownCallback.bind(this);
    this._drawingMouseUpCallback = this._drawingMouseUpCallback.bind(this);
    this.renderBrush = this.renderBrush.bind(this);
    this.mouseDragCallback = this.mouseDragCallback.bind(this);
    this._paint = this._paint.bind(this);
    this._init = this._init.bind(this);
    this._animate = this._animate.bind(this);

    this.updateOnMouseMove = false;
  }

  _init(evt) {
    //init points
    this.coord = [];

    const eventData = evt.detail;

    // init image
    const { rows, columns } = eventData.image;
    this.width = columns;
    this.height = rows;

    const generalSeriesModuleMeta = cornerstone.metaData.get(
      'generalSeriesModule',
      eventData.image.imageId
    );

    const pixelArray = eventData.image.getPixelData();
    let grayScale;

    // add other cases
    switch (generalSeriesModuleMeta.modality) {
      case 'CT':
        grayScale = pixelArray.map(value =>
          Math.round(((value + 2048) / 4096) * 255)
        );
        break;

      default:
        grayScale = pixelArray;
    }

    this.imagePixelData = get2DArray(grayScale, rows, columns);

    //create canvas layer
    const canvas = document.getElementsByClassName('cornerstone-canvas')[0];

    const canvasAnimation = document.createElement('canvas');
    canvasAnimation.className = 'canvas-animate';

    canvasAnimation.width = canvas.width;
    canvasAnimation.height = canvas.height;
    canvasAnimation.style.backgroundColor = 'rgba(255,255,255,0)';
    canvasAnimation.style.position = 'absolute';

    evt.detail.element.prepend(canvasAnimation);
  }

  preMouseDownCallback(evt) {
    // Lock switching images when rendering data
    csTools.setToolDisabled('StackScrollMouseWheel', {});

    this._init(evt);
    const eventData = evt.detail;
    const { element, currentPoints } = eventData;
    this._drawing = true;
    super._startListeningForMouseUp(element);

    // Start point
    this.startCoords = currentPoints.image;
    this._lastImageCoords = currentPoints.image;

    return true;
  }

  mouseDragCallback(evt) {
    const { currentPoints } = evt.detail;

    // Current point
    this.finishCoords = currentPoints.image;
    this._lastImageCoords = currentPoints.image;

    cornerstone.updateImage(evt.detail.element);
  }

  _drawingMouseUpCallback(evt) {
    const eventData = evt.detail;
    const { element, currentPoints } = eventData;
    this.finishCoords = currentPoints.image;
    this._drawing = false;
    super._stopListeningForMouseUp(element);

    const numberOfPoints = 100;
    this.coord = generateEllipse(
      this.startCoords,
      this.ellipseWidth,
      this.ellipseHeight,
      numberOfPoints
    );

    console.log('init');
    console.log(this.coord);

    console.log('result');
    this.result = computeACM(
      100,
      3,
      6,
      0.6,
      this.width,
      this.height,
      this.imagePixelData,
      [...this.coord.map(it => [...it])]
    );
    console.log(this.result);

    this._animate(evt);
  }

  _animate(evt) {
    let it = 0;
    const scope = this;

    const canvas = document.getElementsByClassName('canvas-animate')[0];
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'rgb(0,255,0)';

    let timerId = setInterval(function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      ctx.moveTo(scope.result[it][0][0], scope.result[it][0][1]);

      for (let i = 1; i < scope.result[it].length; i++) {
        ctx.lineTo(scope.result[it][i][0], scope.result[it][i][1]);
      }

      ctx.closePath();
      ctx.stroke();

      if (it === scope.result.length - 1) {
        clearInterval(timerId);
        canvas.remove();
        scope._paint(evt);
      }
      it++;
    }, 700);
  }

  _paint(evt) {
    console.log('finish');

    const { element } = evt.detail;

    //drawBrushPixel
    const lastContours = this.result[this.result.length - 1];
    const { getters } = segmentationModule;
    const { labelmap2D, labelmap3D } = getters.labelmap2D(element);

    drawBrushPixels(
      lastContours,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      this.width,
      false
    );

    cornerstone.updateImage(element);
    csTools.setToolActive('StackScrollMouseWheel', {});
  }

  renderBrush(evt) {
    if (this._drawing) {
      const eventData = evt.detail;
      const viewport = eventData.viewport;
      const context = eventData.canvasContext;
      const element = eventData.element;
      let mouseStartPosition, mouseEndPosition;
      let width, height;

      mouseEndPosition = this._lastImageCoords;
      mouseStartPosition = this.startCoords;
      context.strokeStyle = 'rgba(0,255,0)';

      width =
        Math.abs(mouseStartPosition.x - mouseEndPosition.x) * viewport.scale;
      height =
        Math.abs(mouseStartPosition.y - mouseEndPosition.y) * viewport.scale;

      if (!mouseStartPosition) {
        return;
      }

      const { rows, columns } = eventData.image;
      const { x, y } = mouseStartPosition;

      if (x < 0 || x > columns || y < 0 || y > rows) {
        return;
      }

      context.setTransform(1, 0, 0, 1, 0, 0);
      context.beginPath();

      const startCoordsCanvas = window.cornerstone.pixelToCanvas(
        element,
        mouseStartPosition
      );

      context.ellipse(
        startCoordsCanvas.x,
        startCoordsCanvas.y,
        width,
        height,
        0,
        0,
        2 * Math.PI
      );

      context.stroke();
      this.ellipseWidth = width;
      this.ellipseHeight = height;
      this._lastImageCoords = eventData.image;
    }
  }
}

function generateEllipse(mouseStartPosition, width, height, n) {
  let points = [];
  let x, y;

  for (let i = 0; i < n; i++) {
    x = Math.floor(
      mouseStartPosition.x.valueOf() +
        Math.floor(Math.cos(((2 * Math.PI) / n) * i) * (width / 2))
    );
    y = Math.floor(
      mouseStartPosition.y.valueOf() +
        Math.floor(Math.sin(((2 * Math.PI) / n) * i) * (height / 2))
    );
    points.push([x, y]);
  }

  return points;
}

function get2DArray(imagePixelData, height, width) {
  let Array2d = [];
  for (let i = 0; i < height; i++) {
    Array2d.push(Array.from(imagePixelData.slice(i * width, (i + 1) * width)));
  }
  return Array2d;
}

function computeACM(
  maxIt,
  minLen,
  maxLen,
  threshold,
  w,
  h,
  imageData,
  initPoints
) {
  let contours = [];
  let snake = initPoints;

  var result = ChamferDistance.compute(
    ChamferDistance.chamfer13,
    imageData,
    threshold,
    w,
    h
  );

  let flowX = result[0];
  let flowY = result[1];

  for (let i = 0; i < maxIt; i++) {
    snake.forEach(function(p) {
      if (p[0] <= 0 || p[0] >= w - 1 || p[1] <= 0 || p[1] >= h - 1) return;
      var vx = (0.5 - flowX[~~p[0]][~~p[1]]) * 2;
      var vy = (0.5 - flowY[~~p[0]][~~p[1]]) * 2;
      p[0] += vx * 100;
      p[1] += vy * 100;
    });

    //add / remove
    var tmp = [];
    let x, y; //
    for (var j = 0; j < snake.length; j++) {
      var prev = snake[j - 1 < 0 ? snake.length - 1 : j - 1];
      var cur = snake[j];
      var next = snake[(j + 1) % snake.length];

      var dist = distance(prev, cur) + distance(cur, next);

      //if the length is too short, don't use this point anymore
      if (dist > minLen) {
        //if it is below the max length
        if (dist < maxLen) {
          //store the point
          x = Math.floor(cur[0]);
          y = Math.floor(cur[1]);
          tmp.push([x, y]);
          //tmp.push(cur)
        } else {
          //otherwise split the previous and the next edges
          var pp = [
            Math.floor(lerp(0.5, prev[0], cur[0])),
            Math.floor(lerp(0.5, prev[1], cur[1])),
          ]; //
          var np = [
            Math.floor(lerp(0.5, cur[0], next[0])),
            Math.floor(lerp(0.5, cur[1], next[1])),
          ]; //

          // and add the midpoints to the snake
          tmp.push(pp, np);
        }
      }
    }
    snake = tmp;
    contours.push(snake);
  }

  return contours;
}

// total length of snake
function getsnakelength(snake) {
  var length = 0;
  for (var i = 0; i < snake.length; i++) {
    var cur = snake[i];
    var next = snake[(i + 1) % snake.length];
    length += distance(cur, next);
  }
  return length;
}

function distance(a, b) {
  var dx = a[0] - b[0];
  var dy = a[1] - b[1];
  return dx * dx + dy * dy;
}

function lerp(t, a, b) {
  return a + t * (b - a);
}
