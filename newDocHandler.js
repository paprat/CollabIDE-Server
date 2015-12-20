var fs = require('fs');

/**
 * required modules
 * @require rope Rope Data-Structure for maintaining server state
 * @require OT Operational Transformation
 */
var rope = require('./rope');
var operationalTransform = require('./OT');

/**
 * State is a class which maintains info about current server-state of Doc#docId and edits made during the session.
 * @constructor
 * @param docId {String} docId of Doc, to be edited
 * @param docPath {String} Path of Doc#docId on server
 */
function State (docId, docPath) {
	this.docId = docId;
	this.docPath = docPath;
	
	//initialize necessary data-structures
	this.transformedOperations = [];
	this.localOperations = [];
	this.operationsNotSaved = [];

	//fixes \r\n issue in windows
	var fileContent = fixEOL(fs.readFileSync(docPath).toString());

	//initialize the docState
	this.docState = rope(fileContent);
	
	// write state to the file every 2 minute interval
	var THRESHOLD_TIME_MILLISECONDS = 12000; 
	//create an Interval-Object	
	this.interval = setInterval(
		function() {
			fs.writeFile(this.docPath, this.docState, function(err) {
				if(err) {console.log(err);}
			});
			this.operationsNotSaved = []; // clears operationsNotSaved
		}, THRESHOLD_TIME_MILLISECONDS
	);
}

/**
 * @return {Number} Returns the synStamp of current-state of server`
 */
State.prototype.getSynStamp = function() {
	return this.transformedOperations.length; 
}

/**
 * @return {String} Returns the current-state of server`
 */
State.prototype.getState = function() {
	return this.docState.toString();
}

/**
 * apply operations to server-state
 * @param operation {Object} edit-operation that needs to be performed.
 */
State.prototype.applyToRope = function(operation) {
	if (operation.type == 'INSERT') {
		if (operation.position < 0 || operation.position > docState[docId].length) {
			console.log('Invalid Insert Operation at ' + operation.position + ' ' + operation.charToInsert);
		} else {
			this.docState.insert(operation.position, operation.charToInsert);
		}
	} else if (operation.type == 'ERASE'){
		if (operation.position < 0 || operation.position >= docState[docId].length) {
			console.log('Invalid Erase Operation at' + operation.position);
		} else {
			this.docState.remove(operation.position, operation.position+1);
		}
	} else {
		console.log('Operation is undefined');
	}
}

/**
 * writes docState to file and stops the periodic write-callback from execution
 */
State.prototype.cleanup = function() {
	//performs all operation in buffer;
	this.operationsNotSaved.forEach(function(operation) {
			this.applyToRope(operation);
	});
	
	//write docState to the file Doc#docId
	fs.writeFile(this.docPath, this.docState, function(err) {
		if(err) {
			console.log(err);
		}
	});

	//stops the write-callback from execution
	clearInterval(this.interval);
}




/**
 * Session is a wrapper class which maintains the state, info about active users, their respective state-pulling time-stamps and cursor-positions  
 * @constructor
 * @param docId {String} docId of Doc, to be edited
 * @param docPath {String} Path of Doc#docId
 */
function Session(docId, docPath) {
	this.state = new State(docId, docPath);
	this.userCursorPos = {};
	this.userSynTime = {};
};

/**
 * Adds the user to the session
 * @param userId {String} User's userId to be added to this session
 */
Session.prototype.addUser = function(userId) {
	this.userSynTime[userId] = this.state.getSynStamp();
	this.userCursorPos[userId] = 0;
};


/**
 * Removes the user from the session
 * @param userId {String} User's userId to be removed from this session
 */
Session.prototype.removeUser = function(userId) {
	try {
		if (userId in this.userSynStamp && userId in this.userCusrorPos) {
			delete this.userSynStamp[userId];
			delete this.userCursorPos[userId];
		} else {
			//userId not found exception
			throw {
				msg: 'Cant remove user#' + userID + " . UserId doesn't exist."; 
			}; 
		}
	} catch (err) {
		console.log(err.msg);
	}
}

/**
 * Handles PUSH request of session with Doc#docId
 *
 * @param request {Object} User's request object
 * @param request.body {Array} Edit-operations pushed by the user.
 * @param response {Object} User's response object
 * @param userId {String} User's userId who edited the document
 */
Session.prototype.handlePush = function(request, response, userId) {
	//state of Doc#docId
	var state = this.state; 
	
	//bulk PUSH request received from User#userId
	var operationsRecvd = request.body;
	
	operationsRecvd.forEach( function(operation) {
		
		//transform the operation
		var transformed = operationalTransform.transform(operation, this.localOperations);
		
		//set the synTimeStamp of the transformed
		var synTimeStamp = state.getSynStamp(); 
		transformed.timeStamp = synTimeStamp;
		
		//perform the necessary editing 
		if (transformed.type == 'REPOSITION') {
			this.userCursorPos[userId] = transformed.position;
		} else {	
			//update transformedOperations to notify users of state-changes 
			this.state.transformedOperations.push(transformed);
			
			//clone and push the operation for transformation
			var cloned = Object.assign({}, transformed);
			this.state.localOperations.push(cloned);

			//update the server state of the doc
			this.state.applyToRope(transformed);
			this.state.operationsNotSaved.push(transformed);

			log('PUSH', operation);
			log('TRANSFORMED', transformed);
			log('STATE', this.state.getState());
		}
	});
	
	response.end();
}

