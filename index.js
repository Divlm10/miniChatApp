const http=require("http");
const express=require("express");
const path=require("path");
const {Server}=require("socket.io");//install Server


const app=express();
const server=http.createServer(app);//need to attach socket io with app over server(not directly)

const io=new Server(server);//attach socket.io to the http server
//listening for client connections 
io.on("connection",(socket)=>{
    // console.log("New user connected",socket.id);//every socket(client) has an associated id

    socket.on("user-joined",(username)=>{
        //socket listens for event user-joined sent from client with username
        socket.username=username;//store username along with default id
        //broadcast {System:XYZ joiend/left the chat}
        io.emit("message",{
            username:"System",
            message:`${username} joined the chat`
        });
    });

    socket.on("user-message",(data)=>{//listen for event(user-message) from client=>socket.emit("user-message",message);
        // console.log("A new user Message",message);   
        io.emit("message",data);//broadcast if any message from any user
    });

    socket.on("disconnect",()=>{ //on refreshing,leaving,crash
        if(socket.username){
            //username exists not undefined
            io.emit("message",{
                username:"System",
                message:`${socket.username} left the chat`
            });
        }
    });
});

app.use(express.static(path.resolve("./public")));//serve everything inside public folder

app.get('/',(req,res)=>{
    return res.sendFile("./public/index.html");
})

server.listen(9000,()=>console.log(`Server started`));



