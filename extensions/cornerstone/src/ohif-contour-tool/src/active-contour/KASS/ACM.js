import { thresholding } from './preprocessing';

export default class ACM {
  constructor(configValues = {}, width, height, imageData, initPoints) {
    this.maxIterations = configValues.it || 100;
    this.minlen = 0.3;//Math.pow(.1, 2);
    this.maxlen = 6;//Math.pow(5, 1);
    this.w = width;
    this.h = height;
    this.snake = initPoints;
    const threshold = configValues.threshold || 60;
    const binaryImage = thresholding(threshold, width, height, imageData);

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
        //p[0] += vx * 100;
        //p[1] += vy * 100;
        const x = p[0] + vx * 100;
        const y = p[1] + vy * 100;
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

/**
 * Chamfer distance
 * @author Code by Xavier Philippeau
 * Kernels by Verwer, Borgefors and Thiel
 */
export const ChamferDistance = function(chamfer) {

  chamfer.cheessboard = [[1, 0, 1], [1, 1, 1]];
  chamfer.chamfer3 = [[1, 0, 3], [1, 1, 4]];
  chamfer.chamfer5 = [[1, 0, 5], [1, 1, 7], [2, 1, 1]];
  chamfer.chamfer7 = [[1, 0, 14], [1, 1, 20], [2, 1, 31], [3, 1, 44]];
  chamfer.chamfer13 = [[1, 0, 68], [1, 1, 96], [2, 1, 152], [3, 1, 215], [3, 2, 245], [4, 1, 280], [4, 3, 340], [5, 1, 346], [6, 1, 413]];
  chamfer.chamfer = null;

  chamfer.init2DArray = function(w, h) {
    let arr = [];
    for (let x = 0; x < w; x++) {
      arr.push(new Float32Array(h));
    }
    return arr;
  };

  function testAndSet(output, x, y, w, h, newvalue) {
    if (x < 0 || x >= w) return;
    if (y < 0 || y >= h) return;
    let v = output[x][y];
    if (v >= 0 && v < newvalue) return;
    output[x][y] = newvalue;
  }

  chamfer.compute = function(chamfermask, data, threshold, w, h) {

    chamfer.chamfer = chamfermask || chamfer.chamfer13;

    let gradient = chamfer.init2DArray(w, h);
    let flowX = chamfer.init2DArray(w, h);
    let flowY = chamfer.init2DArray(w, h);
    // initialize distance
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        //if (data[y][x] / 255 <= threshold) {
        if (data[y][x] !== 1) {
          gradient[x][y] = -1;
        }

      }
    }

    //normalization value
    let max = 0;
    let min = 1e10;
    //forward pass
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let v = gradient[x][y];
        if (v < 0) continue;
        for (let k = 0; k < chamfer.chamfer.length; k++) {

          let dx = chamfer.chamfer[k][0];
          let dy = chamfer.chamfer[k][1];
          let dt = chamfer.chamfer[k][2];

          testAndSet(gradient, x + dx, y + dy, w, h, v + dt);
          if (dy !== 0) {
            testAndSet(gradient, x - dx, y + dy, w, h, v + dt);
          }
          if (dx !== dy) {
            testAndSet(gradient, x + dy, y + dx, w, h, v + dt);
            if (dy !== 0) {
              testAndSet(gradient, x - dy, y + dx, w, h, v + dt);
            }
          }
          min = Math.min(min, gradient[x][y]);
          max = Math.max(max, gradient[x][y]);
        }
      }
    }

    // backward
    for (let y = h - 1; y > 0; y--) {
      for (let x = w - 1; x > 0; x--) {
        let v = gradient[x][y];
        if (v < 0) continue;
        for (let k = 0; k < chamfer.chamfer.length; k++) {
          let dx = chamfer.chamfer[k][0];
          let dy = chamfer.chamfer[k][1];
          let dt = chamfer.chamfer[k][2];
          testAndSet(gradient, x - dx, y - dy, w, h, v + dt);
          if (dy !== 0) {
            testAndSet(gradient, x + dx, y - dy, w, h, v + dt);
          }
          if (dx !== dy) {
            testAndSet(gradient, x - dy, y - dx, w, h, v + dt);
            if (dy !== 0) {
              testAndSet(gradient, x + dy, y - dx, w, h, v + dt);
            }
          }
        }
        min = Math.min(min, gradient[x][y]);
        max = Math.max(max, gradient[x][y]);
      }
    }

    // normalize
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (x === 0 || x === w - 1 || y === 0 || y === h - 1) {
          flowX[x][y] = flowY[x][y] = 0;
          continue;
        }
        let dx = (gradient[x + 1][y] - gradient[x - 1][y]) * .5 + max * .5;
        let dy = (gradient[x][y + 1] - gradient[x][y - 1]) * .5 + max * .5;
        flowX[x][y] = dx / max;
        flowY[x][y] = dy / max;
      }
    }

    return [flowX, flowY];
  };

  return chamfer;
}({});