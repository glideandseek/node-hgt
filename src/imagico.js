var { randomUUID } = require('crypto'),
    fs = require('fs'),
    os = require('os'),
    path = require('path'),
    { pipeline, Readable } = require('stream'),
    yauzl = require('yauzl'),
    _latLng = require('./latlng');

function ImagicoElevationDownloader(cacheDir, options) {
    this.options = Object.assign({}, options);
    this._cacheDir = cacheDir;
    this._downloads = {};
}

ImagicoElevationDownloader.prototype.download = function(tileKey, latLng, cb) {
    var cleanup = function() {
            delete this._downloads[tileKey];
            if (tempPath !== undefined && fs.existsSync(tempPath)) {
                fs.unlinkSync(tempPath);
            }
        }.bind(this),
        download = this._downloads[tileKey],
        tempPath,
        stream;

    if (!download) {
        download = this.search(latLng)
            .then(function(tileZips) {
                if (!tileZips.length) {
                    throw new Error('No tiles found for latitude ' + latLng.lat + ', longitude ' + latLng.lng);
                }

                tempPath = path.join(os.tmpdir(), randomUUID() + '-' + tileZips[0].name);
                stream = fs.createWriteStream(tempPath);
                return this._download(tileZips[0].link, stream);
            }.bind(this))
            .then(function() {
                return this._unzip(tempPath, this._cacheDir);
            }.bind(this))
            .then(cleanup)
            .catch(function(err) {
                cleanup();
                throw err;
            });
        this._downloads[tileKey] = download;
    }

    download.then(function() {
        cb(undefined);
    }).catch(function(err) {
        cb(err);
    });
};

ImagicoElevationDownloader.prototype.search = function(latLng) {
    var ll = _latLng(latLng);
    var url = 'http://www.imagico.de/map/dem_json.php?date=&lon=' +
        ll.lng + '&lat=' + ll.lat + '&lonE=' + ll.lng +
        '&latE=' + ll.lat + '&vf=1';
    return fetch(url).then(function(response) {
        if (!response.ok) {
            throw response;
        }
        return response.text().then(function(body) {
            try {
                return JSON.parse(body);
            } catch (e) {
                throw 'Could not parse response from imagico: ' + body;
            }
        });
    });
};

ImagicoElevationDownloader.prototype._download = function(url, stream) {
    return fetch(url).then(function(response) {
        if (!response.ok) {
            throw response;
        }
        return new Promise(function(fulfill, reject) {
            var body = Readable.fromWeb(response.body);
            body.pipe(stream);
            body.on('error', reject);
            stream.on('finish', function() {
                fulfill(stream);
            });
            stream.on('error', reject);
        });
    });
};

ImagicoElevationDownloader.prototype._unzip = function(zipPath, targetPath) {
    return new Promise(function(fulfill, reject) {
        yauzl.open(zipPath, { lazyEntries: true }, function(err, zipfile) {
            if (err) {
                reject(err);
                return;
            }
            zipfile
            .on('entry', function(entry) {
                if (!/\.hgt$/i.test(entry.fileName)) {
                    zipfile.readEntry();
                    return;
                }
                zipfile.openReadStream(entry, function(err, readStream) {
                    var lastSlashIdx = entry.fileName.lastIndexOf('/'),
                        fileName = entry.fileName.substr(lastSlashIdx + 1),
                        filePath = path.join(targetPath, fileName),
                        partPath = filePath + '.' + randomUUID();
                    if (err) {
                        reject(err);
                        return;
                    }

                    pipeline(readStream, fs.createWriteStream(partPath), function(err) {
                        if (err) {
                            fs.rm(partPath, { force: true }, function() {
                                reject(err);
                            });
                            return;
                        }
                        fs.rename(partPath, filePath, function(err) {
                            if (err) {
                                reject(err);
                                return;
                            }
                            zipfile.readEntry();
                        });
                    });
                });
            })
            .on('error', reject)
            .on('end', fulfill);
            zipfile.readEntry();
        });
    });
};

module.exports = ImagicoElevationDownloader;
