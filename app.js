var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var queryString = require('querystring');
var url = require('url');

//express app
var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//JSON parser
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

//Modules required by Server for handling various requests
var auth = require('./auth');
var projectManager = require('./projectManager');
var notification = require('./notification');
var share = require('./shareProject');
var docOperationsHandler = require('./docOperationsHandler');

//Database
mongoose.connect('mongodb://localhost/CollabEdit');
//Database Connection
var conn = mongoose.connection;

var dirName = __dirname + "\\UserProjects";

app.use("/", function(req, res) {
    var parsedUrl = url.parse(req.url);
    var pathName = parsedUrl.pathname;
    var query = parsedUrl.query;
    var parsedQuery = queryString.parse(query);

    //console.log(parsedUrl);
    switch(pathName) {
        //Doc Operations
        case '/register': {
            passFileToHandler(req, res, parsedQuery.userId, parsedQuery.docId, docOperationsHandler.handleRegister);
        } break;
        case '/get_operation': {
			passFileToHandler(req, res, parsedQuery.userId, parsedQuery.docId, docOperationsHandler.handleGet);
		} break;
        case '/push_operation': {
            passFileToHandler(req, res, parsedQuery.userId, parsedQuery.docId, docOperationsHandler.handlePush);
        } break;

        //ProjectManagement Handler
        case '/view': projectManager.view(req, res, parsedQuery.path);break;
        case '/add_node': projectManager.addNode(req, res, parsedQuery.path);break;

        //Authentication Handler
        case '/login': auth.logIn(req, res); break;
        case '/get_info': auth.getInfo(req, res);break;
        case '/signup': auth.signUp(req, res);break;
        case '/get_users': auth.getUsers(req, res);break;

        //Share Handler
        case '/share': share.share(req, res, parsedQuery.docId, parsedQuery.userId, parsedQuery.shareId);break;
        case '/get_shared_projects': share.getSharedProjects(req, res, parsedQuery.userId);break;

        //Notification Handler
        case '/get_notifications': notification.getNotifications(req, res, parsedQuery.userId); break;
        case '/clear_notifications': notification.clearAll(req, res, parsedQuery.userId); break;
    }
});

function passFileToHandler(req, res, userId, docId, handler) {
    getDocPath(docId, function(docPath) {
        handler(req, res, userId, docId, docPath);
    });
}

function getDocPath(docId, callback) {
     projectManager.file.find({fileID: docId}, function(err, data){
        data.forEach(function(entry){
            var resolvedDocPath = dirName + resolve(entry.path);
            resolvedDocPath += '\\' + entry.fileName;
            callback(resolvedDocPath);
        });
     });
}

function resolve(filePath) {
    var docPath = "";
    for(var i = 0; i < filePath.length; ++i) {
        if (filePath.charAt(i) == '.') {
            docPath += '\\';
        } else {
            docPath += filePath.charAt(i);
        }
    }
    return docPath;
}

module.exports = app;
