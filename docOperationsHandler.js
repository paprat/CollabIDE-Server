var fs = require('fs');
var util = require('util');

//required modules
var rope = require('./rope');
var operationalTransform = require('./OT');

/*DEBUG flag 
	true : prints newly pushed operations, transformed operations and current state
	false: avoid any printing on console and debug.log
*/
var DEBUG = false;

/*
activeClients: no of active sessions by each client
openFileTable: no of clients that are editing the current doc
*/
var activeClients = {};
var openFileTable = {};

/*
synTimeStamps: timeStamps of last synchronization for each client-doc pair
here 'synchronization' refers to process of pulling the doc state by the client from the server
*/
var synTimeStamps = {};

/*
docState: rope data-structure to maintain the state of the each active doc at server-end
*/
var docState = {};

/*
localOperations: operations required to transform the newly received operations from the client
transformedOperations: transformed operations that are applied the the server state and broadcasted to each client.
*/
var localOperations = {};
var transformedOperations = {};
var repositionOperations = {};

/*
THRESHOLD_TIME_MILLISECONDS: time in millis after which the server writes the current state to the file on its end
intervalObj : required for cancelling the async event that writes the current state to the file on its end one all the sessions using this doc are closed.
operationsNotSaved : operations performed to the docState since last write to the file
*/
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


//exported modules
module.exports = {
	handleRegister: function (request, response, userId, docId, docPath) {
		if (userId in activeClients) {
			activeClients[userId]++;
		} else {
			activeClients[userId] = 1;
		}

		if (docId in openFileTable) {
			
			//Doc Already exists in the openFileTable
			openFileTable[docId]++;
			var content = docState[docId].toString();
			var length = transformedOperations[docId].length;
			
			synTimeStamps[docId][userId] = length;
			
			//Send the contents of the file to the client
			response.end(docState[docId].toString());
		} else {
			
			//New doc to be inserted in openFileTable
			openFileTable[docId] = 1;
			
			//Initialises the data structures
			transformedOperations[docId] = [];
			repositionOperations[docId] = [];
			localOperations[docId] = [];
			operationsNotSaved[docId] = [];
			
			//set synTimeStamps of the newly created doc to 0 i.e. no operations upto now
			synTimeStamps[docId] = {};
			synTimeStamps[docId][userId] = 0;
			
			//reads the content of the file synchronously
			var fileName = docPath;
			var contents = fs.readFileSync(fileName).toString();
			
			//write file after every two THRESHOLD_TIME_MILLISECONDS
			intervalObj[docId] = setInterval(writeCallback, THRESHOLD_TIME_MILLISECONDS, docPath, docId);
			
			//initialises the Rope with contents of the file
			docState[docId] = rope('');
			var count = 0;
			
			//resolves /r/n issue
			for (var i = 0; i < contents.length; i++) {
				if (i < contents.length-1 && contents[i] == '\r' && contents[i+1] == '\n') {
					docState[docId].insert(i-count, '\n');
					count++;
					i++;
				} else {
					docState[docId].insert(i-count, contents[i]);
				}
			}
			
			//send the contents of the file to the client
			response.end(docState[docId].toString());
		}
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
					
					//destroy all data-structures
					delete docState[docId];
					delete transformedOperations[docId];
					delete repositionOperations[docId];
					delete localOperations[docId];
					delete operationsNotSaved[docId];
					delete synTimeStamps[docId];
					
					delete openFileTable[docId];
				}
			} else {
				console.log('Illegal Unregister Request');
			}
		} else {
			console.log('Illegal Unregister Request');
		}
		response.end();
	}
	,
	handleGet: function (request, response, userId, docId, docPath) {
		if (userId in activeClients && docId in openFileTable) {
			var prevTimeStamp = synTimeStamps[docId][userId];
			var currentTimeStamp = 0;
			
			if (DEBUG) {
				console.log('GET Received');
				console.log(synTimeStamps[docId][userId]);
				console.log(sessionBuffers[docId].length);
			}
			
			//operations since the client pulled the state from  the server
			var operationsNotSynced = [];
			var size = transformedOperations[docId].length;
			var count = 0;
			for (var i = prevTimeStamp; i < size && count < 10; i++) {
				var operation = transformedOperations[docId][i];
				operationsNotSynced.push(operation);
				currentTimeStamp = operation.timeStamp + 1;
				count++;
			}
			
			//send operations not yet synced with the client
			if (operationsNotSynced.length > 0) {
				synTimeStamps[docId][userId] = currentTimeStamp;
				response.end(JSON.stringify(operationsNotSynced));
			} else {
				//If no operations to be pushed, tell the client about the cursor positions of other clients on the doc
				response.end(JSON.stringify(repositionOperations[docId]));
			}
			
		} else {
			module.exports.handleRegister(request, response, userId, docId, docPath);
			response.end();
		}
	}
	,
	handlePush: function (request, response, userId, docId, docPath) {
		if (userId in activeClients && docId in openFileTable) {

			var operationReceived = request.body;
			//Bulk push request received from the server
			for (var k = 0; k < operationReceived.length; k++) {
				var operation = operationReceived[k];
				var currentTimeStamp = transformedOperations[docId].length;
				operation.timeStamp = currentTimeStamp;

				//Transform the operation in accordance to the operations received from other clients
				var transformedOp = operationalTransform.transform(operation, localOperations[docId]);

				if (transformedOp.type == 'REPOSITION') {
					var flag = false;
					//checks whether the repositionOperation contains the client
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

					//logs the received operation
					if (DEBUG) {
						console.log('PUSH Received : ');
						console.log(userId);
						console.log(operation);
					}

					transformedOperations[docId].push(transformedOp);

					var obj = JSON.parse(JSON.stringify(transformedOp));
					localOperations[docId].push(obj);

					//Update the server state of the doc
					applyToRope(docId, transformedOp);
					operationsNotSaved[docId].push(transformedOp);

					//logs the transformed operation
					if (DEBUG) {
						console.log('TRANSFORMED Received : ');
						console.log(userId);
						console.log(transformedOp);
					}
					//Print server state
					if (DEBUG) {
						console.log('STATE: ');
						console.log(docState[docId].toString());
					}
				}
			}
			response.end();
		} else {
			module.exports.handleRegister(request, response, userId, docId, docPath);
			response.end();
		}
	}
};

//apply operations to server-state
function applyToRope(docId, operation) {
	if (operation.type == 'INSERT') {
		if (operation.position < 0 || operation.position > docState[docId].length) {
			console.log('Invalid Insert Operation');
		} else {
			docState[docId].insert(operation.position, operation.charToInsert);
		}
	} else if (operation.type == 'ERASE'){
		if (operation.position < 0 || operation.position >= docState[docId].length) {
			console.log('Invalid Erase Operation');
		} else {
			docState[docId].remove(operation.position, operation.position+1);
		}
	} else {
		console.log('Operation is undefined');
	}
}

//Take backup of file after every THRESHOLD_TIME_MILLISECONDS time.
function writeCallback(docPath, docId) {
	writeToFile(docPath, docId);
	operationsNotSaved[docId] = []; // clear OperationsNotSaved
}

function writeToFile(docPath, docId) {
	fs.writeFile(docPath, docState[docId].toString(), function(err) {
		if(err) {
			return console.log(err);
		}
	});
};