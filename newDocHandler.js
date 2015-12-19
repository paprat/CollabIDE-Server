

var DEBUG = true;
/**
 *
 *
 *
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
 * Returns the synStamp of current-state of server`
 *
 */
State.prototype.getSynStamp = function() {
	return this.transformedOperations.length; 
}


/**
 * Returns the current-state of server`
 *
 */
State.prototype.getState = function() {
	return this.docState.toString();
}

/**
 *
 *
 *
 */
function Session(docId) {
	this.state = new State(docId);
	this.userCursorPos = {};
	this.userSynTime = {};
};

/**
 * Adds the user to the session
 *
 * @param {String} userId - User's userId to be added to this session
 */
Session.prototype.addUser = function(userId) {
	userSynTime[userId] = this.session.getSynStamp();
};


/**
 * Removes the user from the session
 *
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
 * Handles push request of session with Doc#docId
 *
 * @param {String} userId - User's userId who edited the document
 */
Session.prototype.handlePush() = function(request, response, userId) {
	try {
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
				this.userCursorPos[userId] = transformedOp.position;
			} else {
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
		});
		response.end();
		
	} catch (err) {
		console.log(err.msg);
	}
}

/**
 *
 *
 *
 */
var SessionManager = function() {
	this.sessions = {};
}

/**
 * Creates a new session for Doc#docId, if none exists. Else uses an existing session. Adds the User#userId to the session. 
 * Returns the current state of the doc#docID.
 *
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
 * Checks for validity of GET request. Forwards request to session Doc#docId, if one exists.
 *
 * @param {String} userId - User's userId who has sent PUSH request.
 * @param {String} docId - Doc's docId which user wants to edit.
 */
 var SessionManager.prototype.handleGet (request, response, userId, docId) {
	try {
		if (this.session[docId] == undefined) {
			throw {
				msg: 'get request for non-existent doc#' + docId;
			};
		} else {
			var session = this.sessions[docId];
			if (session.state.userCursorPos[userId] == undefined) {
				throw {
					msg: 'get request for non-existent user#' + userId + ' on doc#' + docId;
				};
			} else {
				session.handleGet(request, response, userId);
			}
		}
	} catch(err) {
		console.log(err.msg)
	}
}


/**
 * Checks for validity of PUSH request. Forwards request to session Doc#docId, if one exists.
 *
 * @param {String} userId - User's userId who has sent PUSH request.
 * @param {String} docId - Doc's docId which user wants to edit.
 */
var SessionManager.prototype.handlePush (request, response, userId, docId) {
	try {
		if (this.session[docId] == undefined) {
			throw {
				msg: 'push request for non-existent doc#' + docId;
			};
		} else {
			var session = this.sessions[docId];
			if (session.state.userCursorPos[userId] == undefined) {
				throw {
					msg: 'p request for non-existent user#' + userId + ' on doc#' + docId;
				};
			} else {
				session.handlePush(request, response, userId);
			}
		}
	} catch(err) {
		console.log(err.msg)
	}
}