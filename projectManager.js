var mongoose = require('mongoose');
var fs = require('fs');
var mkdirp = require('mkdirp');

var Schema = mongoose.Schema;

var fileSchema = new Schema({
    fileID: String,
    fileName: String,
    path: String
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
var dirName = __dirname + "\\UserProjects";
//console.log(dirName);

var data = "do shash'owania";
var crypto = require('crypto');
crypto.createHash('md5').update(data).digest("hex");

module.exports = {
    file: mongoose.model('files', fileSchema),
    view: function(req, res, dirPath){
        var newdirPath = "";
        for(var i = 0; i  < dirPath.length; ++i){
            if(dirPath.charAt(i) == '.'){
                newdirPath += "\\";
            }
            else{
                newdirPath += dirPath.charAt(i);
            }
        }
        var newPath = dirName + newdirPath;
        fs.readdir(newPath, function(err, items) {
            var con = [];
            var inserted = 0;
            var done = 0;
            for(var i = 0; i < items.length; ++i){
                var tmpPath = newPath + "\\" + items[i];
                if(fs.lstatSync(tmpPath).isDirectory()) {
                    con.push({'name': items[i], 'path': dirPath, 'type': 'COLLECTION'});
                    inserted++;
                    if(inserted == items.length){
                        done = 1;
                        sendResponse(req, res, con);
                    }
                }
                else {
                    file.find({fileName: items[i]}, function(err, newFile){
                        newFile.forEach(function(nF){
                            con.push({'name': nF.fileName, 'path': dirPath, 'type': 'DOC', 'identifier': nF.fileID});
                            inserted++;
                            if(inserted == items.length){
                                done = 1;
                               sendResponse(req, res, con);
                            }
                        });

                    });
                }

            }
            if(done == 0) {
                if (inserted == items.length) {
                    sendResponse(req, res, con);
                }
            }
        });
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
            var completeFilePath = newPath + req.body.name;
            var ide = crypto.createHash('md5').update(completeFilePath).digest("hex")
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
            new collection({
                collectionName: req.body.name,
                path: newPath
            }).save(function(err, newCollection){
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

function sendResponse(req, res, collectionContent) {
    var content = JSON.stringify(collectionContent);
    res.write(content, function (er) {
        res.end();
    });
}