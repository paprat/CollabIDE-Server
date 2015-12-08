var rope = require('./rope');
var fs = require('fs');

var THRESHOLD = 1;

var activeClients = {};
var openFileTable = {};

var localOperations = {};
var transformedOperations = {};
var operationsNotSaved = {};

var repositionOperations = {};

var lastSync = {};
var states = {};

var fs = require('fs');
var util = require('util');
var log_file = fs.createWriteStream(__dirname + '/debug.log', {flags : 'w'});
var log_stdout = process.stdout;

console.log = function(d) { //
  log_file.write(util.format(d) + '\n');
  log_stdout.write(util.format(d) + '\n');
};

module.exports = {
	handleRegister: function (request, response, userId, docId, docPath) {
		activeClients[userId]++;
		if (docId in openFileTable) {
			//console.log('Doc already exists.');
			openFileTable[docId]++;
			var content = states[docId].toString();
			for (operation in operationsNotSaved [docId]) {
				applyToRope(states[docId], operation);
			}

			var fileName = docPath;
            //console.log(fileName);
			
			writeToFile(fileName, docId);
			operationsNotSaved[docId] = [];
			
			var length = transformedOperations[docId].length;
			lastSync[docId][userId] = length;
			response.end(states[docId].toString());
		} else {
			//console.log('New doc created.');
			openFileTable[docId] = 1;
			
			transformedOperations[docId] = [];
			repositionOperations[docId] = [];
			localOperations[docId] = [];
			operationsNotSaved[docId] = [];
			
			lastSync[docId] = {};
			lastSync[docId][userId] = 0;
			
			var fileName = docPath;
			
			var contents = fs.readFileSync(fileName).toString();
			
			states[docId] = rope('');
			var count = 0;
			for (var i = 0; i < contents.length; i++) {
				if ( i < contents.length-1 && contents[i] == '\r' && contents[i+1] == '\n') {
					states[docId].insert(i-count, '\n');
					count++;
					i++;
				} else {
					states[docId].insert(i-count, contents[i]);
				}
			}
			
			response.end(states[docId].toString());
		}
		//console.log("-------------------------");
		//console.log(states[docId].toString());
	}
	,
	handleGet: function (request, response, userId, docId) {
		if (userId in activeClients) { 
			var prevTimeStamp = lastSync[docId][userId];
			var currentTimeStamp = transformedOperations[docId].length;
			
			/*
				//console.log('GET Received');
				//console.log(lastSync[docId][userId]);
				//console.log(sessionBuffers[docId].length);
			*/
					
			var operationsNotSynced = [];
			
			var size = transformedOperations[docId].length;
			for (var i = 0; i < size; i++) {
				var operation =  transformedOperations[docId][i]; 
				if (operation.timeStamp >= prevTimeStamp) {
					operationsNotSynced.push(operation);
				}
			}
			
			
			if (operationsNotSynced.length > 0) {
				var res = {};
				res.last_sync = currentTimeStamp;
				res.operations = operationsNotSynced;
				lastSync[docId][userId] = currentTimeStamp;
				response.end(JSON.stringify(res));
			} else {
				var res = {};
				res.last_sync = currentTimeStamp;
				res.operations = repositionOperations[docId];
				response.end(JSON.stringify(res));
			}
			
		} else {
			module.exports.handleRegister(request, response, userId, docId);
			response.end();
		}
	}
	,
	handlePush: function (request, response, userId, docId, docPath) {
		if (userId in activeClients) {
        		var currentTimeStamp = transformedOperations[docId].length;
				
				var operation = request.body;
        		operation.timeStamp = currentTimeStamp;
				

				/*	console.log('PUSH Received');
					console.log(userId);
					console.log(operation);
                */
				
				var transformedOp = transform(operation, localOperations[docId]);
				
				if (transformedOp.type == 'REPOSITION') {
					var flag = false;
					for (var i = 0; i < repositionOperations[docId].length; i++) {
						var userId = repositionOperations[docId][i].userId; 
						if (userId == transformedOp.userId) {
							flag = true;
							repositionOperations[docId][i] = transformedOp;
						}
					}
					if (!flag) {
						repositionOperations[docId].push(transformedOp);
					}
				} else {
					transformedOperations[docId].push(transformedOp);			
					var obj = JSON.parse(JSON.stringify(transformedOp));
					localOperations[docId].push(obj);
					applyToRope(docId, transformedOp);
					operationsNotSaved[docId].push(transformedOp);
                    console.log(states[docId].toString());
                }
				
                /*
					console.log('Transformed Received');
					console.log(transformedOp);
				*/

				if (transformedOperations[docId].length % THRESHOLD == 0) {
					var fileName = docPath;
                    //console.log(fileName);
					writeToFile(fileName, docId);
					operationsNotSaved[docId] = [];
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

function writeToFile(fileName, docId) {
	fs.writeFile(fileName, states[docId].toString(), function(err) {
		if(err) {
			return console.log(err);
		}
	});
};