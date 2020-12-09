/*
 * client.js: Storage client for AWS S3
 *
 * (C) 2011 Charlie Robbins, Ken Perkins, Ross Kukulinski & the Contributors.
 *
 */

const util = require('util');
const AWS = require('aws-sdk');
const amazon = require('../../client');
const _ = require('lodash');

const Client = exports.Client = function (options) {
  amazon.Client.call(this, options);

  _.extend(this, require('./containers'));
  _.extend(this, require('./files'));

  this.s3 = new AWS.S3(this._awsConfig);
};

util.inherits(Client, amazon.Client);
