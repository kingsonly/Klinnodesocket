const express = require("express");
const socket = require("socket.io");
const axios = require("axios").create({baseUrl: "https://jsonplaceholder.typicode.com/"});

// App setup
const PORT = 5000;
const app = express();
const server = app.listen(PORT, function () {
  console.log(`Listening on port ${PORT}`);
  console.log(`http://localhost:${PORT}`);
});

// Static files
app.use(express.static("public"));

// Socket setup
const io = socket(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const activeUsers = new Set();
var userSocket = {}; // holds all conected client details

io.on("connection", function (socket) {
  console.log("Made socket connection");

  socket.on('set-user', function(username) {
		console.log(username+ "  logged In 1");
		//storing variable.
		socket.username = username;
		userSocket[socket.username] = socket.id;

        io.to(userSocket[socket.username]).emit('set-room', userSocket);


	}); //end of set-user event.

    socket.on('find-nearby-rider', function(orderDetails) {
         // connect to php using axios
          // send to nearest rider
          io.to(userSocket[socket.username]).emit('set-room', userSocket);

          // send back to user
          io.to(userSocket[socket.username]).emit('set-room', userSocket);


  	}); //end of set-user-data event.



  socket.on("disconnect", () => {
    activeUsers.delete(socket.userId);
    io.emit("user disconnected", socket.userName);
  });
});
