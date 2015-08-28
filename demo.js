var initSession, endSession, callConnect;
var session=false;
var call=false;
var localStream=false;
var callIsIncoming=false;
var globalUIState;

var	sessionConfig = {
	// When using the reflector backend update the URI for access here
		uri: 'ws://192.168.0.54:8443',
		provider: orcaReflector,
		mediatypes: 'audio,video',
		hostilityhelper : {"iceServers": [] }
	};

var UIStatesEnum = {
	OFF: 1,
	CANCALL: 2,
	CANDISCONNECT: 3,
	CANACCEPT: 4
}

function setUIelement(id, state) {
	if ($(id).length > 0) {
		if (state)
			$(id).removeAttr('disabled');
		else
			$(id).attr('disabled', 'disabled');
	}
	if (id=='.callConnect') {
		if ($(id, window.parent.document).length > 0) {
			if (state)
				$(id, window.parent.document).removeAttr('disabled');
			else
				$(id, window.parent.document).attr('disabled', 'disabled');
		}
	}
}

function setUI(uistate) {
	globalUIState=uistate;
	$('#ring')[0].pause();
	switch(uistate) {
	case 2:
		setUIelement('.callConnect', true);
		setUIelement('.callDisconnect', false);
		setUIelement('.callAccept', false);
		setUIelement('.callReject', false);
		// Hide contents if in iframe
		if (window.frameElement)
			$(window.frameElement.parentElement).css("display","none");
		break;
	case 3:
		setUIelement('.callConnect', false);
		setUIelement('.callDisconnect', true);
		setUIelement('.callAccept', false);
		setUIelement('.callReject', false);
		// Display contents if in iframe
		if (window.frameElement)
			$(window.frameElement.parentElement).css("display","block");
		break;
	case 4:
		setUIelement('.callConnect', false);
		setUIelement('.callDisconnect', false);
		setUIelement('.callAccept', true);
		setUIelement('.callReject', true);
		$('#ring')[0].currentTime = 0;
		$('#ring')[0].play();
		break;
	default:
		setUIelement('.callConnect', false);
		setUIelement('.callDisconnect', false);
		setUIelement('.callAccept', false);
		setUIelement('.callReject', false);
	}
}

function getRemoteParty(call) {
    // Get number from public ID
    var caller = call.remoteIdentities();
    if (caller && caller.length) {
        caller = caller[0].id;
    } else {
        caller = 'Unknown';
    }
    return caller;
}

//=============================================================
// Session call-backs
//=============================================================

function session_onConnected(event) {
	console.log("Session Connected");
	$('.sessionStatusInfo').html("Session Connected");
	$('.callStatusInfo').html("Call Disconnected");
	setUI(UIStatesEnum.CANCALL);
}

function session_onDisconnected(event) {
    console.log('session_onDisconnected');
	$('.sessionStatusInfo').html("Session Disconnected. Reload page to restart session.");
	sessionCleanup();
}

function session_onError(event){
	console.log('session_onError '  + event.error);
	$('.sessionStatusInfo').html("Session Disconnected due to error "+ event.error + ".  Reload page to restart session.");
	sessionCleanup();
}

function sessionCleanup() {
    if (localStream) {
        localStream.stop();
    }
	if (call)
		call.off();
    call = false;
	if (session)
		session.off();
    session = false;
	$('.callStatusInfo').html("&nbsp;");
	setUI(UIStatesEnum.OFF);
}

function session_onIncoming(event) {
    console.log('session_onIncoming');
	call = event.call;
	callIsIncoming = true;
    addCallCallbacks();
	$('.callStatusInfo').html("Call incoming from " + getRemoteParty(call));
	setUI(UIStatesEnum.CANACCEPT);
}


//=============================================================
// Call buttons
//=============================================================

function callConnect() {
	if (globalUIState == UIStatesEnum.CANCALL) {
		var toList = "user2", mediatypes;
		setUI(UIStatesEnum.OFF);
		

		// Construct Call parameters                
		mediatypes = 'audio,video';

		if ($('#usertocall').length > 0)
			toList = $('#usertocall').val();
		
		// Create Call
		call = session.createCall(toList, mediatypes);
		callIsIncoming = false;
		// Set Call callbacks
		addCallCallbacks();

		// Get user media, then connect
		getMyUserMedia();
	}
}

function callDisconnect() {
	if (call && globalUIState == UIStatesEnum.CANDISCONNECT)
		call.disconnect();
}

function callAccept() {
		// Get user media, then connect
		getMyUserMedia();
}

