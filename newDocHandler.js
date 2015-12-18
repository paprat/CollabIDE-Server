

function AbstractSession (docId, docPath) {
	this.docId = docId;
	this.docPath = docPath;
	
	//initialize necessary data-structures
	this.transformedOperations = [];
	this.userCursorPos = {};
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

AbstractSession.prototype.getSynStamp = function() {
	return transformedOperations.length; 
}


function Session(docId) {
	var session = new AbstractSession(docId);
	var userSynTime = {};
};

Session.prototype.addUser = function(userId) {
	userSynTime[userId] = this.session.getSynStamp();
	var serverState = this.session.docState.toString();
	return serverState;
};

Session.prototype.removeUser() = function(userId) {
	try {
		if (userId in userSynStamp) {
				delete userSynStamp[userId];
				//detroy if there are no active users in the session
				if (userSynStamp.length == 0) {
					//destroy the object here
				}
		} else {
			throw {
				msg: 'Cant remove user#' + userID + " . UserId doesn't exist."; 
			}; // exceptions in javascript
		}
	} catch (err) {
		console.log(err.msg);
	}
}



			
			