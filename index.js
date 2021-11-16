const express = require("express");
const socket = require("socket.io");
const axios = require("axios");

// App setup
const PORT = 5000;
const app = express();
const server = app.listen(process.env.PORT || PORT, function () {
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
app.get("/errand", async (req, res) => {
    try {
		const response = await axios.get("https://api.squeakyklin.com/errandboy/index");
		//res.status(200).json(response);
        console.log(response)
	} catch (err) {
        console.log(err)
		//res.status(500).json({ message: err });
	}
});
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
        console.log("i am order details",orderDetails)
         axios.post("https://api.squeakyklin.com/errandboy/nearesterrandboy",orderDetails)
		.then( async response => {
			console.log("find-nearby-rider-result",response.data);
             if(response.data.status == 1 ){
                // send to nearest rider
                orderDetails['rider_username'] = response.data.result.username;
                orderDetails['rider_id'] = response.data.result.id;
                orderDetails['rider_root_id'] = response.data.result.parent_id;

                if ('vendor_id' in orderDetails){
                    //orderDetails['vendor_id'] = orderDetails.vendor_id;
                }else{

                    orderDetails['vendor_id'] = 0;
                }

                if("default" in response.data.result){
                    let id = orderDetails.id
                    let rider_id = orderDetails.rider_id
                    let rider_root_id = orderDetails.rider_root_id
                    let vendor_id = orderDetails.vendor_id
                    let data = response.data.result;
                     axios.post("https://api.squeakyklin.com/errandboy/updaterider?id="+id+"&rider_id="+rider_id+"&rider_root_id="+rider_root_id+"&vendor_id="+vendor_id)
            		.then(async response => {
                        console.log(rider_id)
                        if(response.data.status == 1 ){
                            await io.to(userSocket[response.data.result.username]).emit('request_sent_to_nearby_rider', orderDetails);

                            // send back to user
                            //io.to(userSocket[socket.username]).emit('awaiting_rider_approval', riderDetails);
                            //await io.to(userSocket[socket.username]).emit('awaiting_rider_approval', response.data.result);
                            await io.to(userSocket[socket.username]).emit('awaiting_rider_approval_default', data);
                            return false;
                        }


            		})
            		.catch((err) => {
                        console.log("  find-nearby-rider",err)

            		});

                }

                io.to(userSocket[response.data.result.username]).emit('request_sent_to_nearby_rider', orderDetails);

                // send back to user
                //io.to(userSocket[socket.username]).emit('awaiting_rider_approval', riderDetails);
                io.to(userSocket[socket.username]).emit('awaiting_rider_approval', response.data.result);
            }else{
                io.to(userSocket[socket.username]).emit('awaiting_rider_approval', response.data);
            }


		})
		.catch((err) => {
            console.log("find-nearby-rider",err)

		});


  	}); //end of set-user-data event.

    socket.on('rider_accepted', function(orderDetails) {

        //save rider accepted and if its laundry add order id  to laundry

        let id = orderDetails.id
        let rider_id = orderDetails.rider_id
        let rider_root_id = orderDetails.rider_root_id
        let vendor_id = orderDetails.vendor_id

         axios.post("https://api.squeakyklin.com/errandboy/updaterider?id="+id+"&rider_id="+rider_id+"&rider_root_id="+rider_root_id+"&vendor_id="+vendor_id)
		.then(response => {
            console.log(rider_id)
            if(response.data.status == 1 ){
                io.to(userSocket[orderDetails.rider_username]).emit('rider_approved', orderDetails);
                io.to(userSocket[orderDetails.customer]).emit('rider_approved', orderDetails);
            }else{
                io.to(userSocket[socket.username]).emit('awaiting_rider_approval', orderDetails);
            }


		})
		.catch((err) => {
            console.log("  find-nearby-rider main ","https://api.squeakyklin.com/errandboy/updaterider?id="+id+"&rider_id="+rider_id+"&rider_root_id="+rider_root_id+"&vendor_id="+vendor_id)

		});


  	}); //end of set-user-data event.



  socket.on("disconnect", () => {
    activeUsers.delete(socket.userId);
    io.emit("user disconnected", socket.userName);
  });
});
