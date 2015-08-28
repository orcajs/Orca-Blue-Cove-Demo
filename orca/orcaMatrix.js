/*jslint browser: true, unparam: true, sloppy: true */
/*global SessionError, CallError */

(function () {
    var orcaReflector, previousCall = null, SessionStatus, CallStatus;

    SessionStatus = {};
    SessionStatus.CONNECTED = 'connected';
    SessionStatus.CONNECTING = 'connecting';
    SessionStatus.DISCONNECTED = 'disconnected';
    SessionStatus.INCOMINGCALL = 'incomingCall';
    SessionStatus.ERROR = 'error';

    CallStatus = {};
    CallStatus.CONNECTING = 'connecting';
    CallStatus.HOLD = 'hold';
    CallStatus.UNHOLD = 'unhold';
    CallStatus.REJECTED = 'rejected';
    CallStatus.ERROR = 'error'
    CallStatus.CONNECTED = 'connected';
    CallStatus.DISCONNECTED = 'disconnected';
    CallStatus.ADDSTREAM = 'stream:add';
	CallStatus.SDP = 'stream:sdp';
	CallStatus.ICE = 'stream:ice';
	
	Protocol = {};
	Protocol.REGISTER = 'REGISTER';
	Protocol.REGISTER_OK = 'REGISTER/200/0K';
	Protocol.REGISTER_ERROR = 'REGISTER/4';
	Protocol.CALL = 'INVITE';
	Protocol.CALL_OK = 'INVITE/200/OK';
	Protocol.CALL_CANDIDATE = 'iceCandidate';
	Protocol.CALL_REJECTED = 'INVITE/486/Busy Here';
	Protocol.CALL_ERROR = 'INVITE/4';
	Protocol.CALL_TERMINATE = 'BYE';

    function Call(to, mediaTypes, session, callback, isIncoming) {
	this.to = to;
	this.mediaTypes = mediaTypes;
	this.session = session;
	this.callback = callback;
	this.isIncoming = isIncoming;
	this.parallel = null;
	this.remoteStreamsList = [];
	this.localStreamsList = [];		
		this.peerConnection = null;
		this.messageQueue = [];
		var signalingReady = false;
		this.remoteSDP = null;

	if (isIncoming) {
	    this.status = CallStatus.CONNECTING;
	    this.inStatus = CallStatus.CONNECTING;
	} else {
	    this.status = undefined; // pre connect()
	    this.inStatus = undefined;
	}
	if (previousCall) {
	    previousCall = this;
	}

	this.triggerEvent = function (status, data) {
	    var eventInfo = {}, i;
	    switch (status) {
				case CallStatus.ADDSTREAM:
					eventInfo.stream = data;
					this.remoteStreamsList.push(data);
					break;
				case CallStatus.CONNECTED:
				case CallStatus.CONNECTING:		
					this.status = status;
					this.inStatus = status;
					break;
				case CallStatus.DISCONNECTED:
				case CallStatus.REJECTED:
				case CallStatus.ERROR:
					this.status = status;
					this.inStatus = status;                
					if (data) eventInfo.error = data;
					this.session.removeCall(this);	
					break;
				case CallStatus.SDP:					
					if (!this.isIncoming) {
						this.peerConnection.setRemoteDescription(new RTCSessionDescription(data));	
						signalingReady = true;			
						this.callback.triggerEvent(CallStatus.CONNECTED);
					} else {
						this.remoteSDP = data;
					}
					break;
				case CallStatus.ICE:
					if (data) {
						if (signalingReady)
							this.peerConnection.addIceCandidate(new RTCIceCandidate(data));
						else this.messageQueue.push(data);						
					}
				break;
		
	    }
	    this.emitter.emit(status, eventInfo, this.callback);
	};

	this.remoteIdentities = function () {
	    var result = [{id: this.to}];
	    return result;
	};

	this.addStream = function (stream) {
	    this.localStreamsList.push(stream);
	};

	this.connect = function () {
	    
	    if (this.isIncoming) {                         
		this.acceptWebRTCCall();				       
		this.callback.triggerEvent(CallStatus.CONNECTED);
	    } else {

				this.session.call = this.callback;
				this.sendWebRTCCall();
				this.callback.triggerEvent(CallStatus.CONNECTING);				               
	    }
	};
		
		this.createWebRTCCall = function () {
		
			this.peerConnection = new RTCPeerConnection(this.session.sessionConfig.hostilityhelper);

			var self = this;			
			
			this.peerConnection.onaddstream = function(event) {
				var s = self.callback.addStream(event.stream);
				self.callback.triggerEvent(CallStatus.ADDSTREAM, s);
			};				

			this.peerConnection.onicecandidate = function(event) {				
				self.session.matrixConn.send(Protocol.CALL_CANDIDATE, to, 'candidate', event.candidate);				
			};				

		};
		
		this.sendWebRTCCall = function() {
		
			var self = this;
			var stream = this.callback.streams('local')[0].stream();
			this.peerConnection.addStream(stream);
			this.peerConnection.createOffer(function(desc) {
				self.peerConnection.setLocalDescription(desc, function() {					
					self.session.matrixConn.send(Protocol.CALL, to, 'sdp', desc)}, error);
			}, error);
		
		};
		
		this.acceptWebRTCCall = function() {
		
			var self = this;
			var stream = this.callback.streams('local')[0].stream();
			this.peerConnection.addStream(stream);
			this.peerConnection.setRemoteDescription(new RTCSessionDescription(this.remoteSDP));	
			signalingReady = true;			

			this.peerConnection.createAnswer(function(desc) {
				self.peerConnection.setLocalDescription(desc, function() {					
					self.session.matrixConn.send(Protocol.CALL_OK, to, 'sdp', desc)}, error);
				}, error);
					
			while (this.messageQueue.length > 0)
				this.triggerEvent(CallStatus.ICE, this.messageQueue.shift());						

		};
		

	this.disconnect = function () {			
			this.session.matrixConn.send(Protocol.CALL_TERMINATE, to);
			if (this.peerConnection.signalingState != "closed")
				this.peerConnection.close();
	    this.callback.triggerEvent(CallStatus.DISCONNECTED);
	};

	this.reject = function () {
	    if (this.isIncoming) {
		this.session.matrixConn.send(Protocol.CALL_REJECTED, to);
		this.session.removeCall(this);                
	    }
	};

	this.remoteStreams = function () {
	    return this.remoteStreamsList;
	};

	this.localStreams = function () {
	    return this.localStreamsList;
	};

	this.getStatus = function () {
	    return this.status;
	};
		
		this.createWebRTCCall();

    }

    function Session(userId, token, config, callback) {
	this.userId = userId;
	this.token = token;
	this.sessionConfig = config;
	this.callback = callback;
	this.status = SessionStatus.DISCONNECTED;
	this.inStatus = SessionStatus.DISCONNECTED;
	this.call = false;
	this.matrixConn = new MatrixConnection(this);        

	this.triggerEvent = function (status, data) {
	    var eventInfo = {}, i;
	    if (status == SessionStatus.INCOMINGCALL) {
		eventInfo.call = data;
		this.call = data;
	    } else {
		this.status = status;
		this.inStatus = status;
		if (data) eventInfo.error = data;
	    }
	    this.emitter.emit(status, eventInfo, this.callback);
	};

	this.removeCall = function (call) {
	    var i;
	    if (this.call.callback !== 'undefined') {
		this.call = call.callback;
	    }
	    this.call = false;
	};

	this.connect = function () {
	    if (this.inStatus === SessionStatus.DISCONNECTED) {                
		this.triggerEvent(SessionStatus.CONNECTING);                
		this.matrixConn.open();                                                    
				
	    }
	};

	this.createCall = function (to, mediatypes, session, callback, isIncoming) {
	    return new Call(to, mediatypes, session, callback, isIncoming);
	};

	this.disconnect = function () {
	    
	    if (this.call) {
		this.call.disconnect();
		this.removeCall(this.call);
	    }
	    this.matrixConn.close();
	    this.triggerEvent(SessionStatus.DISCONNECTED);            
			
	};

	this.getStatus = function () {
	    return this.status;
	};

    }
	
    // A Matrix connection class to relay signalling
    function MatrixConnection(ses) {
    
	var session = ses;
	var client2=null;
	var fquserid;
	var msg = null;
	var rooms = new Array();
	var maxAge = 3000;
	    

	    
	    
	this.send = function (method, to, param, value) {
		var msg = {
		    method: method,
			from: session.userId,
			to : to
		    };
		if (param != undefined)
			msg[param] = value;
		this._sendmsg(to, JSON.stringify(msg));      
		
	};
	    
	    
	this.close = function () {
		    
	};
	    
	
	this.leaveRoom = function(to) {
	    if (client2) {
		if (rooms[to] != undefined) {
		    console.log("Leaving room with "+to);
		    rooms[to].leave();
		    delete rooms[to];
		}
	    };
	}
	
	var _mySyncComplete = function() {
	    console.log("In _mySyncComplete")
	    // We're now going to leave all rooms that we were in
	    // very crude approach to room management
	    var oldRooms = client2.getRooms();
	    console.log("Rooms reported:"+oldRooms.length);
	    var members;
	    var j;
	    for (var i=0; i<oldRooms.length; i++) {
		// console.log("Room:"+oldRooms[i].name);
		members=oldRooms[i].currentState.getMembers();
		for (j =0; j<members.length; j++) {
		    // console.log(members[j]);
		    if (members[j].userId==fquserid &&
			members[j].membership == "join") {
			client2.leave(members[j].roomId);
			console.log("Cleanup. Leaving room:"+members[j].roomId);
		    }
		}
	    }
	    session.triggerEvent(SessionStatus.CONNECTED);
	}
	
	this._myLoggedin =  function(err, data) {
	    console.log("In _myLoggedin");
	    if (data) {
		console.log(data);
		console.log(data.access_token);
		// It appears the SDK requires you to create a new client
		// object with the access token obtained by logging in 
		// to proceed further
		client2 = matrixcs.createClient(
		{"baseUrl" : "http://matrix.org",
		"accessToken" : data.access_token}
		);
		client2.startClient(0);
		client2.once("syncComplete", _mySyncComplete);
		client2.on("RoomMember.membership", _membershipEvent);
		client2.on("Room.timeline", _onMessage);
	    }
	}
	
	var _membershipEvent = function(event, member) {
	    if (event.getAge()<maxAge &&
		member.membership === "leave" )
		{
		    sender=member.userId;
		    startpos=sender.indexOf("@");
		    endpos=sender.indexOf(":");
		    if (startpos==0 && endpos>0) {
			from=sender.substring(1,endpos);
			if (rooms[from] != undefined) {
			    console.log(from+" has left room. So will I");
			    rooms[from].leave();
			    delete rooms[from];
			    if (session.call)                    
				session.call.triggerEvent(CallStatus.DISCONNECTED);
			}
		    }
		}
	    if (event.getAge()<maxAge &&
		member.membership === "invite" &&
		member.userId === fquserid) {
		    sender=event.getSender();
		    startpos=sender.indexOf("@");
		    endpos=sender.indexOf(":");
		    if (startpos==0 && endpos>0) {
			from=sender.substring(1,endpos);
			console.log("Accepting invite from:"+from);
			rooms[from] = new matrixRoom(client2, member.roomId, from);
		    }
	    }
	}
	
	this._sendmsg = function (to, msg) {
	    if (client2) {
		if (rooms[to] == undefined) {
		    rooms[to] = new matrixRoom(client2, null, to);
		}
		rooms[to].send(msg);
		// console.log("==> "+msg);
	    };
	}
	

	var _onMessage = function (event, room, toStartOfTimeline) {
	    var sender=event.getSender();
	
	    var content=event.getContent();
	    if (
		event.getType()=="m.room.message" &&
		content.msgtype &&
		content.msgtype == "org.orcajs.reflector" &&
		sender!=fquserid &&
		event.getAge()<10000
	    ) { 
		console.log("<== " + content.body);
		var json = JSON.parse(content.body);
		if (json.method == Protocol.CALL) {                 
			session.callback.triggerEvent(SessionStatus.INCOMINGCALL, json.from);
			if (session.call) {
			    session.call.triggerEvent(CallStatus.SDP, json.sdp);
			}
		}
		else if (json.method == Protocol.CALL_OK && session.call)
			session.call.triggerEvent(CallStatus.SDP, json.sdp);                   
		else if (json.method == Protocol.CALL_CANDIDATE && session.call) 
			session.call.triggerEvent(CallStatus.ICE, json.candidate);
		else if (json.method == Protocol.CALL_REJECTED && session.call)
			session.call.triggerEvent(CallStatus.REJECTED);
		else if (json.method == Protocol.CALL_TERMINATE && session.call)                    
			session.call.triggerEvent(CallStatus.DISCONNECTED);
		else if (json.method.indexOf(Protocol.CALL_ERROR && session.call) == 0) {
			session.call.triggerEvent(CallStatus.ERROR, json.method);
			session.call.disconnect();
		}
		else if (json.method.indexOf(Protocol.REGISTER_ERROR) == 0) {
			session.triggerEvent(SessionStatus.ERROR, json.method);
			session.disconnect();
		}
	    }
	};
	
	this.open = function () {
	    fquserid="@"+session.userId+":matrix.org";
	    this.client = matrixcs.createClient("http://matrix.org"); 
	    this.client.loginWithPassword(
		session.userId,
		session.token,
		this._myLoggedin
	    )

	};
	
    }

    
    // object containing information about Matrix Rooms
    matrixRoom = function (cl, rmId, to) {
	console.log("creating room object");
	var status;
	var roomId = rmId;
	var msgQueue = new Array();
	var client = cl;
	

	
	this.send = function ( msg ) {
	    if (status!="created" && status!="joined") {
		msgQueue[msgQueue.length] = msg;
	    } else {
		_sendMsg( msg );
	    }
	}
	
	this.leave = function() {
	    status="left";
	    client.leave(roomId);
	}
	
	var _sendMsg = function( msg ) {
	    console.log("==> "+msg);
	    // To make messages visible - not used
	    // client.sendTextMessage(roomId, msg);
	    client.sendMessage(roomId, {body: msg, msgtype: "org.orcajs.reflector" } );
	};
	
	var _sendQueue = function() {
	    for (var i=0; i<msgQueue.length; i++)
		_sendMsg( msgQueue[i]);
	    msqQueue = [];
	}
	
	var _myRoomCreated = function(err, data) {
	    console.log("In _myRoomCreated");
	    if (data) {
		console.log("room create data %s", JSON.stringify(data));
		roomId=data.room_id;
		status="created";
		_sendQueue();
		};
	    if (err) {
		error("room create err:" + JSON.stringify(err));
	    };
	};
	
	var _myRoomJoined = function(err, data) {
	    console.log("In _myRoomJoined")
	    if (data) {
		status="joined";
		_sendQueue();
	    }
	    if (err) {
		error("room joined err %s", JSON.stringify(err));
	    }
	}
	
	if (! roomId) { // Setting up a new room
	    console.log("creating matrix room");
	    // Create new room
	    status="creating";
	    client.createRoom(
		{"topic" : "demo call",
		"invite" : ["@"+to+":matrix.org"] },
		_myRoomCreated);
	} else { // Accepting an invite
	    console.log("accepting invite");
	    status="invited";
	    client.joinRoom(roomId, _myRoomJoined);
	}

    };
    
    
    function error(err) { console.error(err); }

    orcaReflector = {

	createSession: function (userid, token, sessionConfig, callback) {
	    return new Session(userid, token, sessionConfig, callback);
	}

    };

    this.orcaReflector = orcaReflector;

}());
