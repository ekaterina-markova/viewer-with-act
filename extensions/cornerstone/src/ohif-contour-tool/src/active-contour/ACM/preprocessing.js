import { init2DArray } from './utils';
import * as tf from '@tensorflow/tfjs';

function thresholding(threshold, w, h, image, inv = false) {
  let binary = init2DArray(h, w);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (inv) {
        binary[y][x] = image[y][x] > threshold ? 0 : 1;
      } else {
        binary[y][x] = image[y][x] > threshold ? 1 : 0;
      }
    }
  }
  return binary;
}

function createKernel(kernel_size, sigma) {

  let kernel = init2DArray(kernel_size, kernel_size);
  let hks = Math.floor(kernel_size / 2);
  let c = 1 / (Math.sqrt(2 * Math.PI) * sigma);
  let total_sum = 0;
  let r;
  for (let y = -hks; y <= hks; y++) {
    for (let x = -hks; x <= hks; x++) {
      r = Math.sqrt(x * x + y * y);
      kernel[y + hks][x + hks] = c * Math.exp((-r * r) / (2 * sigma * sigma));
      total_sum = total_sum + kernel[y + hks][x + hks];
    }
  }
  for (let i = 0; i < kernel_size; i++) {
    for (let j = 0; j < kernel_size; j++) {
      kernel[i][j] = total_sum === 0 ? kernel[i][j] : kernel[i][j] / total_sum;
    }
  }
  return kernel;
}

function Gauss(data, sigma) {

  let tens = tf.tensor2d(data);
  let strides = [1, 1, 1, 1];
  let weight = createKernel(5, sigma);
  let filter = tf.tensor2d(weight);

  const in_width = Number(tens.shape[0]);
  const in_height = Number(tens.shape[1]);

  const filter_width = Number(filter.shape[0]);
  const filter_height = Number(filter.shape[1]);

  let input_2d = tf.reshape(tens, [1, in_height, in_width, 1]);
  let kernel_2d = tf.reshape(filter, [filter_height, filter_width, 1, 1]);

  let output_2d = tf.squeeze(tf.conv2d(input_2d, kernel_2d, strides, 'same'));

  return output_2d.arraySync();
}

function Sobel(data, w, h) {

  let channelGradient = init2DArray(h, w);
  for (let y = 0; y < h - 2; y++) {
    for (let x = 0; x < w - 2; x++) {
      let p00 = data[y][x];
      let p10 = data[y][x + 1];
      let p20 = data[y][x + 2];
      let p01 = data[y + 1][x];
      let p21 = data[y + 1][x + 2];
      let p02 = data[y + 2][x];
      let p12 = data[y + 2][x + 1];
      let p22 = data[y + 2][x + 2];
      let sx = (p20 + 2 * p21 + p22) - (p00 + 2 * p01 + p02);
      let sy = (p02 + 2 * p12 + p22) - (p00 + 2 * p10 + p10);
      let snorm = Math.floor(Math.sqrt(sx * sx + sy * sy));

      channelGradient[y + 1][x + 1] = snorm;

    }
  }

  return channelGradient;
}

function countGradient(data, w, h) {

  let channelGradient = data;
  let gradX = init2DArray(w, h);
  let gradY = init2DArray(w, h);

  let sl1 = channelGradient.slice(1);
  let sl2 = channelGradient.slice(channelGradient.length - 2, channelGradient.length - 1);
  let vstack1 = sl1.concat(sl2);

  let sl3 = channelGradient.slice(0, 1);
  let sl4 = channelGradient.slice(0, channelGradient.length - 1);
  let vstack2 = sl3.concat(sl4);

  for (let i = 0; i < gradY.length; i++) {
    for (let j = 0; j < gradY[i].length; j++) {
      gradY[i][j] = vstack1[i][j] - vstack2[i][j];
    }
  }

  let hstack1 = [];
  channelGradient.forEach((rows) => {
    let sl = rows.slice(1);
    sl.push(rows[rows.length - 2]);
    hstack1.push(sl);
  });

  let hstack2 = [];
  channelGradient.forEach((rows) => {
    let sl = rows.slice(0, rows.length - 1);
    sl.unshift(rows[0]);
    hstack2.push(sl);
  });

  for (let i = 0; i < gradX.length; i++) {
    for (let j = 0; j < gradX[i].length; j++) {
      gradX[i][j] = hstack1[i][j] - hstack2[i][j];
    }
  }

  return [gradX, gradY];

}

export { thresholding, countGradient, Sobel, Gauss };
