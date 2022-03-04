/*
 * client.js: Base client from which all AWS clients inherit from
 *
 * (C) 2012 Charlie Robbins, Ken Perkins, Ross Kukulinski & the Contributors.
 *
 */

const util = require('util');
const https = require('https');
const http = require('http');
const AWS = require('aws-sdk');
const base = require('../core/base');

const userAgent = AWS.util.userAgent();
const Client = exports.Client = function (options) {
  const self = this;

  base.Client.call(this, options);

  options = options || {};

  // Allow overriding serversUrl in child classes
  this.provider = 'amazon';
  this.endpoint = options.endpoint;
  this.securityGroup = options.securityGroup;
  this.securityGroupId = options.securityGroupId;
  this.version = options.version || '2014-06-15';
  this.protocol = options.protocol || 'https://';

  // support either key/accessKey syntax
  this.config.key = this.config.key || options.accessKey;
  this.config.keyId = this.config.keyId || options.accessKeyId;
  this.config.signedUrl = Object.assign({ enabled: false, cacheMaxAge: 600 }, options.signedUrl);

  if (options.httpOptions && options.httpOptions.agent) {
    options.httpOptions.agent.keepAlive = typeof options.httpOptions.agent.keepAlive === 'boolean'
      ? options.httpOptions.agent.keepAlive
      : false;

    const maxSocketsHttps = parseInt(process.env.NODE_HTTPS_MAX_SOCKETS || 100);
    const maxSocketsHttp = parseInt(process.env.NODE_HTTP_MAX_SOCKETS || 100);

    if (options.protocol.indexOf('https') !== -1) {
      options.httpOptions.agent.maxSockets = options.httpOptions.agent.maxSockets || maxSocketsHttps;
      options.httpOptions.agent = new https.Agent(options.httpOptions.agent);
    } else {
      options.httpOptions.agent.maxSockets = options.httpOptions.agent.maxSockets || maxSocketsHttp;
      options.httpOptions.agent = new http.Agent(options.httpOptions.agent);
    }
  }

  this._awsConfig = {
    accessKeyId: this.config.keyId,
    secretAccessKey: this.config.key,
    region: options.region,
    s3ForcePathStyle: options.forcePathBucket,
    sessionToken: options.sessionToken,
    credentials: options.credentials,
    maxRetries: options.maxRetries,
    httpOptions: options.httpOptions,
  };

  // TODO think about a proxy option for pkgcloud
  // enable forwarding to mock test server
  if (options.serversUrl) {
    if (!this._awsConfig.httpOptions || typeof this._awsConfig.httpOptions !== 'object') {
      this._awsConfig.httpOptions = {};
    }

    this._awsConfig.httpOptions.proxy = this.protocol + options.serversUrl;
  }

  if (options.endpoint) {
    this._awsConfig.endpoint = new AWS.Endpoint(options.endpoint);
  }

  this.userAgent = util.format('%s %s', self.getUserAgent(), userAgent);

  // Setup a custom user agent for pkgcloud
  AWS.util.userAgent = function () {
    return self.userAgent;
  };

  if (!this.before) {
    this.before = [];
  }
};

util.inherits(Client, base.Client);

Client.prototype._toArray = function toArray(obj) {
  if (typeof obj === 'undefined') {
    return [];
  }

  return Array.isArray(obj) ? obj : [obj];
};

Client.prototype.failCodes = {
  400: 'Bad Request',
  401: 'Unauthorized',
  403: 'Resize not allowed',
  404: 'Item not found',
  409: 'Build in progress',
  413: 'Over Limit',
  415: 'Bad Media Type',
  500: 'Fault',
  503: 'Service Unavailable',
};

Client.prototype.successCodes = {
  200: 'OK',
  201: 'Created',
  202: 'Accepted',
  203: 'Non-authoritative information',
  204: 'No content',
};
