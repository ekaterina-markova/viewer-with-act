import { thresholding, countGradient, Sobel, Gauss } from './preprocessing';
import { dist, init2DArray } from './utils';

export default class KASS {

  constructor(type, image, width, height, initPoints, configValues = {}) {
    this.kernelSize = 5;
    const externalEnergy = configValues.externalEnergy || 1;
    this.alpha = configValues.alpha||1;
    this.beta = configValues.beta||0.1;
    this.delta = externalEnergy / 2;
    this.gamma = externalEnergy / 2;
    this.maxDist = configValues.distance || 6;
    this.it = configValues.it || 100;
    this.width = width;
    this.height = height;

    this.contours = [];
    this.snake = initPoints;
    let gradient;

    if (type === 'CT') {
      const threshold = 60;
      let filterGauss = Gauss(image, 3);//3
      let filterSobel = Sobel(filterGauss, width, height);
      filterGauss = Gauss(filterSobel, 3);//3
      gradient = countGradient(filterGauss, width, height);
      this.binaryImage = thresholding(threshold, width, height, image);
      this.gradientX = gradient[0];
      this.gradientY = gradient[1];

    } else if (type === 'MR') {
      let testSobel = Sobel(image, width, height);
      let testGaus = Gauss(testSobel, 3.0);
      gradient = countGradient(testGaus, width, height);
      this.gradientX = gradient[0];
      this.gradientY = gradient[1];
      this.binaryImage = Sobel(image, width, height);

    }
  }

  compute() {
    let snakeLength = 0;
    for (let i = 0; i < this.it; i++) {
      snakeLength = this.getSnakelength(this.snake);
      let newSnake = [];
      let p = [];
      let hks = Math.floor(this.kernelSize / 2);
      let energyUniformity = init2DArray(this.kernelSize, this.kernelSize);
      let energyCurvature = init2DArray(this.kernelSize, this.kernelSize);
      let energyLine = init2DArray(this.kernelSize, this.kernelSize);
      let energyEdge = init2DArray(this.kernelSize, this.kernelSize);

      for (let i = 0; i < this.snake.length; i++) {
        let prev = this.snake[(i + this.snake.length - 1) % this.snake.length];
        let cur = this.snake[i];
        let next = this.snake[(i + 1) % this.snake.length];

        for (let dx = -hks; dx < hks; dx++) {
          for (let dy = -hks; dy < hks; dy++) {
            p[0] = Math.floor(cur[0] + dx);
            p[1] = Math.floor(cur[1] + dy);

            energyUniformity[hks + dx][hks + dy] = this.forceUniformity(prev, snakeLength, p, this.snake.length);
            energyCurvature[hks + dx][hks + dy] = this.forceCurvature(prev, p, next);
            energyLine[hks + dx][hks + dy] = this.forceLine(p);
            energyEdge[hks + dx][hks + dy] = this.forceEdge(p);
          }
        }

        energyUniformity = this.normalize(energyUniformity);
        energyCurvature = this.normalize(energyCurvature);
        energyLine = this.normalize(energyLine);
        energyEdge = this.normalize(energyEdge);

        let emin = Number.MAX_VALUE;
        let e = 0;
        let x = 0, y = 0;

        for (let dx = -hks; dx < hks; dx++) {
          for (let dy = -hks; dy < hks; dy++) {
            e = 0;
            e += this.alpha * energyUniformity[hks + dx][hks + dy]; // internal energy
            e += this.beta * energyCurvature[hks + dx][hks + dy]; // internal energy
            e += this.delta * energyLine[hks + dx][hks + dy]; // external energy
            e += this.gamma * energyEdge[hks + dx][hks + dy]; // external energy
            if (e < emin) {
              emin = e;
              x = cur[0] + dx;
              y = cur[1] + dy;
            }
          }
        }

        if (x < 1) x = 1;
        if (x >= this.width - 1) x = this.width - 2;
        if (y < 1) y = 1;
        if (y >= this.height - 1) y = this.height - 2;

        newSnake.push([Math.floor(x), Math.floor(y)]);
      }
      this.snake = this.rebuild(newSnake, this.maxDist);

      if (this.getSnakelength(newSnake) !== 0) {
        this.contours.push(this.snake);
      }
    }
    return this.contours;
  }

