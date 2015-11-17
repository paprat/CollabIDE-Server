var express = require('express');
var path = require('path');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var mongoose = require('mongoose');
var queryString = require('querystring');
var url = require('url');

//var routes = require('./routes/index');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({extended: false}));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

var routes = require('./routes/index');
var auth = require('./auth');
var projectManager = require('./projectManager');
var notification = require('./notification');
var share = require('./shareProject');
var docOperationsHandler = require('./docOperationsHandler');
//app.use('/', routes);

mongoose.connect('mongodb://localhost/CollabEdit');

var conn = mongoose.connection;

//var fileOperationSchema = new Schema({
//    userID: String,
//    operationID: String,
//    operationType: String,
//    operationValue: String,
//    operationPosition: Number,
//    operationCount: Number
//});

var dirName = __dirname + "\\User Projects";

app.use("/", function(req, res) {
    var parsedUrl = url.parse(req.url);
    var pathName = parsedUrl.pathname;
    var query = parsedUrl.query;
    var parsedQuery = queryString.parse(query);
    //console.log(req.url);
    //console.log(req.body);
    //console.log(pathName);
    switch(pathName) {
        case '/register': {
            projectManager.file.find({fileID: parsedQuery.docId}, function(err, dattt){
                dattt.forEach(function(dat){
                    var docPath = dirName;
                    for(var i = 0; i < dat.path.length; ++i){
                        if(dat.path.charAt(i) == '.')
                            docPath += '\\';
                        else
                            docPath += dat.path.charAt(i);
                    }
                    docPath += '\\' + dat.fileName;
                    //console.log(docPath);
                    docOperationsHandler.handleRegister(req, res, parsedQuery.userId, parsedQuery.docId, docPath);
                });

            });

        }
            break;
        case '/get_operation': docOperationsHandler.handleGet(req, res, parsedQuery.userId, parsedQuery.docId);break;
        case '/push_operation': projectManager.file.find({fileID: parsedQuery.docId}, function(err, dattt){
            dattt.forEach(function(dat){
                var docPath = dirName;
                for(var i = 0; i < dat.path.length; ++i){
                    if(dat.path.charAt(i) == '.')
                        docPath += '\\';
                    else
                        docPath += dat.path.charAt(i);
                }
                docPath += '\\' + dat.fileName;
                //console.log(docPath);
                docOperationsHandler.handlePush(req, res, parsedQuery.userId, parsedQuery.docId, docPath);
            });
        });
            break;
        case '/view': projectManager.view(req, res, parsedQuery.path);break;
        case '/add_node': projectManager.addNode(req, res, parsedQuery.path);break;

        case '/login': {
            //console.log(req.url);
            auth.logIn(req, res);
        }break;
        case '/get_info': auth.getInfo(req, res);break;
        case '/signup': auth.signUp(req, res);break;

        case '/get_users': auth.getUsers(req, res);break;
        case '/share': share.share(req, res, parsedQuery.docId, parsedQuery.userId, parsedQuery.shareId);break;
        case '/get_shared_projects': share.getSharedProjects(req, res, parsedQuery.userId);break;

        case '/get_notifications': notification.getNotifications(req, res, parsedQuery.userId);break;
        case '/clear_notifications': {
            //console.log(req.url);
            notification.clearAll(req, res, parsedQuery.userId);

        }break;
    }
});

function createFile(req, res){
    new file({
        fileID: req.fileId,
        fileName: req.fileName,
        createTime: new Date()
    }).save(function(err, newFile){
           new userFile({
                fileID: req.fileId,
                userID: req.userId
           }).save(function(err, newUserFile){
                   res.end();
               })
        });
}

function addFileToProject(req, res){
    new projectFile({
        projectID: req.projectId,
        fileID: req.fileId
    }).save(function(err, newData){
            if(err){
                res.write("error while inserting to database", function(er){ res.end() });
            }
        });
}

function newProject(req, res){
    new project({
        projectID: req.projectId,
        projectName: req.projectName,
        creatTime: new Date()
    }).save(function(err, newProject){
            if(err){
                //console.log('error while inserting');
            }
            else{
                newUserProject(req, res);
            }
        });
}

function newUserProject(req, res){
    var newProjectId = newProject(req, res);
    new userProject({
        userID: req.userId,
        projectID: req.projectId
    }).save(function(err, newT){
            if(err){
                //console.log('error while inserting');
            }
            else
                res.end();
        })
}

module.exports = app;
