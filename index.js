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

  socket.on('subscribe', function (id) {
    socket.join(id);
  });

  socket.on('new message', function (data) {
    console.log(data);
    io.sockets.emit(data.target_user_id).emit('private message', data.message);
  });

  socket.on('notification', function(data) {
    io.sockets.emit(data.target_user_id).emit('new notification', data);
    console.log(data);
    console.log(sockets);
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
    io.sockets.emit(data.target_user_id).emit('user_typing', data);
  });

  // when the client emits 'stop typing', we broadcast it to others
  socket.on('stop typing', function (data) {
    io.sockets.emit(data.target_user_id).emit('user_stop_typing', data);
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
