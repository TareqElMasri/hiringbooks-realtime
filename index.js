// Setup basic express server
var express = require('express');
var app = express();
var _ = require('lodash');
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var port = process.env.PORT || 7000;

server.listen(port, function () {
  console.log('Server listening at port %d', port);
});

// Routing
app.use(express.static(__dirname + '/public'));

// Chatroom

var onlineUsers = [];
var sockets = {};

io.on('connection', function (socket) {
  socket.send({title:"onlineUsers", data:onlineUsers});
  socket.send({title:"socketid", data:socket.id});

  socket.on('subscribe', function (data) {
    console.log(data, socket.id);
    if (sockets[data.user_id] && sockets[data.user_id].id) {
      if (sockets[data.user_id].room && sockets[data.user_id].room.length > 0) {
        sockets[socket.username].room = sockets[data.user_id].room;
      } else {
        sockets[data.user_id].room = socket.id.replace("/#", "") + 'v' + sockets[data.user_id].id.replace("/#", "");
      }
      socket.join(sockets[data.user_id].room);
      socket.broadcast.emit("room_id", {room: sockets[data.user_id].room, index: data.user_index, current_user: data.current_user});
    }
  });

  socket.on('new message', function (data) {
    console.log(data);
    io.sockets.emit(data.room).emit('private message', data.message);
  });

  // when the client emits 'add user', this listens and executes
  socket.on('add user', function (username) {
    // we store the username in the socket session for this client
    socket.username = username;
    console.log(_.indexOf(onlineUsers, username));
    if (_.indexOf(onlineUsers, username) < 0) {
      onlineUsers.push(username);
      sockets[username] = {
        id: socket.id,
        socket : socket
      };
    }
    socket.broadcast.emit('user joined', {
      username: socket.username,
      onlineUsers: onlineUsers
    });
    console.log(socket.username);
    // echo globally (all clients) that a person has connected
  });

  // when the client emits 'typing', we broadcast it to others
  socket.on('typing', function (data) {
    socket.broadcast.emit('user_typing', data);
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function (data) {
    socket.broadcast.emit('user_stop_typing', data);
  });

  // when the user disconnects.. perform this
  socket.on('disconnect', function () {
    if (onlineUsers.indexOf(socket.username)) {
      delete sockets[socket.username];
      onlineUsers.splice(socket.username, 1);

      // echo globally that this client has left
      socket.emit('user left', {
        username: socket.username,
        onlineUsers: onlineUsers
      });
    }
  });
});
