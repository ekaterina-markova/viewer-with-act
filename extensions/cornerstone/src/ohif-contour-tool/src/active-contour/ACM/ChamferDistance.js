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

  chamfer.compute = function(chamfermask, data, w, h) {

    chamfer.chamfer = chamfermask || chamfer.chamfer13;

    let gradient = chamfer.init2DArray(w, h);
    let flowX = chamfer.init2DArray(w, h);
    let flowY = chamfer.init2DArray(w, h);
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        if (data[y][x] !== 1) {
          gradient[x][y] = -1;
        }

      }
    }
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