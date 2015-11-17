var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var queryString = require('querystring');
var url = require('url');
var mkdirp = require('mkdirp');

var Schema = mongoose.Schema;
var userSchema = new Schema({
    name: String,
    username: String,
    userID: String,
    password: String,
    emailID: String,
});

var user = mongoose.model('users', userSchema);
var dirName = __dirname + "\\User Projects";

module.exports = {
    user: mongoose.model('users', userSchema),

    getUsers: function(req, res) {
        user.find({}, function (err, result) {
            resToBeSent = [];
            result.forEach(function(ite){
                resToBeSent.push({'username': ite.username, 'name': ite.name, 'userId': ite.userID, 'emailId' : ite.emailID});
            });
            res.write(JSON.stringify(resToBeSent), function (er) {
                res.end();
            });
        });
    },
    logIn: function(req, res) {
        user.find({username: req.body.username}, function (err, curUser) {
            if (curUser.length == 0) {
                res.write("{'statusCode' : '404', 'statusMessage' : 'No Such UserExists'}", function (er) {
                    res.end();
                });
            }
            else {
                //curUser = JSON.parse(curUser);
                //console.log(curUser);

                if(curUser.length == 1) {
                    curUser.forEach(function (item) {
                        if (item.password == req.body.password) {
                            res.write("{'statusCode' : '200', 'statusMessage' : 'Login Successful'}", function (er) {
                                res.end();
                            });
                        }
                        else {
                            res.write("{'statusCode' : '404', 'statusMessage' : 'Username and Password doesn not match'}", function (er) {
                                res.end();
                            });
                        }
                        });
                }
            }
        });
    },
    getInfo: function(req, res) {
        //res.write('loda lele bc', function(er){ res.end() });
        user.find({username: req.body.username}, function (err, curUser) {
            curUser.forEach(function (item) {
                var ite = {'username': item.username, 'name': item.name, 'userId': item.userID, 'emailId' : item.emailID};
                var toBeSent = JSON.stringify(ite);
                //console.log(toBeSent);
                res.write(toBeSent, function (er) {
                    res.end();
                });
            })
        });
    },
    signUp: function(req, res) {
        //console.log(req.body);
        user.find({username: req.body.username}, function (err, Ok) {
            //console.log(Ok);
            if (Ok.length == 0) {
                new user({
                    name: req.body.name,
                    username: req.body.username,
                    userID: req.body.username,
                    password: req.body.password,
                    emailID: req.body.emailId,
                    createTime: new Date()
                }).save(function (err, newUser) {
                    if (err) {
                        //console.log("Error while inserting new User");
                        res.write("{'statusCode' : '404', 'statusMessage' : 'Insertion Error.'}", function (er) {
                            res.end();
                        })
                    }
                    else {
                        //console.log("Successfully created new User");
                        var newPath = dirName + "\\" + req.body.username;
                        mkdirp(newPath, function(errr) {
                            res.write("{'statusCode' : '200', 'statusMessage' : 'Registration Successful.'}", function (er) {
                                res.end();
                            });
                        });
                    }
                });
            }
            else {
                //0ole.log('User Already Exists');
                res.write("{'statusCode' : '404', 'statusMessage' : 'User Already Exists'}", function (er) {
                    res.end();
                });
            }
        });
        //res.end();
    }
};