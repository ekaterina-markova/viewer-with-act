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

function getBoundingBox(poligon, w, h) {
  let xMin = Infinity;
  let xMax = 0;
  let yMin = Infinity;
  let yMax = 0;

  poligon.forEach(v => {
    xMin = Math.min(v[0], xMin);
    xMax = Math.max(v[0], xMax);
    yMin = Math.min(v[1], yMin);
    yMax = Math.max(v[1], yMax);
  });

  xMin = Math.floor(xMin);
  yMin = Math.floor(yMin);
  xMax = Math.floor(xMax);
  yMax = Math.floor(yMax);

  xMax = Math.min(w, xMax);
  xMin = Math.max(0, xMin);
  yMax = Math.min(h, yMax);
  yMin = Math.max(0, yMin);

  return [[xMin, yMin], [xMax, yMax]];
}

export { init2DArray, dist, getBoundingBox };