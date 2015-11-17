var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var queryString = require('querystring');
var url = require('url');
var fs = require('fs');
var mkdirp = require('mkdirp');

var Schema = mongoose.Schema;

var fileSchema = new Schema({
    fileID: String,
    fileName: String,
    path: String
});

var fileUserSchema = new Schema({
    userID: String,
    fileID: String
});

var collectionSchema = new Schema({
    collectionName: String,
    path: String
});

var userProjectSchema = new Schema({
    userID: String,
    projectPath: String
});

var file = mongoose.model('files', fileSchema);
var collection = mongoose.model('collection', collectionSchema);
var userProject = mongoose.model('userProject', userProjectSchema);
var dirName = __dirname + "\\User Projects";
//console.log(dirName);

var data = "do shash'owania";
var crypto = require('crypto');
crypto.createHash('md5').update(data).digest("hex");

module.exports = {
    file: mongoose.model('files', fileSchema),
    view: function(req, res, dirPath){
        //console.log(dirPath);
        var newdirPath = "";
        //console.log(req.body);
        for(var i = 0; i  < dirPath.length; ++i){
            if(dirPath.charAt(i) == '.'){
                newdirPath += "\\";
            }
            else{
                newdirPath += dirPath.charAt(i);
            }
        }
        var newPath = dirName + newdirPath;
        //console.log(fs.lstatSync(newPath).isDirectory());
        // mkdirp(newPath, function(err) {
        fs.readdir(newPath, function(err, items) {
            var con = [];
            //items.forEach(function(listItem){
            //    var tmpPath = newPath + "\\" + listItem;
            //    console.log(tmpPath)
            //    if(fs.lstatSync(tmpPath).isDirectory())
            //        con.push({'name': listItem, 'path': dirPath, 'type': 'COLLECTION'});
            //    else {
            //        file.find({fileName: listItem}, function(err, newFile){
            //            con.push({'name': listItem, 'path': dirPath, 'type': 'DOC', 'identifier': newFile.fileID});
            //        })
            //    }
            //});
            var inserted = 0;
            var done = 0;
            for(var i = 0; i < items.length; ++i){
                var tmpPath = newPath + "\\" + items[i];
                //console.log(tmpPath)
                if(fs.lstatSync(tmpPath).isDirectory()) {
                    con.push({'name': items[i], 'path': dirPath, 'type': 'COLLECTION'});
                    inserted++;
                    if(inserted == items.length){
                        done = 1;
                        dowork(req, res, con);
                    }
                }
                else {
                    file.find({fileName: items[i]}, function(err, newFile){
                        newFile.forEach(function(nF){
                            con.push({'name': nF.fileName, 'path': dirPath, 'type': 'DOC', 'identifier': nF.fileID});
                            inserted++;
                            if(inserted == items.length){
                                done = 1;
                                dowork(req, res, con);
                            }
                        });

                    });
                }

            }
            if(done == 0) {
                if (inserted == items.length) {
                    dowork(req, res, con);
                }
            }

        });
        //});
    },
    addNode: function(req, res,dirPath){
        if(req.body.type == 'DOC'){
            var newdirPath = "";
            for(var i = 0; i  < dirPath.length; ++i){
                if(dirPath.charAt(i) == '.'){
                    newdirPath += "\\";
                    count++;
                }
                else{
                    newdirPath += dirPath.charAt(i);
                }
            }
            var newPath = dirName + newdirPath;
            //console.log(req.body);
            //console.log(newPath);
            var ide = crypto.createHash('md5').update(req.body.name).digest("hex")
            new file({
                fileID: ide,
                fileName: req.body.name,
                path: dirPath
            }).save(function(err, newFile){
                if(err){
                    res.write("Couldn't create new file!", function(errr){
                        res.end();
                    });
                }
                else{
                    fs.writeFile(newPath+"\\"+req.body.name, "", function(er){
                        var toBeSent = {'name': req.body.name, 'path': req.body.path, 'type': 'DOC', 'identifier': ide};
                        //console.log(JSON.stringify(toBeSent));
                        res.write(JSON.stringify(toBeSent), function(errr){res.end();});
                    });
                }
            });
        }
        else{
            var count = 0;
            var newdirPath = "";
            for(var i = 0; i  < dirPath.length; ++i){
                if(dirPath.charAt(i) == '.'){
                    newdirPath += "\\";
                    count++;
                }
                else{
                    newdirPath += dirPath.charAt(i);
                }
            }
            var newPath = dirName + newdirPath;
            //console.log(req.body);
            new collection({
                collectionName: req.body.name,
                path: newPath
            }).save(function(err, newCollection){
                //console.log(newCollection);
                var userId = "";
                for(var i = 0; i < dirPath.length; ++i){
                    if(dirPath.charAt(i) == '.')
                        continue;
                    userId += dirPath.charAt(i);
                }
                mkdirp(newPath + '\\' + req.body.name, function(errr) {
                    if(count == 1){
                        new userProject({
                            userID: userId,
                            projectPath: newPath+"\\"+req.body.name
                        }).save(function(ex, newEntry){
                            var toBeSent = {'name' : req.body.name, 'path' : dirPath, 'type' : 'COLLECTION'};
                            res.write(JSON.stringify(toBeSent), function(er){res.end();});
                        });
                    }
                    else{
                        res.end();
                    }
                });
            });
        }
    }
};

function dowork(req, res, con) {
    var content = JSON.stringify(con);
    //console.log(content);
    res.write(content, function (er) {
        res.end();
    });
}