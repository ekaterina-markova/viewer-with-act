import csTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';
import computeKASS from './KASS/KASS model';
import { ACDialog } from './dialog';
import { SimpleDialog } from '@ohif/ui';

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

export default class ACTool extends BaseBrushTool {
  constructor(props = {}) {
    const defaultProps = {
      name: 'ACTool',
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
    this.lock = false;
    this.kassConfig = {};
    const { UIDialogService } = this.configuration.services;
    this.services = {
      UIDialogService,
    };
    this.dialogId = null;
  }

  // тулза деактивировалась
  passiveCallback() {
    this.services.UIDialogService.dismiss({ id: this.dialogId });
  }

  // тулза стала активной
  activeCallback() {
    this.dialogId = this.services.UIDialogService.create({
      centralize: true,
      isDraggable: true,
      content: ACDialog.InputDialog,
      contentProps: {
        onClose: () =>
          this.services.UIDialogService.dismiss({ id: this.dialogId }),
        onSubmit: value => {
          this.onDialogValueChanged(value);
          this.services.UIDialogService.dismiss({ id: this.dialogId });
        },
      },
    });
  }

  onDialogValueChanged(value) {
    const newValue = { ...value };
    //приводим к инту!
    Object.keys(newValue).forEach(key => {
      newValue[key] = Number(newValue[key]);
    });
    this.kassConfig = newValue;
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
    //
    if (this.lock) {
      return;
    } else {
      // Lock switching images when rendering data
      csTools.setToolDisabled('StackScrollMouseWheel', {});

      this._init(evt);
      const eventData = evt.detail;
      const { element, currentPoints } = eventData;

      this._drawing = true;
      super._startListeningForMouseUp(element);
      this._lastImageCoords = currentPoints.image;

      return true;
    }
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

    console.log('init');
    console.log(this.coord);

    console.log('result');

    this.result = computeKASS(
      this.imagePixelData,
      this.width,
      this.height,
      [...this.coord.map(it => [...it])],
      this.kassConfig
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

    //
    let scale = evt.detail.viewport.scale;
    let displayedArea = evt.detail.viewport.displayedArea.brhc;
    let snake;
    //

    scope.lock = true;
    let timerId = setInterval(function() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      snake = [...scope.result[it].map(it => [...it])]; //scope.result[it];
      ctx.beginPath();

      //
      if (canvas.width / canvas.height > displayedArea.x / displayedArea.y) {
        const borderWidth = (canvas.width - displayedArea.x * scale) / 2;
        snake = snake.map(([x, y]) => [x * scale + borderWidth, y * scale]);
      } else {
        //const borderWidth = (canvas.height - displayedArea.y * scale) / 2;
        //snake = snake.map(([x, y]) => [x * scale, y * scale + borderWidth,])
        snake = snake.map(([x, y]) => [x * scale, y * scale]);
      }
      //

      //ctx.moveTo(scope.result[it][0][0], scope.result[it][0][1]);
      ctx.moveTo(snake[0][0], snake[0][1]);

      //for (let i = 1; i < scope.result[it].length; i++) {
      //ctx.lineTo(scope.result[it][i][0], scope.result[it][i][1]);
      //}
      for (let i = 1; i < snake.length; i++) {
        ctx.lineTo(snake[i][0], snake[i][1]);
      }

      ctx.closePath();
      ctx.stroke();

      if (it === scope.result.length - 1) {
        clearInterval(timerId);
        canvas.remove();
        scope._paint(evt);
        scope.lock = false;
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
      const context = eventData.canvasContext;
      let mouseEndPosition;

      mouseEndPosition = this._lastImageCoords;

      context.strokeStyle = 'rgba(0,255,0)';
      this.coord.push([
        mouseEndPosition.x.valueOf(),
        mouseEndPosition.y.valueOf(),
      ]);

      context.clearRect(0, 0, context.width, context.height);

      context.beginPath();
      context.moveTo(this.coord[0][0], this.coord[0][1]);

      for (let i = 1; i < this.coord.length; i++) {
        context.lineTo(this.coord[i][0], this.coord[i][1]);
      }

      context.closePath();
      context.stroke();

      this._lastImageCoords = eventData.image;
    }
  }
}

function get2DArray(imagePixelData, height, width) {
  let Array2d = [];
  for (let i = 0; i < height; i++) {
    Array2d.push(Array.from(imagePixelData.slice(i * width, (i + 1) * width)));
  }
  return Array2d;
}
