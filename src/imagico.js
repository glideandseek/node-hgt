var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    { Readable } = require('stream'),
    extend = require('extend'),
    Promise = require('promise'),
    yauzl = require('yauzl'),
    _latLng = require('./latlng');

function ImagicoElevationDownloader(cacheDir, options) {
    this.options = extend({}, options);
    this._cacheDir = cacheDir;
    this._downloads = {};
}

ImagicoElevationDownloader.prototype.download = function(tileKey, latLng, cb) {
    var cleanup = function() {
            delete this._downloads[tileKey];
            if (fs.existsSync(tempPath)) {
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

                tempPath = path.join(os.tmpdir(), tileZips[0].name);
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
        var unzips = [];

        yauzl.open(zipPath, function(err, zipfile) {
            if (err) {
                reject(err);
                return;
            }
            zipfile
            .on('entry', function(entry) {
                if (/\/$/.test(entry.fileName)) {
                    return;
                }
                zipfile.openReadStream(entry, function(err, readStream) {
                    var lastSlashIdx = entry.fileName.lastIndexOf('/'),
                        fileName = entry.fileName.substr(lastSlashIdx + 1),
                        filePath = path.join(targetPath, fileName);
                    if (err) {
                        reject(err);
                        return;
                    }

                    unzips.push(new Promise(function(fulfill, reject) {
                        readStream.on('end', fulfill);
                        readStream.on('error', reject);
                    }));
                    readStream.pipe(fs.createWriteStream(filePath));
                });
            });
            zipfile.on('end', function() {
                Promise.all(unzips)
                    .then(function() {
                        fulfill();
                    })
                    .catch(reject);
            });
        });
    });
};

module.exports = ImagicoElevationDownloader;