  normalize(kernel) {
    let sum = 0;
    for (let i = 0; i < kernel.length; i++) {
      for (let j = 0; j < kernel[i].length; j++) {
        sum += Math.abs(kernel[i][j]);
      }
    }
    if (sum === 0) return;
    for (let i = 0; i < kernel.length; i++) {
      for (let j = 0; j < kernel[i].length; j++) {
        kernel[i][j] /= sum;
      }
    }
    return kernel;
  }

  forceUniformity(prev, snakelength, p, snakesize) {
    // length of previous segment
    let un = dist(prev, p);
    // mesure of uniformity
    let avg = snakelength / snakesize;
    let dun = Math.abs(un - avg);
    // elasticity energy
    return dun * dun;
  }

  forceCurvature(prev, p, next) {
    let ux = p[0] - prev[0];
    let uy = p[1] - prev[1];
    let un = Math.sqrt(ux * ux + uy * uy);

    let vx = p[0] - next[0];
    let vy = p[1] - next[1];
    let vn = Math.sqrt(vx * vx + vy * vy);

    if (un === 0 || vn === 0) return 0;

    let cx = (vx + ux) / (un * vn);
    let cy = (vy + uy) / (un * vn);

    // curvature energy
    let cn = cx * cx + cy * cy;
    return cn;
  }

  forceLine(p) {
    if (p[0] < 0 || p[0] >= this.width || p[1] < 0 || p[1] >= this.height) {
      return Number.MAX_VALUE;
    }
    return this.binaryImage[p[1]][p[0]];
  }

  forceEdge(p) {
    if (p[0] < 0 || p[0] >= this.width || p[1] < 0 || p[1] >= this.height) {
      return Number.MAX_VALUE;
    }
    return -(this.gradientX[p[1]][p[0]] ** 2 + this.gradientY[p[1]][p[0]] ** 2);
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

  rebuild(snake, maxlen) {
    let tmp = [];

    // precompute length(i) = length of the snake from start to point #i
    let clength = new Array(snake.length + 1);
    clength[0] = 0;
    for (let i = 0; i < snake.length; i++) {
      let cur = snake[i];
      let next = snake[(i + 1) % snake.length];
      clength[i + 1] = clength[i] + dist(cur, next);
    }

    // compute number of points in the new snake
    let total = clength[snake.length];
    let nmb = Math.floor(0.5 + total / maxlen);

    // build a new snake
    for (let i = 0, j = 0; j < nmb; j++) {
      let d = (j * total) / nmb;
      while (!(clength[i] <= d && d < clength[i + 1])) {
        i++;
      }
      // get points (P-1,P,P+1,P+2) in the original snake
      let prev = snake[(i + snake.length - 1) % snake.length];
      let cur = snake[i];
      let next = snake[(i + 1) % snake.length];
      let next2 = snake[(i + 2) % snake.length];

      // do cubic spline interpolation
      let t = (d - clength[i]) / (clength[i + 1] - clength[i]);
      let t2 = t * t;
      let t3 = t2 * t;
      let c0 = t3;
      let c1 = -3 * t3 + 3 * t2 + 3 * t + 1;
      let c2 = 3 * t3 - 6 * t2 + 4;
      let c3 = -1 * t3 + 3 * t2 - 3 * t + 1;
      let x = prev[0] * c3 + cur[0] * c2 + next[0] * c1 + next2[0] * c0;
      let y = prev[1] * c3 + cur[1] * c2 + next[1] * c1 + next2[1] * c0;

      // add computed point to the new snake
      tmp.push([Math.floor(0.5 + x / 6), Math.floor(0.5 + y / 6)]);
    }
    return tmp;
  }

}