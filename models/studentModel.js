const { text } = require("express");
const mongoose = require("mongoose");
const Schema = mongoose.Schema;

const student = new Schema({
  rollno: {
    type: String,
    required: true,
  },
  studentName:{
    type:String,
    required:true,
  },

  studentEmail:{
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
  adminEmail: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
  },
 
});

module.exports = mongoose.model("student database", student);
