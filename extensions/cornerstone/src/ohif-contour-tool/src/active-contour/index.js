import csTools from 'cornerstone-tools';
import cornerstone from 'cornerstone-core';
import KASS from './KASS/KASS';
import { ACDialog } from './dialog';
import calculateTransform from './utils/calculateTransform';
import ACM from './KASS/ACM';

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
  },
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
    this.setSettings = this.setSettings.bind(this);
    this.formLock = false;
    this.animateLock = false;
    this.kassConfig = {};
    const { UIDialogService, UINotificationService } = this.configuration.services;
    this.services = {
      UIDialogService,
      UINotificationService,
    };
    this.dialogId = null;

    //document.addEventListener('keypress',this.callSettings);
    //this.callSettings = this.callSettings.bind(this);
  }

  passiveCallback() {
    this.services.UIDialogService.dismiss({ id: this.dialogId });
  }

  activeCallback() {
    this.setSettings();
  }

  /*
    callSettings(evt){
      const scope = this;
      if(evt.key==='s' && !scope.formLock && !scope.animateLock){
        scope.setSettings();
      }
    }
   */
  setSettings() {
    this.formLock = true;
    this.dialogId = this.services.UIDialogService.create({
      centralize: false,
      isDraggable: true,
      content: ACDialog.InputDialog,
      contentProps: {
        onClose: () =>
          this.services.UIDialogService.dismiss({ id: this.dialogId }),
        onSubmit: value => {
          this.onDialogValueChanged(value);
          this.services.UIDialogService.dismiss({ id: this.dialogId });
          this.formLock = false;
        },
      },
    });
  }

  onDialogValueChanged(value) {
    const newValue = { ...value };
    Object.keys(newValue).forEach(key => {
      newValue[key] = Number(newValue[key]);
    });
    this.kassConfig = newValue;
  }


  _init(evt) {

    //init points
    this.coord = [];
    this.lastState = [];

    const eventData = evt.detail;

    // init image
    const { rows, columns } = eventData.image;
    this.width = columns;
    this.height = rows;

    const generalSeriesModuleMeta = cornerstone.metaData.get(
      'generalSeriesModule',
      eventData.image.imageId,
    );

    const pixelArray = eventData.image.getPixelData();
    let grayScale;

    switch (generalSeriesModuleMeta.modality) {
      case 'CT':
        grayScale = pixelArray.map(value =>
          Math.round(((value + 2048) / 4096) * 255),
        );
        break;
      case 'MR':
        grayScale = pixelArray.map(value =>
          Math.round((value / eventData.image.maxPixelValue) * 255),
        );
        break;

      default:
        grayScale = pixelArray;
    }

    this.imagePixelData = [];
    for (let i = 0; i < rows; i++) {
      this.imagePixelData.push(
        Array.from(grayScale.slice(i * columns, (i + 1) * columns)),
      );
    }

    //create canvas layer
    const canvas = document.getElementsByClassName(
      'cornerstone-canvas',
    )[0];

    const canvasAnimation = document.createElement('canvas');
    canvasAnimation.className = 'canvas-animate';

    canvasAnimation.width = canvas.width;
    canvasAnimation.height = canvas.height;
    canvasAnimation.style.backgroundColor = 'rgba(255,255,255,0)';
    canvasAnimation.style.position = 'absolute';

    evt.detail.element.prepend(canvasAnimation);
  }

  preMouseDownCallback(evt) {

    if (this.formLock) {
      this.services.UINotificationService.show({ title: 'Info', message: 'Confirm or close settings' });
      return;
    } else if (this.animateLock) {
      this.services.UINotificationService.show({ title: 'Info', message: 'You can\'t draw during animation' });
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

    console.log('result');
    const generalSeriesModuleMeta = cornerstone.metaData.get(
      'generalSeriesModule',
      eventData.image.imageId,
    );
    /*
    const acm = new KASS(
      generalSeriesModuleMeta.modality,
      this.imagePixelData,
      this.width,
      this.height,
      [...this.coord.map(it => [...it])],
      this.kassConfig,
    );
    this.result = acm.compute();

     */
    const acm = new ACM(
      this.kassConfig,
      this.width,
      this.height,
      this.imagePixelData,
      [...this.coord.map(it => [...it])],
    );
    this.result = acm.loop();
    console.log(this.result);
    if (this.result === undefined || this.result === []) {
      this.lastState = [...this.coord.map(it => [...it])];
      console.log('contours not found');
      this._paint(evt);
    } else {
      this._animate(evt);
    }
  }

  _animate(evt) {

    let stopped = false;
    document.addEventListener('keypress', (event) => {
      if (event.code === 'KeyQ') stopped = true;
    });

    let it = 0;
    const scope = this;
    const canvas = document.getElementsByClassName(
      'canvas-animate',
    )[0];
    const ctx = canvas.getContext('2d');
    ctx.strokeStyle = 'rgb(0,255,0)';
    ctx.lineWidth = 0.5;
    const transform = calculateTransform(evt.detail, canvas);
    ctx.setTransform(transform.m[0], transform.m[1], transform.m[2], transform.m[3], transform.m[4], transform.m[5]);

    scope.animateLock = true;
    let timerId = setInterval(function() {

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.beginPath();
      let x = scope.result[it][0][0];
      let y = scope.result[it][0][1];
      ctx.moveTo(x, y);
      for (let i = 1; i < scope.result[it].length; i++) {
        x = scope.result[it][i][0];
        y = scope.result[it][i][1];
        ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();

      if (it === scope.result.length - 1 || stopped) {
        clearInterval(timerId);
        canvas.remove();
        scope.lastState = scope.result[it];
        scope._paint(evt);
        scope.animateLock = false;
      }
      it++;
    }, 700);
  }


  _paint(evt) {

    console.log('finish');
    const { element } = evt.detail;

    //drawBrushPixel
    const lastContours = this.lastState;
    const { getters } = segmentationModule;
    const {
      labelmap2D,
      labelmap3D,
    } = getters.labelmap2D(element);

    drawBrushPixels(
      lastContours,
      labelmap2D.pixelData,
      labelmap3D.activeSegmentIndex,
      this.width,
      false,
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
      context.lineWidth = 0.5;
      this.coord.push([mouseEndPosition.x.valueOf(), mouseEndPosition.y.valueOf()]);

      const canvas = document.getElementsByClassName(
        'cornerstone-canvas',
      )[0];
      const transform = calculateTransform(eventData, canvas);
      context.setTransform(transform.m[0], transform.m[1], transform.m[2], transform.m[3], transform.m[4], transform.m[5]);

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
