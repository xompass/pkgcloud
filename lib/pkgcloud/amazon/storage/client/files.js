/*
 * files.js: Instance methods for working with files from AWS S3
 *
 * (C) 2012 Charlie Robbins, Ken Perkins, Ross Kukulinski & the Contributors.
 *
 */

const base = require('../../../core/storage');
const pkgcloud = require('../../../../../lib/pkgcloud');
const through = require('through2');
const storage = pkgcloud.providers.amazon.storage;
const _ = require('lodash');

//
// ### function removeFile (container, file, callback)
// #### @container {string} Name of the container to destroy the file in
// #### @file {string} Name of the file to destroy.
// #### @callback {function} Continuation to respond to when complete.
// Destroys the `file` in the specified `container`.
//
exports.removeFile = function (container, file, callback) {
  const self = this;

  if (container instanceof storage.Container) {
    container = container.name;
  }

  if (file instanceof storage.File) {
    file = file.name;
  }

  self.s3.deleteObject({
    Bucket: container,
    Key: file,
  }, function (err, data) {
    return err
      ? callback(err)
      : callback(null, !!data.DeleteMarker);
  });
};

exports.upload = function (options) {
  const self = this;

  // check for deprecated calling with a callback
  if (typeof arguments[arguments.length - 1] === 'function') {
    self.emit('log::warn', 'storage.upload no longer supports calling with a callback');
  }

  const s3Options = {
    Bucket: options.container instanceof base.Container ? options.container.name : options.container,
    Key: options.remote instanceof base.File ? options.remote.name : options.remote,
  };

  const s3Settings = {
    queueSize: options.queueSize || 1,
    partSize: options.partSize || 5 * 1024 * 1024,
  };

  if (options.cacheControl) {
    s3Options.CacheControl = options.cacheControl;
  }

  if (options.contentType) {
    s3Options.ContentType = options.contentType;
  }

  if (options.contentEncoding) {
    s3Options.ContentEncoding = options.contentEncoding;
  }

  // use ACL until a more obvious permission generalization is available
  if (options.acl) {
    s3Options.ACL = options.acl;
  }

  // add AWS specific options
  if (options.cacheControl) {
    s3Options.CacheControl = options.cacheControl;
  }

  if (options.ServerSideEncryption) {
    s3Options.ServerSideEncryption = options.ServerSideEncryption;
  }

  // we need a writable stream because aws-sdk listens for an error event on writable
  // stream and redirects it to the provided callback - without the writable stream
  // the error would be emitted twice on the returned proxyStream
  const writableStream = through();
  // we need a proxy stream so we can always return a file model
  // via the 'success' event
  const proxyStream = through();

  s3Options.Body = writableStream;

  const managedUpload = self.s3.upload(s3Options, s3Settings);

  proxyStream.managedUpload = managedUpload;

  managedUpload.send(function (err, data) {
    if (err) {
      return proxyStream.emit('error', err);
    }
    return proxyStream.emit('success', new storage.File(self, data));
  });

  proxyStream.pipe(writableStream);

  return proxyStream;
};

exports.download = function (options) {
  const self = this;

  return self.s3.getObject({
    Bucket: options.container instanceof base.Container ? options.container.name : options.container,
    Key: options.remote instanceof base.File ? options.remote.name : options.remote,
  }).createReadStream();

};

exports.getFile = function (container, file, callback) {
  const containerName = container instanceof base.Container ? container.name : container;
  const self = this;

  self.s3.headObject({
    Bucket: containerName,
    Key: file,
  }, function (err, data) {
    return err
      ? callback(err)
      : callback(null, new storage.File(self, _.extend(data, {
        container: container,
        name: file,
      })));
  });
};

exports.getFiles = function (container, options, callback) {
  const containerName = container instanceof base.Container ? container.name : container;
  const self = this;

  if (typeof options === 'function') {
    callback = options;
    options = {};
  } else if (!options) {
    options = {};
  }

  const s3Options = {
    Bucket: containerName,
  };

  if (options.marker) {
    s3Options.Marker = options.marker;
  }

  if (options.prefix) {
    s3Options.Prefix = options.prefix;
  }

  if (options.maxKeys) {
    s3Options.MaxKeys = options.maxKeys;
  }

  self.s3.listObjects(s3Options, function (err, data) {
    return err
      ? callback(err)
      : callback(null, self._toArray(data.Contents).map(function (file) {
        file.container = container;
        return new storage.File(self, file);
      }), {
        isTruncated: data.IsTruncated,
        marker: data.Marker,
        nextMarker: data.NextMarker,
      });
  });
};

