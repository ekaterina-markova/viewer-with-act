import { Sobel, Gauss, thresholding, countGradient } from './preprocessing';
import { dist, init2DArray } from './utils';

export default class ACM {
  constructor(image, width, height, initPoints, configValues = {}) {

    this.kernelSize = 5;
    this.minDist = 0.5;
    this.maxDist = 4;

    this.alpha = configValues.alpha || 1.1;
    this.beta = configValues.beta || 1.2;
    this.gamma = configValues.gamma || 1.5;

    this.snake = initPoints;

    this.w = width;
    this.h = height;
    this.it = configValues.it || 100;

    let normImage = init2DArray(height, width);
    for (let i = 0; i < height; i++) {
      for (let j = 0; j < width; j++) {
        normImage[i][j] = image[i][j] / 255;
      }
    }
    //const imageBlur = Gauss(normImage, 2.0);
    const edgeMap = Sobel(normImage, width, height);
    //const gradient = countGradient(edgeMap, width, height);
    const gvf = GVF(edgeMap, width, height, 10, 200);
    this.gvf_u = gvf[0];
    this.gvf_v = gvf[1];

    this.contours = [];

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
      let energyEdge = init2DArray(this.kernelSize, this.kernelSize);

      for (let i = 0; i < this.snake.length; i++) {
        let prev = this.snake[(i + this.snake.length - 1) % this.snake.length];
        let cur = this.snake[i];
        let next = this.snake[(i + 1) % this.snake.length];

        for (let dx = -hks; dx <= hks; dx++) {
          for (let dy = -hks; dy <= hks; dy++) {
            p[0] = Math.floor(cur[0] + dx);
            p[1] = Math.floor(cur[1] + dy);

            energyUniformity[hks + dx][hks + dy] = this.forceUniformity(prev, snakeLength, p, this.snake.length);
            energyCurvature[hks + dx][hks + dy] = this.forceCurvature(prev, p, next);
            energyEdge[hks + dx][hks + dy] = this.forceEdge(p, dx, dy);
          }
        }

        energyUniformity = this.normalize(energyUniformity);
        energyCurvature = this.normalize(energyCurvature);
        energyEdge = this.normalize(energyEdge);

        let emin = Number.MAX_VALUE;
        let e = 0;
        let x = 0, y = 0;

        for (let dx = -hks; dx <= hks; dx++) {
          for (let dy = -hks; dy <= hks; dy++) {
            e = 0;
            e += this.alpha * energyUniformity[hks + dx][hks + dy]; // internal energy
            e += this.beta * energyCurvature[hks + dx][hks + dy]; // internal energy
            e += this.gamma * energyEdge[hks + dx][hks + dy]; // external energy
            if (e < emin) {
              emin = e;
              x = cur[0] + dx;
              y = cur[1] + dy;
            }
          }
        }

        if (x < 1) x = 1;
        if (x >= this.w - 1) x = this.w - 2;
        if (y < 1) y = 1;
        if (y >= this.h - 1) y = this.h - 2;

        newSnake.push([x, y]);
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

  forceEdge(p, dx, dy) {
    if (p[0] < 0 || p[0] >= this.w || p[1] < 0 || p[1] >= this.h) {
      return Number.MAX_VALUE;
    }
    let dp_u = this.gvf_u[p[0]][p[1]] * dx * -1;
    let dp_v = this.gvf_v[p[0]][p[1]] * dy * -1;

    let d = dp_u + dp_v;
    return d;
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

function GVF(f ,w, h, mu, iter) {

  let gvf_u = init2DArray(w, h);
  let gvf_v = init2DArray(w, h);
  let u = init2DArray(w, h);
  let v = init2DArray(w, h);
  let Lu = init2DArray(w, h);
  let Lv = init2DArray(w, h);
  let fx = init2DArray(w, h);
  let fy = init2DArray(w, h);

  for (let y = 1; y < (h - 1); y++) {
    for (let x = 1; x < (w - 1); x++) {
      fx[x][y] = (f[x + 1][y] - f[x - 1][y]) / 2;
      fy[x][y] = (f[x][y + 1] - f[x][y - 1]) / 2;
      u[x][y] = fx[x][y];
      v[x][y] = fy[x][y];
    }
  }

  for (let loop = 0; loop < iter; loop++) {

    for (let x = 1; x < w - 1; x++) {
      for (let y = 1; y < h - 1; y++) {
        if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
          Lu[x][y] = ((u[x - 1][y] + u[x + 1][y] + u[x][y - 1] + u[x][y + 1]) - 4 * u[x][y]) / 4;
          Lv[x][y] = ((v[x - 1][y] + v[x + 1][y] + v[x][y - 1] + v[x][y + 1]) - 4 * v[x][y]) / 4;
        }
      }
    }

    del2(w, h, u, v, Lu, Lv);

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {

        let gnorm2 = fx[x][y] * fx[x][y] + fy[x][y] * fy[x][y];

        u[x][y] += mu * 4 * Lu[x][y] - gnorm2 * (u[x][y] - fx[x][y]);
        v[x][y] += mu * 4 * Lv[x][y] - gnorm2 * (v[x][y] - fy[x][y]);

        // GVF chanel flow
        let mag = Math.sqrt(u[x][y] * u[x][y] + v[x][y] * v[x][y]);
        gvf_u[x][y] = -1 * (u[x][y] / (mag + 1e-10));
        gvf_v[x][y] = -1 * (v[x][y] / (mag + 1e-10));

      }
    }
  }
  return [gvf_u, gvf_v];
}

function del2(w, h, u, v, Lu, Lv) {
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {

      if (x > 0 && y > 0 && x < w - 1 && y < h - 1) {
      } else {
        if (x === 0 && y === 0) {
        } else if (y === 0 && x < w - 1) {
          Lu[x][y] = (-5 * u[x][y + 1] + 4 * u[x][y + 2] - u[x][y + 3] + 2 * u[x][y] + u[x + 1][y] + u[x - 1][y] - 2 * u[x][y]) / 4;
          Lv[x][y] = (-5 * v[x][y + 1] + 4 * v[x][y + 2] - v[x][y + 3] + 2 * v[x][y] + v[x + 1][y] + v[x - 1][y] - 2 * v[x][y]) / 4;
        } else if (x === 0 && y < h - 1) {
          Lu[x][y] = (-5 * u[x + 1][y] + 4 * u[x + 2][y] - u[x + 3][y] + 2 * u[x][y] + u[x][y + 1] + u[x][y - 1] - 2 * u[x][y]) / 4;
          Lv[x][y] = (-5 * v[x + 1][y] + 4 * v[x + 2][y] - v[x + 3][y] + 2 * v[x][y] + v[x][y + 1] + v[x][y - 1] - 2 * v[x][y]) / 4;
        } else if (y === h - 1 && x > 0 && x < w - 1) {
          Lu[x][y] = (-5 * u[x][y - 1] + 4 * u[x][y - 2] - u[x][y - 3] + 2 * u[x][y] + u[x + 1][y] + u[x - 1][y] - 2 * u[x][y]) / 4;
          Lv[x][y] = (-5 * v[x][y - 1] + 4 * v[x][y - 2] - v[x][y - 3] + 2 * v[x][y] + v[x + 1][y] + v[x - 1][y] - 2 * v[x][y]) / 4;
        } else if (x === w - 1 && y > 0 && y < h - 1) {
          Lu[x][y] = (-5 * u[x - 1][y] + 4 * u[x - 2][y] - u[x - 3][y] + 2 * u[x][y] + u[x][y + 1] + u[x][y - 1] - 2 * u[x][y]) / 4;
          Lv[x][y] = (-5 * v[x - 1][y] + 4 * v[x - 2][y] - v[x - 3][y] + 2 * v[x][y] + v[x][y + 1] + v[x][y - 1] - 2 * v[x][y]) / 4;
        }
      }
    }
  }

  //ul
  let x = 0;
  let y = 0;
  Lu[x][y] = (-5 * u[x][y + 1] + 4 * u[x][y + 2] - u[x][y + 3] + 2 * u[x][y] - 5 * u[x + 1][y] + 4 * u[x + 2][y] - u[x + 3][y] + 2 * u[x][y]) / 4;
  Lv[x][y] = (-5 * v[x][y + 1] + 4 * v[x][y + 2] - v[x][y + 3] + 2 * v[x][y] - 5 * v[x + 1][y] + 4 * v[x + 2][y] - v[x + 3][y] + 2 * v[x][y]) / 4;

  //br
  x = w - 1;
  y = h - 1;
  Lu[x][y] = (-5 * u[x][y - 1] + 4 * u[x][y - 2] - u[x][y - 3] + 2 * u[x][y] - 5 * u[x - 1][y] + 4 * u[x - 2][y] - u[x - 3][y] + 2 * u[x][y]) / 4;
  Lv[x][y] = (-5 * v[x][y - 1] + 4 * v[x][y - 2] - v[x][y - 3] + 2 * v[x][y] - 5 * v[x - 1][y] + 4 * v[x - 2][y] - v[x - 3][y] + 2 * v[x][y]) / 4;

  //bl
  x = 0;
  y = h - 1;
  Lu[x][y] = (-5 * u[x][y - 1] + 4 * u[x][y - 2] - u[x][y - 3] + 2 * u[x][y] - 5 * u[x + 1][y] + 4 * u[x + 2][y] - u[x + 3][y] + 2 * u[x][y]) / 4;
  Lv[x][y] = (-5 * v[x][y - 1] + 4 * v[x][y - 2] - v[x][y - 3] + 2 * v[x][y] - 5 * v[x + 1][y] + 4 * v[x + 2][y] - v[x + 3][y] + 2 * v[x][y]) / 4;

  //ur
  x = w - 1;
  y = 0;
  Lu[x][y] = (-5 * u[x][y + 1] + 4 * u[x][y + 2] - u[x][y + 3] + 2 * u[x][y] - 5 * u[x - 1][y] + 4 * u[x - 2][y] - u[x - 3][y] + 2 * u[x][y]) / 4;
  Lv[x][y] = (-5 * v[x][y + 1] + 4 * v[x][y + 2] - v[x][y + 3] + 2 * v[x][y] - 5 * v[x - 1][y] + 4 * v[x - 2][y] - v[x - 3][y] + 2 * v[x][y]) / 4;
}