function callReject() {
	if (call)
		call.reject();
	$('.callStatusInfo').html("Call Rejected");
	callCleanup();
}

//=============================================================
// Call call-backs
//=============================================================

function call_onConnecting(event) {
    console.log('call_onConnecting');
	$('.callStatusInfo').html("Call Connecting...");
}

function call_onConnected(event) {
    console.log('call_onConnected');
	$('.callStatusInfo').html("Call Active");
	setUI(UIStatesEnum.CANDISCONNECT);
}

function call_onAddStream(event) {
    var url;
    console.log('call_onAddStream');
    url = window.nativeURL.createObjectURL(event.stream.stream());
    $('.remoteVideo').attr('src', url);
}

function call_onDisconnected(event) {
	console.log('call_onDisconnected');
	$('.callStatusInfo').html("Call Disconnected");
    callCleanup();
}

function call_onError(event) {
	console.log('call_onError ' + event.error);
	$('.callStatusInfo').html('Call error: ' + event.error);
	callCleanup();
}

function call_onRejected(event) {
	console.log('call_onRejected');
	$('.callStatusInfo').html('Call Rejected');
	callCleanup();
}

function callCleanup() {
	if (call) {
        call.off();
        call = false;
        }
	
	setUI(UIStatesEnum.CANCALL);
    if (localStream) 
        localStream.stop();
	$('.localVideo').attr('src', "");
	$('.remoteVideo').attr('src', "");
}

function addCallCallbacks() {
	call.on('connecting', call_onConnecting);
	call.on('connected', call_onConnected);
    call.on('stream:add', call_onAddStream);
	call.on('disconnected', call_onDisconnected);
	call.on('error', call_onError);
	call.on('rejected', call_onRejected);
}



//=============================================================
// Adding Local Stream
//=============================================================

function getMyUserMedia() {
    var audio = true, video = true, mediaStreamConstraints;
    console.log('getUserMedia()');
    if (!navigator.getUserMedia) {
        alert('Your browser does not suppoert getUserMedia, so we cannot continue with making the call.');
        onUserMediaError();
        return;
    }

    if (localStream) {
        localStream.stop();
    }

    try {
        mediaStreamConstraints = {video: video, audio: audio};
        navigator.getUserMedia(mediaStreamConstraints, onUserMediaSuccess, onUserMediaError);
    } catch (e) {
        onUserMediaError();
    }
}

function onUserMediaSuccess(stream) {
    var url;
    console.log('onUserMediaSuccess()');
    localStream = stream;
    url = window.nativeURL.createObjectURL(stream);
    $('.localVideo').attr('src', url);
    if (call) {
        call.addStream(stream);
        call.connect();
		setUI(UIStatesEnum.CANDISCONNECT);
    }
}

function onUserMediaError() {
    console.log('onUserMediaError()');
	if (callIsIncoming)
		call.reject();
	$('.callStatusInfo').html("Failed to get user media");
	callCleanup();
}

//=============================================================
// Set up initial UI and session
//=============================================================			
			
function initSession() {
	var userid, password="password";
	
	navigator.getUserMedia = navigator.getUserMedia || navigator.webkitGetUserMedia ||
            navigator.mozGetUserMedia || navigator.msGetUserMedia;
	window.nativeURL = window.webkitURL || window.URL;
	
	userid = $('#userid').val();
	console.log("User ID="+userid);
	if ($('#password').length > 0)
		password = $('#password').val();
	console.log("Password="+password);
	
	console.log("Creating Session");
	session = orca.createSession(userid, password, sessionConfig);
	console.log("Session Created");
	session.on('connected', session_onConnected);
	session.on('disconnected', session_onDisconnected);
	session.on('error', session_onError);
	session.on('incomingCall', session_onIncoming);
	session.connect();
	console.log("Session Connected returned");
	if ($('.callConnect').length > 0)
		$('.callConnect').click(callConnect);
	if ($('.callConnect', window.parent.document).length > 0)
		$('.callConnect', window.parent.document).click(callConnect);
	if ($('.callDisconnect').length > 0)
		$('.callDisconnect').click(callDisconnect);
	if ($('.callAccept').length > 0)
		$('.callAccept').click(callAccept);
	if ($('.callReject').length > 0)
		$('.callReject').click(callReject);
}

function endSession() {
	if (session) {
		session.disconnect();
		console.log("Session Disconnect Requested");
	};
}

//=============================================================
// Run on Page
//=============================================================

$(window).on('beforeunload', function(e) {
	endSession();
});

$(document).ready(function () {
    initSession();
});

