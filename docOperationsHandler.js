var rope = require('./rope');
var fs = require('fs');
var util = require('util');

var activeClients = {};
var openFileTable = {};

var lastSync = {};
var states = {};

var localOperations = {};
var transformedOperations = {};
var repositionOperations = {};

var intervalObj = {};

var THRESHOLD_TIME_MILLISECONDS = 12000;
var operationsNotSaved = {};

//Redirects the output stream to file debug.log
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;
console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};


//Modules exported
module.exports = {
	handleRegister: function (request, response, userId, docId, docPath) {
		activeClients[userId]++;
		if (docId in openFileTable) {
			
			//Doc Already exists in the openFileTable
			openFileTable[docId]++;
			var content = states[docId].toString();
			var length = transformedOperations[docId].length;
			
			lastSync[docId][userId] = length;
			
			//Send the contents of the file to the client
			response.end(states[docId].toString());
		} else {
			
			//New doc to be inserted in openFileTable
			openFileTable[docId] = 1;
			
			//Initialises the data structures
			transformedOperations[docId] = [];
			repositionOperations[docId] = [];
			localOperations[docId] = [];
			operationsNotSaved[docId] = [];
			
			//Set lastSync of the newly created doc to 0 i.e. no operations upto now
			lastSync[docId] = {};
			lastSync[docId][userId] = 0;
			
			var fileName = docPath;
			var contents = fs.readFileSync(fileName).toString();
			
			//Write file after every two THRESHOLD_TIME_MILLISECONDS
			intervalObj[docId] = setInterval(writeCallback, THRESHOLD_TIME_MILLISECONDS, docPath, docId);
			
			//Initialises the Rope with contents of the file 
			states[docId] = rope('');
			var count = 0;
			for (var i = 0; i < contents.length; i++) {
				//Take care of /r/n issue
				if (i < contents.length-1 && contents[i] == '\r' && contents[i+1] == '\n') {
					states[docId].insert(i-count, '\n');
					count++;
					i++;
				} else {
					states[docId].insert(i-count, contents[i]);
				}
			}
			
			//Send the contents of the file to the client
			response.end(states[docId].toString());
		}
		//console.log("-------------------------");
		//console.log(states[docId].toString());
	}
	,
	handleUnregister: function (request, response, userId, docId, docPath) {
		if (userId in activeClients) {
			if (docId in openFileTable) {
				
				//reduce no of sessions opened by a client
				activeClients[userId]--;
				//remove client is session count drops to zero
				if (activeClients[userId] == 0) {
					delete activeClients[userId];
				}
				
				//reduce no of clients on a doc
				openFileTable[docId]--;
				//remove doc from openFileTable if clientCount drops to zero
				if (openFileTable[docId] == 0) {
					writeToFile(docPath, docId);
					//stop writeCallback
					clearInterval(intervalObj[docId]);
					
					//Destroy all datastructures
					delete states[docId];
					delete transformedOperations[docId];
					delete repositionOperations[docId];
					delete localOperations[docId];
					delete operationsNotSaved[docId];
					delete lastSync[docId];
					
					delete openFileTable[docId];
				}
			} else {
				console.log('Illegal Unregister Request');
			}
		} else {
			console.log('Illegal Unregister Request');
		}
	}
	,
	handleGet: function (request, response, userId, docId, docPath) {
		if (userId in activeClients) { 
			var prevTimeStamp = lastSync[docId][userId];
			var currentTimeStamp = transformedOperations[docId].length;
			
			/*
				//console.log('GET Received');
				//console.log(lastSync[docId][userId]);
				//console.log(sessionBuffers[docId].length);
			*/
					
			//Operations since the last time the client synced with the server
			var operationsNotSynced = [];
			var size = transformedOperations[docId].length;
			for (var i = 0; i < size; i++) {
				var operation =  transformedOperations[docId][i]; 
				if (operation.timeStamp >= prevTimeStamp) {
					operationsNotSynced.push(operation);
				}
			}
			
			//Send operations not yet synced with the client
			if (operationsNotSynced.length > 0) {
				var res = {};
				res.last_sync = currentTimeStamp;
				res.operations = operationsNotSynced;
				lastSync[docId][userId] = currentTimeStamp;
				response.end(JSON.stringify(res));
			} else {
				//If no operations to be pushed, tell the client about the cursor positions of other clients on the doc
				var res = {};
				res.last_sync = currentTimeStamp;
				res.operations = repositionOperations[docId];
				response.end(JSON.stringify(res));
			}
			
		} else {
			module.exports.handleRegister(request, response, userId, docId, docPath);
			response.end();
		}
	}
	,
	handlePush: function (request, response, userId, docId, docPath) {
		if (userId in activeClients) {

			var operationReceived = request.body;
			//Bulk push request received from the server
			//console.log(operationReceived);
			for (var k = 0; k < operationReceived.length; k++) {
				var operation = operationReceived[k];
				var currentTimeStamp = transformedOperations[docId].length;
				operation.timeStamp = currentTimeStamp;

				var transformedOp = transform(operation, localOperations[docId]);

				if (transformedOp.type == 'REPOSITION') {
					var flag = false;
					for (var i = 0; i < repositionOperations[docId].length; i++) {
						var userId = repositionOperations[docId][i].userId;
						//update cursor position
						if (userId == transformedOp.userId) {
							flag = true;
							repositionOperations[docId][i] = transformedOp;
						}
					}
					//If the users reposition operation reached server for the first time
					if (!flag) {
						repositionOperations[docId].push(transformedOp);
					}
				} else {
					//Non-idempotent operations
					/*
						console.log('PUSH Received');
						console.log(userId);
						console.log(operation);
					*/
					
					//Apply operational transform on the state received
					transformedOperations[docId].push(transformedOp);
					
					var obj = JSON.parse(JSON.stringify(transformedOp));
					localOperations[docId].push(obj);
					
					//Update the server state of the doc
					applyToRope(docId, transformedOp);
					operationsNotSaved[docId].push(transformedOp);
					
					//console.log(states[docId].toString());
					
					/*
						console.log('Transformed Received');
						console.log(userId);
						console.log(transformedOp);
					*/
				}
			}
			response.end();
		} else {
			module.exports.handleRegister(request, response, userId, docId, docPath);
			response.end();
		}
	}
};

