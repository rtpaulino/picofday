'use strict';

var request = require('request');
var requestPromise = require('request-promise');
var cheerio = require('cheerio');

var parseHtml = function (body) {
    return cheerio.load(body);
}
var options = {

};

var get = function (url) {
    return requestPromise({
        uri: url,
        transform: parseHtml
    });
};

var extractBootstrapData = function ($) {
    var dataStr = $('#bootstrap_data').html();
    var lines = dataStr.split('\n');
    var found = false;
    var regex = /^App.bootstrap = (.*)$/;
    var matcher;

    for (var i = 0, len = lines.length; i < len && !found; i++) {
        if (matcher = regex.exec(lines[i].trim())) {
            found = true;
        }
    }

    if (found) {
        return JSON.parse(matcher[1]);
    } else {
        return Promise.reject('Could not extract bootstrap data');
    }
};

var sortOrder = [2048, 1600, 1080, 6, 5, 4, 21, 31, 20, 30];

/**
 * Return image with better resolution according to:
 * https://github.com/500px/api-documentation/blob/master/basics/formats_and_terms.md
 * <pre>
 * id   | dimensions
 * -----------------
 * 4    | 900px on the longest edge
 * 5    | 1170px on the longest edge
 * 6    | 1080px high
 * 20   | 300px high
 * 21   | 600px high
 * 30   | 256px on the longest edge
 * 31   | 450px high
 * 1080 | 1080px on the longest edge
 * 1600 | 1600px on the longest edge
 * 2048 | 2048px on the longest edge
 * </pre>
 * @param {*} images 
 */
var getBestImage = function (images) {
    if (images.length == 0) {
        return null;
    }

    images.sort(function (a, b) {
        var idxA = sortOrder.indexOf(a.size);
        var idxB = sortOrder.indexOf(b.size);
        if (idxA < 0) { idxA = sortOrder.length; }
        if (idxB < 0) { idxB = sortOrder.length; }

        return idxA - idxB;
    });
    return images[0];
};

var getFirstPhoto = function (data) {
    if (data && data.userdata && data.userdata.photos && data.userdata.photos.length) {
        var photo = data.userdata.photos[0];
        var best = getBestImage(photo.images);
        if (best) {
            return best;
        }
    }

    // fallback
    return Promise.reject('Could not find any photos');
};

var mkdirs = function (dir) {
    var mkdirp = require('mkdirp');
    return new Promise((resolve, reject) => {
        mkdirp(dir, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve();
            }
        });
    });
};

var getDestinationFile = function (format) {
    var path = require('path');
    
    var dir;
    if (process.env.DESTINATION_DIR) {
        dir = process.env.DESTINATION_DIR;
    } else {
        var homedir = require('os').homedir();
        dir = path.join(homedir, 'Pictures');
    }
    
    return mkdirs(dir)
        .then(() => {
            //var id = require('uuid/v4')();
            return path.join(dir, 'picOfTheDay.' + format);
        });
};

var download = function (photo) {
    return getDestinationFile(photo.format)
        .then(dest => {
                return new Promise((resolve, reject) => {
                    var http = require('http');
                    var fs = require('fs');

                    var file = fs.createWriteStream(dest);

                    request(photo.url)
                        .pipe(file)
                        .on('finish', () => {
                            file.close();
                            resolve(dest);
                        })
                        .on('error', err => {
                            fs.unlink(dest);
                            reject(err);
                        });
                    });
        });
};

var picOfTheDay = function () {
    return get('https://500px.com/picofday')
        .then(extractBootstrapData)
        .then(getFirstPhoto)
        .then(download);
};

module.exports = picOfTheDay;
