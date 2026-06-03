var SyncTileSet = require('../').SyncTileSet;

test('can create synchronous tileset', function() {
    return new Promise(function(resolve, reject) {
        var tileset = new SyncTileSet(__dirname + '/data/', [57.7, 11.9], [57.8, 11.95], function(err) {
            if (err) {
                reject(err);
            } else {
                tileset.destroy();
                resolve();
            }
        });
    });
});

test('can query synchronous tileset', function() {
    return new Promise(function(resolve, reject) {
        var tileset = new SyncTileSet(__dirname + '/data/', [57.7, 11.9], [57.8, 11.95], function(err) {
            if (err) {
                reject(err);
                return;
            }

            var elevation = tileset.getElevation([57.7, 11.9]);
            expect(elevation).toBeCloseTo(13, 9);
            tileset.destroy();
            resolve();
        });
    });
});

test('can\'t query synchronous non-existing tiles', function() {
    return new Promise(function(resolve, reject) {
        var tileset = new SyncTileSet(__dirname + '/data/', [57.7, 11.9], [57.8, 11.95], function(err) {
            if (err) {
                reject(err);
                return;
            }
            var elevation;
            try {
                elevation = tileset.getElevation([52.7, 11.9]);
            } catch (e) {
                tileset.destroy();
                resolve();
                return;
            }

            reject(new Error('getElevation for non-existing tile returned: ' + elevation));
        });
    });
});
