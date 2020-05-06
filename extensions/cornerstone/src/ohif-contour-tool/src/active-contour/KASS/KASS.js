import { thresholding, countGradient } from './preprocessing';
import { dist, init2DArray } from './utils';

export default function computeKASS(image, width, height, initPoints, configValues = {}) {

  const kernelSize = 4;
  const alpha = configValues.alpha || 2;
  const beta = configValues.beta || 0.5;
  const w_line = configValues.gamma || 0.5;
  const w_edge = configValues.delta|| 0.5;
  const maxDist = 4;
  const threshold = configValues.threshold || 120;
  const it = configValues.it || 100;

  console.log('configValues');
  console.log({
    configValues,
  });

  let contours = [];
  let snake = initPoints;
  let snakeLength = 0;

  let gradient = countGradient(image, width, height);
  const binaryImage = thresholding(threshold, width, height, image);
  const gradientX = gradient[0];
  const gradientY = gradient[1];

  for (let i = 0; i < it; i++) {
    snakeLength = getSnakelength(snake);
    let newSnake = [];
    let p = [];
    let hks = Math.floor(kernelSize / 2);
    let e_uniformity = init2DArray(kernelSize, kernelSize);
    let e_curvature = init2DArray(kernelSize, kernelSize);
    let e_line = init2DArray(kernelSize, kernelSize);
    let e_edge = init2DArray(kernelSize, kernelSize);

    for (let i = 0; i < snake.length; i++) {
      let prev = snake[(i + snake.length - 1) % snake.length];
      let cur = snake[i];
      let next = snake[(i + 1) % snake.length];

      for (let dx = -hks; dx < hks; dx++) {
        for (let dy = -hks; dy < hks; dy++) {
          p[0] = Math.floor(cur[0] + dx);
          p[1] = Math.floor(cur[1] + dy);

          e_uniformity[hks + dx][hks + dy] = f_uniformity(
            prev,
            snakeLength,
            p,
            snake.length
          );
          e_curvature[hks + dx][hks + dy] = f_curvature(prev, p, next);
          e_line[hks + dx][hks + dy] = f_line(p, binaryImage, width, height);
          e_edge[hks + dx][hks + dy] = f_edge(
            p,
            gradientX,
            gradientY,
            width,
            height
          );
        }
      }

      e_uniformity = normalize(e_uniformity);
      e_curvature = normalize(e_curvature);
      e_line = normalize(e_line);
      e_edge = normalize(e_edge);

      let emin = Number.MAX_VALUE;
      let e = 0;
      let x = 0,
        y = 0;

      for (let dx = -hks; dx < hks; dx++) {
        for (let dy = -hks; dy < hks; dy++) {
          e = 0;
          e += alpha * e_uniformity[hks + dx][hks + dy]; // internal energy
          e += beta * e_curvature[hks + dx][hks + dy]; // internal energy
          e += w_line * e_line[hks + dx][hks + dy]; // external energy
          e += w_edge * e_edge[hks + dx][hks + dy]; // external energy
          if (e < emin) {
            emin = e;
            x = cur[0] + dx;
            y = cur[1] + dy;
          }
        }
      }

      if (x < 1) x = 1;
      if (x >= width - 1) x = width - 2;
      if (y < 1) y = 1;
      if (y >= height - 1) y = height - 2;

      newSnake.push([Math.floor(x), Math.floor(y)]);
    }
    snake = rebuild(newSnake, maxDist);

    if (getSnakelength(snake) !== 0) {
      contours.push(snake);
    }
  }
  return contours;
}

function normalize(kernel) {
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

function f_uniformity(prev, snakelength, p, snakesize) {
  // length of previous segment
  let un = dist(prev, p);

  // mesure of uniformity
  let avg = snakelength / snakesize;
  let dun = Math.abs(un - avg);

  // elasticity energy
  return dun * dun;
}

function f_curvature(prev, p, next) {
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

function f_line(p, binary, w, h) {
  if (p[0] < 0 || p[0] >= w || p[1] < 0 || p[1] >= h) {
    return Number.MAX_VALUE;
  }

  return binary[p[1]][p[0]];
}

function f_edge(p, gradientX, gradientY, w, h) {
  if (p[0] < 0 || p[0] >= w || p[1] < 0 || p[1] >= h) {
    return Number.MAX_VALUE;
  }

  return -(gradientX[p[1]][p[0]] ** 2 + gradientY[p[1]][p[0]] ** 2);
}

function getSnakelength(snake) {
  var length = 0;
  for (var i = 0; i < snake.length; i++) {
    var cur = snake[i];
    var next = snake[(i + 1) % snake.length];
    length += dist(cur, next);
  }
  return length;
}

function rebuild(snake, maxlen) {
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
