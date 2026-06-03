var TileSet = require('../').TileSet;

test('can create tileset', function() {
    var tileset = new TileSet(__dirname + '/data/');
    tileset.destroy();
});

test('can query tileset', function() {
    var tileset = new TileSet(__dirname + '/data/');
    return new Promise(function(resolve, reject) {
        tileset.getElevation([57.7, 11.9], function(err, elevation) {
            tileset.destroy();
            if (err) {
                reject(new Error('getElevation failed: ' + err.message));
            } else {
                expect(elevation).toBeCloseTo(13, 9);
                resolve();
            }
        });
    });
});

test('can\'t query non-existing tiles', function() {
    var tileset = new TileSet(__dirname + '/data/', {downloader:null});
    return new Promise(function(resolve, reject) {
        tileset.getElevation([52.7, 11.9], function(err, elevation) {
            tileset.destroy();
            if (err) {
                resolve();
            } else {
                reject(new Error('getElevation for non-existing tile returned: ' + elevation));
            }
        });
    });
});
