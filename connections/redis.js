'use strict';

const bluebird = require('bluebird');
const redis = require('redis');
const configuration = require('../config/application');

bluebird.promisifyAll(redis.RedisClient.prototype);
bluebird.promisifyAll(redis.Multi.prototype);

module.exports = redis.createClient(configuration.redis);