function applyToRope(docId, operation) {
	if (operation.type == 'INSERT') {
		if (operation.position < 0 || operation.position > states[docId].length) {	
		} else {
			states[docId].insert(operation.position, operation.charToInsert);
		}
	} else if (operation.type == 'ERASE'){
		if (operation.position < 0 || operation.position >= states[docId].length) {
		} else {
			states[docId].remove(operation.position, operation.position+1);
		}
	} else {
		console.log('Operation is undefined');
	}
}

//Operational Transforms
function transformOperation(opr1, opr2, flag) {
	var transformed1 = JSON.parse(JSON.stringify(opr2));
	
	if (opr1.type == 'ERASE' && opr2.type == 'ERASE') {
		if (flag) {
			if (opr1.position < opr2.position) {
				transformed1.position = opr2.position-1;
			} 
		} else {
			if (opr1.position <= opr2.position) {
				transformed1.position = opr2.position-1;
			}
		}
	} else if (opr1.type == 'INSERT' && opr2.type == 'INSERT') {
		if (flag) {
			if (opr1.position < opr2.position) {
				transformed1.position = opr2.position+1;
			} 
		} else {
			if (opr1.position <= opr2.position) {
				transformed1.position = opr2.position+1;
			}
		}
	} else if (opr1.type == 'INSERT' && opr2.type == 'ERASE') {
		if (flag) {
			if (opr1.position < opr2.position) {
				transformed1.position = opr2.position+1;
			} 
		} else {
			if (opr1.position <= opr2.position) {
				transformed1.position = opr2.position+1;
			}
		}
	} else if (opr1.type == 'ERASE' && opr2.type == 'INSERT') {
		if (flag) {
			if (opr1.position < opr2.position) {
				transformed1.position = opr2.position-1;
			} 
		} else {
			if (opr1.position <= opr2.position) {
				transformed1.position = opr2.position-1;
			}
		}
	} else if (opr1.type == 'ERASE' && opr2.type == 'REPOSITION') {
		if (flag) {
			if (opr1.position < opr2.position) {
				transformed1.position = opr2.position-1;
			} 
		} else {
			if (opr1.position <= opr2.position) {
				transformed1.position = opr2.position-1;
			}
		}
	} else if (opr1.type == 'INSERT' && opr2.type == 'REPOSITION') {
		if (flag) {
			if (opr1.position < opr2.position) {
				transformed1.position = opr2.position+1;
			} 
		} else {
			if (opr1.position <= opr2.position) {
				transformed1.position = opr2.position+1;
			}
		}
	} 
	
	return transformed1;
}

//Compound Operational Transform
function transform(operation, Buffer) {
	for (var i = operation.lastSyncStamp; i < Buffer.length; i++) {
		var op = Buffer[i];
		if (op.userId != operation.userId) {
			var transformed1 = transformOperation(op, operation, true);
			var transformed2 = transformOperation(operation, op, false);
			operation = transformed1;
			Buffer[i] = transformed2;
		}
	}
	return operation;
}

//Take backup of file after every THRESHOLD_TIME_MILLISECONDS time.
function writeCallback(docPath, docId) {
	writeToFile(docPath, docId);
	operationsNotSaved[docId] = []; // clear OperationsNotSaved
}

function writeToFile(docPath, docId) {
	fs.writeFile(docPath, states[docId].toString(), function(err) {
		if(err) {
			return console.log(err);
		}
	});
};