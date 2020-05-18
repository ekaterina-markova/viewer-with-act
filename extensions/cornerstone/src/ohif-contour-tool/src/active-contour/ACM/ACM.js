import { thresholding, Gauss, Sobel } from './preprocessing';
import { ChamferDistance } from './ChamferDistance';
import { dist } from './utils';

export default class ACM {
  constructor(configValues = {}, width, height, imageData, initPoints) {
    this.maxIterations = configValues.it || 100;
    this.minlen = 0.9;
    this.w = width;
    this.h = height;
    this.snake = initPoints;
    const threshold = configValues.threshold || 50;
    this.gamma = 100;//configValues.gamma || 100;//clean?
    const binaryImage = Sobel(imageData, width, height, threshold, true);

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

      let tmp = this.rebuild(newsnake, this.minlen);
      if (this.getSnakelength(tmp) !== 0) {
        this.contours.push(tmp);
        this.snake = tmp;
      } else {
        return;
      }

    }
    return this.contours;
  }

  rebuild(snake, maxlen) {
    let tmp = [];
    let clength = new Array(snake.length + 1);
    clength[0] = 0;
    for (let i = 0; i < snake.length; i++) {
      let cur = snake[i];
      let next = snake[(i + 1) % snake.length];
      clength[i + 1] = clength[i] + dist(cur, next);
    }

    let total = clength[snake.length];
    let nmb = Math.floor(0.5 + total / maxlen);

    for (let i = 0, j = 0; j < nmb; j++) {
      let d = (j * total) / nmb;
      while (!(clength[i] <= d && d < clength[i + 1])) {
        i++;
      }
      let prev = snake[(i + snake.length - 1) % snake.length];
      let cur = snake[i];
      let next = snake[(i + 1) % snake.length];
      let next2 = snake[(i + 2) % snake.length];

      let t = (d - clength[i]) / (clength[i + 1] - clength[i]);
      let t2 = t * t;
      let t3 = t2 * t;
      let c0 = t3;
      let c1 = -3 * t3 + 3 * t2 + 3 * t + 1;
      let c2 = 3 * t3 - 6 * t2 + 4;
      let c3 = -1 * t3 + 3 * t2 - 3 * t + 1;
      let x = prev[0] * c3 + cur[0] * c2 + next[0] * c1 + next2[0] * c0;
      let y = prev[1] * c3 + cur[1] * c2 + next[1] * c1 + next2[1] * c0;

      tmp.push([Math.floor(0.5 + x / 6), Math.floor(0.5 + y / 6)]);
    }
    return tmp;
  }

  getSnakelength(snake) {
    let length = 0;
    for (let i = 0; i < snake.length; i++) {
      let cur = snake[i];
      let next = snake[(i + 1) % snake.length];
      length += dist(cur, next);
    }
    return length;
  }

}