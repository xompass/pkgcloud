/*
 * container.js: AWS S3 Bucket
 *
 * (C) 2012 Charlie Robbins, Ken Perkins, Ross Kukulinski & the Contributors.
 *
 */

const util = require('util');
const storage = require('../storage');
const base = require('../../core/storage/container');
const _ = require('lodash');

const Container = exports.Container = function Container(client, details) {
  base.Container.call(this, client, details);
};

util.inherits(Container, base.Container);

Container.prototype._setProperties = function (details) {
  const self = this;

  if (typeof details === 'string') {
    this.name = details;
    return;
  }

  this.name = details.Name;

  //
  // AWS specific
  //

  this.maxKeys = details.MaxKeys;
  this.isTruncated = details.IsTruncated === 'true';

  if (details.Contents) {
    details.Contents.forEach(function (file) {
      file.container = self;
      self.files.push(new storage.File(self.client, file));
    });
  }
};

Container.prototype.toJSON = function () {
  return _.pick(this, ['name', 'maxKeys', 'isTruncated']);
};

