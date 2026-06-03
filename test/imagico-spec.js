var ImagicoElevationDownloader = require('../').ImagicoElevationDownloader;

test('can search Imagico.de', function() {
    var dler = new ImagicoElevationDownloader();
    return dler.search([57.7, 11.9]).then(function(entries) {
        expect(entries[0].link).toBe('http://www.viewfinderpanoramas.org/dem3/O32.zip');
    });
});

test.skipIf(!process.env.RUN_ALL_TESTS)('can download file', function() {
    var dler = new ImagicoElevationDownloader(__dirname + '/data/');
    return new Promise(function(resolve, reject) {
        dler.download('N57E011', [57.7, 11.9], function(err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
});

test.skipIf(!process.env.RUN_ALL_TESTS)('can handle multiple parallel downloads', function() {
    var dler = new ImagicoElevationDownloader(__dirname + '/data/');
    var downloads = [];
    for (var i = 0; i < 10; i++) {
        downloads.push(new Promise(function(resolve, reject) {
            dler.download('N57E011', [57.7, 11.9], function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve();
                }
            });
        }));
    }
    return Promise.all(downloads);
});
