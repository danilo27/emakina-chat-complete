const chatForm = document.getElementById('chat-form');
const chatMessages = document.querySelector('.chat-messages');
const roomName = document.getElementById('room-name');
const userList = document.getElementById('users');

// Get username and room from URL
const { username, room } = Qs.parse(location.search, {
  ignoreQueryPrefix: true,
});

const socket = io.connect( {
  transports: ['websocket'],
  upgrade: false,
});

// Join chatroom
socket.emit('joinRoom', { username, room });

// Get room and users
socket.on('roomUsers', ({ room, users }) => {
  outputRoomName(room);
  outputUsers(users);
});

// Message submit
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();

  // Get message text
  let msg = e.target.elements.msg.value;

  msg = msg.trim();

  if (!msg) {
    return false;
  }

  // Emit message to server
  socket.emit('chatMessage', msg);

  // Clear input
  e.target.elements.msg.value = '';
  e.target.elements.msg.focus();
});

// Message from server
socket.on('message', message => {

  const para = document.createElement('p');
  para.classList.add('text');
  para.innerText = message.text;

  outputMessage(message, para);

  // Scroll down
  chatMessages.scrollTop = chatMessages.scrollHeight;
});

socket.on('image', message => {
  var oImg = document.createElement("img");
  oImg.setAttribute('src', message.text);
  oImg.setAttribute('alt', 'na');
  oImg.style.maxHeight = '100%';
  oImg.style.width = '100%';

  outputMessage(message, oImg);
});

// When the client receives a voice message it will play the sound
// object is arraybuffer
socket.on('voice', message => {
  var blob = new Blob([message.object], { 'type': 'audio/ogg; codecs=opus' });
  var audio = document.createElement('audio');
  audio.src = window.URL.createObjectURL(blob);
  audio.muted = true;
  audio.controls = 'controls';
  audio.id = 'audio-player';

  audio.play();

  outputMessage(message, audio);
});

// When the client receives a voice message it will play the sound
socket.on('audioFile', message => {
  var audioElement = document.createElement("audio");

  audioElement.src = message.text;
  audioElement.setAttribute('data-audio-filename', message.text);
  audioElement.setAttribute('controls', true);

  outputMessage(message, audioElement);
});

// Output message to DOM
function outputMessage(message, obj) {
  const div = document.createElement('div');
  div.classList.add('message');
  const p = document.createElement('p');
  p.classList.add('meta');
  p.innerText = message.username;
  p.innerHTML += `<span> ${message.time}</span>`;
  div.appendChild(p);
  div.appendChild(obj);
  document.querySelector('.chat-messages').appendChild(div);
}

// Add room name to DOM
function outputRoomName(room) {
  roomName.innerText = room;
}

// Add users to DOM
function outputUsers(users) {
  userList.innerHTML = '';
  users.forEach((user) => {
    const li = document.createElement('li');
    li.innerText = user.username;
    userList.appendChild(li);
  });
}

//Prompt the user before leave chat room
document.getElementById('leave-btn').addEventListener('click', () => {
  const leaveRoom = confirm('Are you sure you want to leave the chatroom?');
  if (leaveRoom) {
    window.location = '../index.html';
  } else {
  }
});

//file upload
var uploader = new SocketIOFileUpload(socket);
uploader.listenOnInput(document.getElementById("plain_input_element"));

// client side
uploader.addEventListener("start", function (event) {
  event.file.meta.roomName = roomName.textContent;
  event.file.meta.username = username;
});

const recordButton = document.querySelector('#record');
const stopButton = document.querySelector('#stop');
const playButton = document.querySelector('#play');
const saveButton = document.querySelector('#save');
const savedAudioMessagesContainer = document.querySelector('#saved-audio-messages');

let recorder;
let audio;

recordButton.addEventListener('click', async () => {
  recordButton.style.display = 'none';
  stopButton.style.display = 'block'; 

  var constraints = { audio: true };
  navigator.mediaDevices.getUserMedia(constraints).then(function (mediaStream) {
    var mediaRecorder = new MediaRecorder(mediaStream);
    mediaRecorder.onstart = function (e) {
      this.chunks = [];
    };
    mediaRecorder.ondataavailable = function (e) {
      this.chunks.push(e.data);
    };
    mediaRecorder.onstop = function (e) {
      var blob = new Blob(this.chunks, { 'type': 'audio/ogg; codecs=opus' });
      socket.emit('voiceMessage', { username, room, blob });
    };

    // Start recording
    mediaRecorder.start();

    //Stop recording after 5 seconds and broadcast it to server
    setTimeout(function () {
      mediaRecorder.stop();
      recordButton.style.display = 'block';
      stopButton.style.display = 'none';
    }, 5000);
  });
});
