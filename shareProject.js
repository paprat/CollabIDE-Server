var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var queryString = require('querystring');
var url = require('url');

var Schema  = mongoose.Schema;

var sharedProjectsSchema = new Schema({
    userID: String,
    path: String,
    name: String,
    type: String
});

var notification = require('./notification');
var sharedProject = mongoose.model('sharedProject', sharedProjectsSchema);
var auth = require('./auth');

module.exports = {
    getSharedProjects: function(req, res, userId){
        sharedProject.find({userID: userId}, function(err, result){
            res.write(JSON.stringify(result), function(er){res.end();});
        });
    },
    share: function(req, res, docId, userId, shUser){
        var pName = '';
        var pPath = '.';
        var done = 0;
        for(var i = 0; i < docId.length; ++i){
            if(docId.charAt(i) == '.'){
                done++;
            }
            else if(done == 1){
                pPath += docId.charAt(i);
            }
            else if(done == 2){
                pName += docId.charAt(i);
            }
        }
        auth.user.find({userID: userId}, function(err, newU) {
            newU.forEach(function (newUser) {
                new sharedProject({
                    userID: shUser,
                    path: pPath,
                    name: pName,
                    type: 'COLLECTION'
                }).save(function (err, newData) {
                    notification.addNewNotification(req, res, newUser, pPath, pName, shUser);
                });
            });
        });
    }
};

function getSharedProjects(req, res){
    sharedProject.find({userID: req.body.userId}, function(err, result){
        res.write(result, function(er){res.end();});
    });
}