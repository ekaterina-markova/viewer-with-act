function init2DArray(rows, columns) {
  let arr = [];
  for (let i = 0; i < rows; i++) {
    arr[i] = [];
    for (let j = 0; j < columns; j++) {
      arr[i][j] = 0;
    }
  }
  return arr;
}

function dist(a, b) {
  var dx = a[0] - b[0];
  var dy = a[1] - b[1];
  return Math.sqrt(dx * dx + dy * dy);
}

function cubicInterpolation(snake, maxLen) {
  let tmp = [];
  let clength = new Array(snake.length + 1);
  clength[0] = 0;
  for (let i = 0; i < snake.length; i++) {
    let cur = snake[i];
    let next = snake[(i + 1) % snake.length];
    clength[i + 1] = clength[i] + dist(cur, next);
  }

  let total = clength[snake.length];
  let nmb = Math.floor(0.5 + total / maxLen);

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
export { init2DArray, dist,cubicInterpolation };