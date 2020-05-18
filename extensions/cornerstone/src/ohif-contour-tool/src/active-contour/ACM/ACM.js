import { thresholding, Gauss, countGradient, Sobel, binSobel } from './preprocessing';
import { init2DArray } from './utils';
import { ChamferDistance } from './ChamferDistance';

export default class ACM {
  constructor(configValues = {}, width, height, imageData, initPoints) {
    this.maxIterations = configValues.it || 100;
    this.minlen = 0.5;
    this.maxlen = 6;
    this.w = width;
    this.h = height;
    this.snake = initPoints;
    const threshold = configValues.threshold || 50;
    this.gamma = configValues.gamma||100;
    const blurImage = Gauss(imageData,1.0);
    const binaryImage = binSobel(blurImage, width, height, threshold);

    const result = ChamferDistance.compute(ChamferDistance.chamfer13, binaryImage, threshold, width, height);
    this.flowX = result[0];
    this.flowY = result[1];

    this.contours = [];
  }

  loop() {
    let scope = this;

    for (let j = 0; j < this.maxIterations; j++) {
      let newsnake = [];
      this.snake.forEach(function(p) {
        if (p[0] <= 0 || p[0] >= scope.w - 1 || p[1] <= 0 || p[1] >= scope.h - 1) return;
        const vx = (.5 - scope.flowX[~~(p[0])][~~(p[1])]) * 2;
        const vy = (.5 - scope.flowY[~~(p[0])][~~(p[1])]) * 2;
        const x = p[0] + vx * scope.gamma;
        const y = p[1] + vy * scope.gamma;
        newsnake.push([x, y]);
      });

      let tmp = [];
      for (let i = 0; i < newsnake.length; i++) {

        const prev = newsnake[(i - 1 < 0 ? newsnake.length - 1 : (i - 1))];
        const cur = newsnake[i];
        const next = newsnake[(i + 1) % newsnake.length];

        const dist = this.distance(prev, cur) + this.distance(cur, next);

        //if the length is too short, don't use this point anymore
        if (dist > this.minlen) {

          //if it is below the max length
          if (dist < this.maxlen) {
            //store the point
            tmp.push(cur);

          } else {
            //otherwise split the previous and the next edges
            const pp = [this.lerp(.5, prev[0], cur[0]), this.lerp(.5, prev[1], cur[1])];
            const np = [this.lerp(.5, cur[0], next[0]), this.lerp(.5, cur[1], next[1])];

            // and add the midpoints to the snake
            tmp.push(pp, np);
          }
        }
      }
      this.contours.push(tmp);
      this.snake = tmp;
    }
    return this.contours;
  }

  distance(a, b) {
    const dx = a[0] - b[0];
    const dy = a[1] - b[1];
    return dx * dx + dy * dy;
  }

  lerp(t, a, b) {
    return a + t * (b - a);
  }
}