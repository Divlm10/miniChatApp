const http=require("http");
const express=require("express");
const path=require("path");
const {Server}=require("socket.io");//install Server
const pool=require("./db.js");


const app=express();
const server=http.createServer(app);//need to attach socket io with app over server(not directly)

const roomUsers={};//store users in rooms
const users={};//to map target users with their socketid(DM)

function getTime(){
    return new Date().toLocaleTimeString([],{
        hour:"2-digit",
        minute:"2-digit"
    });
}


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
    socket.on("join-room",async (data)=>{
        const {username,room}=data;//extract from data
        socket.username=username;//save
        socket.room=room;

        socket.join(room);

        if(!roomUsers[room]){
            //no users in this room
            roomUsers[room]=[];
        }

        roomUsers[room].push(username);//insert current user into this room list

        users[username]=socket.id;//map user to socketID

        //LOAD Chat History when user joins room=>latest 50
        const result=await pool.query(  
            "SELECT * FROM messages WHERE room=$1 ORDER BY id DESC LIMIT 50",[room]
        );
        socket.emit("chat-history",result.rows.reverse());//reverse before sending to see Latest mssgs

        const time=getTime();

        io.to(room).emit("message",{   //io.to(room).emit() =>Message goes to only that room
            username:"System",
            message:`${username} joined ${room}`,
            time
        });

        io.to(room).emit("room-users",roomUsers[room]);//broadcast list of active users in a room to the room members
    });

    //MESSAGE
    socket.on("user-message",async (data)=>{//listen for event(user-message) from client=>socket.emit("user-message",message);
        // console.log("A new user Message",message);   
        //Timestamp
        // const time=new Date().toLocaleTimeString([],{
        //     hour:"2-digit",
        //     minute:"2-digit"
        // });

        // io.to(socket.room).emit("message",{
        //     ...data,
        //     time:getTime()
        // });//broadcast if any message from any user

        const time=getTime();
        const {username,message}=data;
        const room=socket.room;
        //persist in DB
        await pool.query(
            "INSERT INTO messages(username,message,room,time) VALUES($1,$2,$3,$4)",
            [username,message,room,time]
        );

        io.to(room).emit("message",{
            username,
            message,
            time
        });
    });

    //PRIVATE Message(DM)
    socket.on("private-message",(data)=>{
        const {to,message,username}= data;//extract from received data
        const targetSocketId=users[to];//get corresponding socketid of target receiver

        if(targetSocketId){
            const time=getTime();
            //send to target receiver
            io.to(targetSocketId).emit("private-message",{
                from: username,
                message,
                time
            });
            //send back to sender aswell(display)
            socket.emit("private-message",{ //socket.emit() =>sends the event only to the current socket
                from:username,
                message,
                time,
                self:true
            });
        }
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

            const time=getTime();

            io.to(room).emit("message",{
                username:"System",
                message:`${username} left ${room}`,
                time
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



