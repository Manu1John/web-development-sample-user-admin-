const mongoose = require("mongoose")
const connect = mongoose.connect("mongodb://localhost:27017/registerForm")


connect.then(()=>{
    console.log("database connectionn established")
}).catch(()=>{
    console.log("connection failed")
})

///create login schema

const loginSchema = new mongoose.Schema({
    name : {
        type : String,
        requird : true
    },
    Password:{
        type:String,
        requird:true
    },
    email:{
        type:String,
        required:true
    }
})

//connection part
const collection = new mongoose.model("user",loginSchema)

module.exports = collection