/**
 * Handles GET request of session with Doc#docId
 *
 * @param request {Object} User's request object
 * @param response {Object} User's response object
 * @param userId {String} User's userId who wants to pull the state
 */
Session.prototype.handleGet = function(request, response, userId) {
	
	var getOperation = request.body;
	var prevTimeStamp = this.userSynTime[userId];
	var currentTimeStamp = 0; 
	
	//editing done by other users since the users last pulled state from server
	var changesToSync = [];
	var size = this.state.transformedOperations.length;
	
	const GET_THRESHHOLD = 10;
	for (var i = prevTimeStamp; i < size && changesToSync.length < GET_THRESHHOLD; i++) {
		var operation = this.state.transformedOperations[i];
		changesToSync.push(operation);
		currentTimeStamp = operation.timeStamp + 1;
	}
	
	if (changesToSync.length > 0) {
		//send changes not yet synced
		this.userSynTime[userId] = currentTimeStamp;
		response.json(changesToSync);
		response.end();
	} else {
		//if no operations to be pushed, update the client about client position on doc
		var repositionOperations = [];
		for (var user in this.userCursorPos) {
			repositionOperations.push(
				{
					type: 'REPOSITION',
					userId: user,
					synTimeStamp: this.state.getSynStamp(), 
					position: this.userCursorPos[user]
				}
			);
		}
		response.json(repositionOperations[docId]);
		response.end();
	}
}

/**
 * Clean-up the session from the server
 */
Session.prototype.cleanup = function() {
		this.state.cleanup();
}





/**
 * SessionManager is a class whose objective is to create, maintain sessions. It also route user-requests to appropriate sessions    
 * @constructor
 */
function SessionManager() {
	this.sessions = {};
}

/**
 * Creates a new session for Doc#docId, if none exists. Else uses an existing session. Adds the User#userId to the session. 
 * @return {String} current state of the doc#docID.
 * @param userId {String} User's userId who has sent REGISTER request.
 * @param docId {String} Doc's docId which user wants to edit.
 * @param docPath {String} Path of the doc on server.
 */
SessionManager.prototype.handleRegister = function(userId, docId, docPath) {
	if (this.sessions[docId] == undefined) {
		this.sessions[docId] = new Session(docId, docPath);
	} 
	var session = this.sessions[docId];
	session.addUser(userId);
	var state = session.state.getState();
	return state;
}

/**
 * Removes the User#userId to the session. Destroys it if no user is currently editing the doc.
 *
 * @param userId {String} User's userId who has sent REGISTER request.
 * @param docId {String} Doc's docId which user wants to edit.
 * @param docPath {String} Path of the doc on server.
 */
SessionManager.prototype.handleUnregister = function(userId, docId) {
	try {
		if (this.sessions[docId] != undefined) {
			var session = sessions[docId];
			if (session.userCursorPos[userId] != undefined) {
				session.removeUser(userId)
				if (session.getUserCount() == 0) {
					session.cleanup();
					delete this.sessions[docId];
				}
			} else {
				throw {
					msg: 'un-register request from non-existent user#' + userId
				}
			}
		} else {
			throw {
				msg: 'un-register request from non-existent doc#' + docId
			};
		}
	} catch (err) {
		console.log(err.msg);
	}
}

/**
 * Checks for validity of requests. Routes requests to session Doc#docId, if one exists.
 *
 * @param request {Object} User's request object
 * @param response {Object} User's response object
 * @param userId {String} User's userId who has sent PUSH request.
 * @param docId {String} Doc's docId which user wants to edit.
 */
 SessionManager.prototype.handleGet = function(request, response, userId, docId, method) {
	try {
		if (this.sessions[docId] == undefined) {
			throw {
				msg: 'request for non-existent doc#' + docId
			};
		} else {
			var session = this.sessions[docId];
			if (session.state.userCursorPos[userId] == undefined) {
				throw {
					msg: 'request for non-existent user#' + userId + ' on doc#' + docId
				};
			} else {
				//routing
				switch (method) {
					case 'GET': session.handleGet(request, response, userId);break;
					case 'PUSH': session.handlePush(request, response, userId);break;
					default: throw {
								msg: 'Invalid Method' 
							 }
				}
			}
		}
	} catch(err) {
		console.log(err.msg)
	}
}


/**
 * Utility Functions
 *
 */
 
 /**
 * Perform logging, can be redirected if needed. 
 * @param title {String} Title of logged message.
 * @param desc {String} Description of logged message.
 */
 var DEBUG = true;
 function log(title, desc) {
	 if (DEBUG) {
		console.log(title + ': ' + desc);
	 }
 }
 
 /**
 * fix 'End of Line' issues. 
 * @param content {String} content whose EOL need to be fixed.
 * @return {String} content with '\r\n' replaced by '\n'.
 */
 function fixEOL(content) {
	var newContent = '';
	//replace method isn't working so doing this manually
	for (var i = 0; i < content.length; i++) {
		if ((i+1 < content.length) && (content[i]=='\r' && content[i+1]=='\n')) {
			newContent += '\n';
			i++;
		} else {
			newContent += content[i];
		}
	}
	return newContent;
}

//Lets export
if (typeof this === 'object') this.SessionManager = SessionManager;