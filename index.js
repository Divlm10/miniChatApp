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
    socket.on("user-message",(message)=>{//listen for event(user-message) from client=>socket.emit("user-message",message);
        // console.log("A new user Message",message);   
        io.emit("message",message);//broadcast if any message from any user
    });
});

app.use(express.static(path.resolve("./public")));//serve everything inside public folder

app.get('/',(req,res)=>{
    return res.sendFile("./public/index.html");
})

server.listen(9000,()=>console.log(`Server started`));



