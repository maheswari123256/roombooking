const mongoose=require('mongoose');
const amenitySchema=new mongoose.Schema({
    type:String,
    iconUrl:String
});
module.exports=mongoose.model("Amenity",amenitySchema)