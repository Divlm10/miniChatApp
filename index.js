const http=require("http");
const express=require("express");
const path=require("path");
const {Server}=require("socket.io");//install Server


const app=express();
const server=http.createServer(app);//need to attach socket io with app over server(not directly)

const roomUsers={};//store users in rooms

const io=new Server(server);//attach socket.io to the http server
//listening for client connections 
io.on("connection",(socket)=>{
    // console.log("New user connected",socket.id);//every socket(client) has an associated id

    // socket.on("user-joined",(username)=>{
    //     //socket listens for event user-joined sent from client with username
    //     socket.username=username;//store username along with default id
    //     //broadcast {System:XYZ joiend/left the chat}
    //     io.emit("message",{
    //         username:"System",
    //         message:`${username} joined the chat`
    //     });
    // });
    //JOIN ROOMS
    socket.on("join-room",(data)=>{
        const {username,room}=data;//extract from data
        socket.username=username;//save
        socket.room=room;

        socket.join(room);

        if(!roomUsers[room]){
            //no users in this room
            roomUsers[room]=[];
        }

        roomUsers[room].push(username);//insert current user into this room list

        io.to(room).emit("message",{   //io.to(room).emit() =>Message goes to only that room
            username:"System",
            message:`${username} joined ${room}`
        });

        io.to(room).emit("room-users",roomUsers[room]);//broadcast list of active users in a room to the room members
    });

    //MESSAGE
    socket.on("user-message",(data)=>{//listen for event(user-message) from client=>socket.emit("user-message",message);
        // console.log("A new user Message",message);   
        io.to(socket.room).emit("message",data);//broadcast if any message from any user
    });
    //TYPING
    socket.on("typing",(username)=>{
        socket.broadcast.to(socket.room).emit("typing",username);//broadcast typing mssg to everyone EXCEPT sender
    });

    socket.on("stop-typing",(username)=>{
        socket.broadcast.to(socket.room).emit("stop-typing",username);
    });
    //DISCONNECTION
    socket.on("disconnect",()=>{ //on refreshing,leaving,crash
        const {username,room}=socket;//extract from socker
        if(username && room){
            //username exists not undefined && room also exists
            // io.emit("message",{
            //     username:"System",
            //     message:`${socket.username} left the chat`
            // });

            roomUsers[room]=roomUsers[room].filter(user=>user!==username);//erase current user->filtering users!=username

            io.to(room).emit("message",{
                username:"System",
                message:`${username} left ${room}`
            });
            
            io.to(room).emit("room-users",roomUsers[room]);//show remaining active members in room
        }
    });
});

app.use(express.static(path.resolve("./public")));//serve everything inside public folder

app.get('/',(req,res)=>{
    return res.sendFile(path.resolve("./public/index.html"));
})

server.listen(9000,()=>console.log(`Server started`));



