/* eslint-disable no-await-in-loop */
/* eslint-disable no-constant-condition */
/* eslint-disable no-console */
/* eslint-disable @typescript-eslint/no-var-requires */
/* eslint-disable new-cap */
const Amqp = require('../build/index');

async function Worker() {
  const amqp = new Amqp.default({});

  await amqp.createSubscriber('PubSub:Reconnection', (...args) => {
    console.log('PubSub: Received...');
    console.dir(args, { depth: null });
    return args;
  });
}

Worker();