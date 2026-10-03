var fs = require('fs'),
    os = require('os'),
    path = require('path'),
    { Writable } = require('stream'),
    ImagicoElevationDownloader = require('../').ImagicoElevationDownloader;

// block.zip: a folder with two tiles, a nested .zip and a .txt
var TILE_SIZE = 1201 * 1201 * 2;

var dirs = [];

afterEach(function() {
    vi.restoreAllMocks();
    dirs.splice(0).forEach(function(dir) {
        fs.rmSync(dir, { recursive: true, force: true });
    });
});

function slowDisk() {
    var createWriteStream = fs.createWriteStream;
    vi.spyOn(fs, 'createWriteStream').mockImplementation(function(filePath, options) {
        var file = createWriteStream(filePath, options);
        var slow = new Writable({
            write: function(chunk, encoding, done) {
                setTimeout(function() {
                    file.write(chunk, done);
                }, 5);
            },
            final: function(done) {
                file.end(done);
            }
        });
        return slow;
    });
}

function tempDir() {
    var dir = fs.mkdtempSync(path.join(os.tmpdir(), 'node-hgt-unzip-'));
    dirs.push(dir);
    return dir;
}

test('resolves only once every tile in the zip is completely written', function() {
    var dir = tempDir();
    slowDisk();
    var dler = new ImagicoElevationDownloader(dir);
    return dler._unzip(path.join(__dirname, 'data', 'block.zip'), dir).then(function() {
        expect(fs.statSync(path.join(dir, 'N10E010.hgt')).size).toBe(TILE_SIZE);
        expect(fs.statSync(path.join(dir, 'N10E011.hgt')).size).toBe(TILE_SIZE);
    });
});

test('extracts only .hgt files and leaves no temporary files', function() {
    var dir = tempDir();
    var dler = new ImagicoElevationDownloader(dir);
    return dler._unzip(path.join(__dirname, 'data', 'block.zip'), dir).then(function() {
        expect(fs.readdirSync(dir).sort()).toEqual(['N10E010.hgt', 'N10E011.hgt']);
    });
});

test('rejects a zip that cannot be opened', function() {
    var dir = tempDir();
    var truncated = path.join(dir, 'truncated.zip');
    var whole = fs.readFileSync(path.join(__dirname, 'data', 'block.zip'));
    fs.writeFileSync(truncated, whole.subarray(0, Math.floor(whole.length / 2)));
    var dler = new ImagicoElevationDownloader(dir);
    return expect(dler._unzip(truncated, dir)).rejects.toBeDefined();
});

test('removes the partly written file when a tile in the zip is corrupt', function() {
    var dir = tempDir();
    var corrupt = path.join(dir, 'corrupt.zip');
    var bytes = Buffer.from(fs.readFileSync(path.join(__dirname, 'data', 'block.zip')));
    // The first occurrence of the name is in the tile's local header; its compressed data follows the name and extra field
    var name = bytes.indexOf('M99/N10E010.hgt');
    var dataStart = name + 'M99/N10E010.hgt'.length + bytes.readUInt16LE(name - 2);
    bytes.fill(0xff, dataStart + 100, dataStart + 300);
    fs.writeFileSync(corrupt, bytes);
    var dler = new ImagicoElevationDownloader(dir);
    return expect(dler._unzip(corrupt, dir)).rejects.toBeDefined().then(function() {
        expect(fs.readdirSync(dir)).toEqual(['corrupt.zip']);
    });
});
