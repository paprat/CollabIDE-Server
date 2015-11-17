//app.post('/new', function (req, res) {
//    new file({
//        fileID: req.body.name,
//        fileName: req.body.filename,
//        createTime: new Date()
//    }).save(function (err, newUser) {
//            if (err) {
//                console.log('Not able to insert');
//            }
//            else {
//                console.log("Successfully inserted user: " + req.body.name);
//                var dat = file.find(function(err, docs){
//                    res.json(docs);
//                });
//            }
//        });
//});

//find specific example --> name: /^Pratham/
//app.post('/show', function (req, res) {
//    var dat = user.find({}, function (err, docs) {
//        res.json(docs);
//    });
//});

function register(req, res, parsedQuery){
    console.log(parsedQuery);
    var collectionName = parsedQuery.docId + 'Operations';
    console.log(collectionName);
    var newFileOpCollection = mongoose.model(collectionName, fileOperationSchema);
}

function pushNewOperation(req, res, parsedQuery){
    var collectionName = parsedQuery.docId + 'Operations';
    var newFileOpCollection = mongoose.model(collectionName, fileOperationSchema);
    var lastEntry = newFileOpCollection.find({}, function(err, doc){});
    var c = 0;
    console.log(c);
    new newFileOpCollection({
        userID: req.body.userIdentifier,
        operationID: req.body.operationId,
        operationType: req.body.type,
        operationValue: req.body.charToInsert,
        operationPosition: req.body.position,
        operationCount: 1
    }).save(function (err, newUser) {
        if (err) {
            console.log('Not able to insert');
        }
        else {
            console.log("Successfully inserted user: " + req.body.type);
            //var dat = file.find(function (err, docs) {
            //    //res.json(docs);
            //});
        }
    });

}

function insertCollection(collection, callback) {
    var inserted = 0;
    for(var i = 0; i < collection.length; i++) {
        db.insert(collection[i], function(err) {
            if (err) {
                callback(err);
                return;
            }
            if (++inserted == collection.length) {
                callback();
            }
        });
    }
}

function callback() {
    console.log('done');
}