const path = require('path');
const http = require('http');
const express = require('express');
const socketio = require('socket.io');
const cors = require('cors');
const fetch = require("node-fetch") // To pipe received image back to caller
const formatMessage = require('./utils/messages');
var siofu = require('socketio-file-upload');

const {
  userJoin,
  getCurrentUser,
  userLeave,
  getRoomUsers
} = require('./utils/users');

const app = express();
const server = http.createServer(app);

app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')))
  .use(siofu.router);

const botName = 'Emakina Bot';

const io = socketio(server);

// Run when client connects
io.on('connection', socket => {
  var uploader = new siofu();
  uploader.dir = "public/uploads";
  uploader.listen(socket);

  uploader.on("saved", event => {
    var roomName = event.file.meta.roomName;
    var username = event.file.meta.username;

    io.to(roomName).emit('image', formatMessage(username, 'https://emakina-chat-workshop-full.herokuapp.com/proxy?url=https://emakina-chat-workshop-full.herokuapp.com/uploads/' + event.file.name));
  });

  socket.on('voiceMessage',  ({ username, room, blob }) => {
    io.to(room).emit('voice', formatMessage(username, '', blob));
  });

  socket.on('joinRoom', ({ username, room }) => {
    const user = userJoin(socket.id, username, room);

    socket.join(user.room);

    // Welcome current user
    socket.emit('message', formatMessage(botName, 'Welcome to Emakina Chat!'));

    // Broadcast when a user connects
    socket.broadcast
      .to(user.room)
      .emit(
        'message',
        formatMessage(botName, `${user.username} has joined the chat`)
      );

    // Send users and room info
    io.to(user.room).emit('roomUsers', {
      room: user.room,
      users: getRoomUsers(user.room)
    });
  });

  // Listen for chatMessage
  socket.on('chatMessage', msg => {
    const user = getCurrentUser(socket.id);
    console.log(user.room)
    io.to(user.room).emit('message', formatMessage(user.username, msg));
  });

  // Runs when client disconnects
  socket.on('disconnect', () => {
    const user = userLeave(socket.id);

    if (user) {
      io.to(user.room).emit(
        'message',
        formatMessage(botName, `${user.username} has left the chat`)
      );

      // Send users and room info
      io.to(user.room).emit('roomUsers', {
        room: user.room,
        users: getRoomUsers(user.room)
      });
    }
  });
});

app.use(express.json());

app.get('/messages', (req, res) => {
  readdir(messageFolder)
    .then(messageFilenames => {
      res.status(200).json({ messageFilenames });
    })
    .catch(err => {
      console.log('Error reading message directory', err);
      res.sendStatus(500);
    });
});

app.post('/messages', (req, res) => {
  if (!req.body.message) {
    return res.status(400).json({ error: 'No req.body.message' });
  }
  const messageId = v4();
  writeFile(messageFolder + messageId + '.mp3', req.body.message, 'base64')
    .then(() => {
      res.status(201).json({ message: 'Saved message' });
    })
    .catch(err => {
      console.log('Error writing message to file', err);
      res.sendStatus(500);
    });
});

// GET request to serve as proxy for images
app.get("/proxy", (req, response) => {
  const url = req.query.url
  if (url && url.length > 0) {
    fetch(url)
      .then(res => res.body.pipe(response))
      .catch(err => console.log(err))
  }
})

const PORT = process.env.PORT || 8081;

server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
