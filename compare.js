/**
 * Created by alexgan on 2015/10/15.
 */
var fs = require('fs');
var path = require("path");
var util = require('util');

var cheerio = require("cheerio");
var colors = require('colors');
var request = require("request");
var string = require("underscore.string");
var walk = require("walkdo");

var imgPath1 = process.argv[2];
var imgPath2 = process.argv[3];

function formatPath(path) {
    path = path.split(path.sep).join('/');
    return (string.endsWith(path, "/") ? path : path + "/");
}

function getImageFiles(imgPath) {
    var imgFiles = [];
    walk(imgPath, function (filePath, next, context) {
        filePath = filePath.replace(/\\/g, "/");

        var ext = path.extname(filePath);
        if (ext === ".jpg") {
            imgFiles.push(filePath);
        }

        next.call(context);
    }, function () {
    });

    return imgFiles;
}

/**
 * Compare Images with pHash.
 *
 * @param algorithm
 *                  radish: RADISH (radial hash)
 *                  pixtube: DCT hash
 *                  mh: Marr/Mexican hat wavelet
 * @param image1
 * @param image2
 */
function compareImage(algorithm, image1, image2) {
    var options = {
        method: 'POST',
        url: 'http://www.phash.org/cgi-bin/phash-demo-new.cgi',
        headers: {
            'cache-control': 'no-cache',
            'content-type': 'multipart/form-data; boundary=---011000010111000001101001'
        },
        formData: {
            algorithm: algorithm,
            file1: {
                value: fs.createReadStream(image1),
                options: {filename: path.basename(image1), contentType: 'image/jpeg'}
            },
            file2: {
                value: fs.createReadStream(image2),
                options: {filename: path.basename(image2), contentType: 'image/jpeg'}
            }
        }
    };

    request(options, function (error, response, body) {
        if (error) throw new Error(error);

        console.log(algorithm, path.basename(image1), "->", path.basename(image2));
        //console.log(body);
        var $ = cheerio.load(body);
        //console.log($('.promocontent').find('p').length);
        //var results = [];
        //$('p', '.promocontent').each(function (i, elem) {
        //    if (i == 1) {
        //        results.push($(this).text());
        //    }
        //});
        //console.log(results.join('\n'));;

        processResult($('p', '.promocontent').eq(1).text());
    });
}

function processResult(resultStr) {
    //var str = "pHash determined your images are similar with hamming distance = 24.000000.Threshold set to 26.00.";
    var re = /( \d+(\.\d\d)*)/gi;
    var found = resultStr.match(re);
    //console.log(found);
    if (found != null && found.length > 1) {
        if (parseFloat(found[0]) > parseFloat(found[1])) {
            console.log("Not similar".bgGreen.bold, colors.inverse(found[0]), colors.gray(">" + found[1] + "\n"));
        } else {
            console.log("Similar!".bgRed.bold, colors.inverse(found[0]), colors.gray("<=" + found[1] + "\n"));
        }
    } else {
        console.error("match: " + found);
    }
}

(function run() {
    if (string.isBlank(imgPath1) || string.isBlank(imgPath2)) {
        console.error("Please check usages!");
    } else {
        var imgFiles1 = getImageFiles(formatPath(imgPath1));
        var imgFiles2 = getImageFiles(formatPath(imgPath2));

        for (var i in imgFiles1) {
            var imgFile1 = imgFiles1[i];
            for (var j in imgFiles2) {
                var imgFile2 = imgFiles2[j];

                compareImage("pixtube", imgFile1, imgFile2);
            }
        }
    }
})();
