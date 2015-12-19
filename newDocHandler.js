var DEBUG = true;

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
	var fileContent = fixEOL(fs.readFileSync(fileName).toString());

	//initialize the docState
	this.docState = rope('');
	var constructDocState = function(content) {
		for (int i = 0; i < content.length; i++) {
			this.docState.insert(content);
		}
	}	
	constructDocState(fileContent);
	
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
 * @return {Number} Returns the current-state of server`
 */
State.prototype.getState = function() {
	return this.docState.toString();
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
 * @param {String} userId - User's userId to be added to this session
 */
Session.prototype.addUser = function(userId) {
	userSynTime[userId] = this.session.getSynStamp();
	userCursorPos[userId] = 0;
};


/**
 * Removes the user from the session
 * @param {String} userId - User's userId to be removed from this session
 */
Session.prototype.removeUser() = function(userId) {
	try {
		if (userId in userSynStamp && userId in userCusrorPos) {
			delete userSynStamp[userId];
			delete userCursorPos[userId];
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
	
	operationsRecvd.foreach( function(operation) {
		
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
			this.state.applyToRope(transformedOp);
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
		count++;
	}
	
	if (changesToSync.length > 0) {
		//send changes not yet synced
		this.synTimeStamps[userId] = currentTimeStamp;
		response.json(changesToSync);
		response.end();
	} else {
		//if no operations to be pushed, update the client about client position on doc
		var repositionOperations = [];
		for (var user in this.userCursorPos) {
			repositionOperations.push(
				{
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
 * SessionManager is a class whose objective is to create, maintain sessions. It also route user-requests to appropriate sessions    
 * @constructor
 */
 var SessionManager = function() {
	this.sessions = {};
}

/**
 * Creates a new session for Doc#docId, if none exists. Else uses an existing session. Adds the User#userId to the session. 
 * @return {String} current state of the doc#docID.
 * @param {String} userId - User's userId who has sent REGISTER request.
 * @param {String} docId - Doc's docId which user wants to edit.
 * @param {String} docPath - Path of the doc on server.
 */
var SessionManager.prototype.handleRegister (userId, docId, docPath) {
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
 * @param {String} userId - User's userId who has sent REGISTER request.
 * @param {String} docId - Doc's docId which user wants to edit.
 * @param {String} docPath - Path of the doc on server.
 */
var SessionManager.prototype.handleUnregister (userId, docId) {
	try {
		if (this.sessions[docId] != undefined) {
			var session = sessions[docId];
			if (session.userCursorPos[userId] != undefined) {
				session.removeUser(userId
				if (session.getUserCount() == 0) {
					session.cleanup();
					delete this.sessions[docId];
				}
			} else {
				throw {
					msg: 'unregister request from non-existent user#' + userId;
				};
			}
		} else {
			throw {
				msg: 'unregister request from non-existent doc#' + docId;
			};
		}
	} catch (err) {
		console.log(err.msg);
	}
}

/**
 * Checks for validity of requests. Forwards requests to session Doc#docId, if one exists.
 *
 * @param {Object} request  - User's request object
 * @param {Object} response - User's response object
 * @param {String} userId - User's userId who has sent PUSH request.
 * @param {String} docId - Doc's docId which user wants to edit.
 */
 var SessionManager.prototype.handleGet (request, response, userId, docId) {
	try {
		if (this.session[docId] == undefined) {
			throw {
				msg: 'request for non-existent doc#' + docId;
			};
		} else {
			var session = this.sessions[docId];
			if (session.state.userCursorPos[userId] == undefined) {
				throw {
					msg: 'request for non-existent user#' + userId + ' on doc#' + docId;
				};
			} else {
				//routing table
			}
		}
	} catch(err) {
		console.log(err.msg)
	}
}