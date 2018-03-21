import Promise from 'bluebird'
import dynogels from 'dynogels'

Promise.promisifyAll(require('dynogels/lib/table').prototype);
Promise.promisifyAll(require('dynogels/lib/item').prototype);
Promise.promisifyAll(require('dynogels/lib/query').prototype);
Promise.promisifyAll(require('dynogels/lib/scan').prototype);
Promise.promisifyAll(require('dynogels/lib/parallelScan').prototype);

const dynogels_model = dynogels.model
dynogels.model = (name, model) => {
  if (model) { Promise.promisifyAll(model); }
  return dynogels_model.apply(dynogels, arguments);
};

Promise.promisifyAll(dynogels);
export default dynogels