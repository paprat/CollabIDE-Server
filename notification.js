var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var queryString = require('querystring');
var url = require('url');

var Schema = mongoose.Schema;

var notificationSchema = new Schema({
    value: String,
    projectPath: String,
    type: String,
    projectName: String,
    userID: String
});

var notification = mongoose.model('notification', notificationSchema);

module.exports = {
    addNewNotification: function(req, res, newUser, pPath, pName, shUser){
        new notification({
            value: newUser.name + " has shared this project with you",
            projectPath: pPath,
            type: 'COLLECTION',
            projectName: pName,
            userID: shUser
        }).save(function(errr, newData){
            res.end();
        })
    },
    
	getNotifications: function(req, res, userId)
    {
        notification.find({userID: userId}, function (err, foound) {
            foound.forEach(function(found){
                    res.end(JSON.stringify(
                        [{'project': {'name' : found.projectName, 'path' : found.projectPath, 'type' : found.type}, 'notificationMessage': found.value}]
                    ));
            });
        });
    },
	
    clearAll: function(req, res, userId){
        console.log(userId);

        notification.remove({userID: userId}, function(err){
            res.write(userId, function(er){
                res.end();
            });
        });
    }
};