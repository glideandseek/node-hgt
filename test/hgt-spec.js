var Hgt = require('../').Hgt;

test('can open hgt', function() {
    var hgt = new Hgt(__dirname + '/data/N57E011.hgt', [57, 11]);
    hgt.destroy();
});

test('can query hgt nearestneighbour', function() {
    var hgt = new Hgt(__dirname + '/data/N57E011.hgt', [57, 11], {
        interpolation: Hgt.nearestNeighbour
    });

    expect(hgt.getElevation([57, 11])).toBe(0);
    expect(hgt.getElevation([57.7, 11.9])).toBe(13);
    hgt.destroy();
});

test('can query hgt bilinear', function() {
    var hgt = new Hgt(__dirname + '/data/N57E011.hgt', [57, 11], {
        interpolation: Hgt.bilinear
    });

    expect(hgt.getElevation([57, 11])).toBe(0);
    expect(hgt.getElevation([57.7, 11.9])).toBeCloseTo(13, 9);
    hgt.destroy();
});
