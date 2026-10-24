import mongoose from "mongoose";
const userSchema = new mongoose.Schema({
 name:{type:String,required:true,trim:true,maxlength:80},
 email:{type:String,required:true,unique:true,lowercase:true,trim:true},
 passwordHash:{type:String,required:true,select:false},
 role:{type:String,enum:["customer","admin"],default:"customer"},
 wishlist:[{type:mongoose.Schema.Types.ObjectId,ref:"Product"}]
},{timestamps:true});
const productSchema = new mongoose.Schema({
 name:{type:String,required:true,trim:true,maxlength:140},
 slug:{type:String,required:true,unique:true,lowercase:true},
 description:{type:String,required:true,maxlength:5000},
 category:{type:String,required:true,trim:true,maxlength:60},
 price:{type:Number,required:true,min:0},compareAtPrice:{type:Number,min:0,default:null},
 stock:{type:Number,required:true,min:0,default:0},sku:{type:String,required:true,unique:true,uppercase:true,trim:true},
 image:{type:String,default:""},featured:{type:Boolean,default:false},active:{type:Boolean,default:true},
 rating:{type:Number,min:0,max:5,default:4.5}
},{timestamps:true});
productSchema.index({name:"text",description:"text",category:"text"});
const orderSchema = new mongoose.Schema({
 orderNumber:{type:String,required:true,unique:true},customer:{type:mongoose.Schema.Types.ObjectId,ref:"User",required:true},
 items:[{product:{type:mongoose.Schema.Types.ObjectId,ref:"Product",required:true},name:{type:String,required:true},image:String,price:{type:Number,required:true},quantity:{type:Number,required:true,min:1}}],
 subtotal:{type:Number,required:true},shipping:{type:Number,default:0},total:{type:Number,required:true},currency:{type:String,default:"usd"},
 status:{type:String,enum:["Pending","Paid","Processing","Shipped","Delivered","Cancelled","Payment Failed"],default:"Pending"},
 paymentStatus:{type:String,enum:["demo","unpaid","paid","failed","refunded"],default:"demo"},paymentSessionId:{type:String,default:""},
 shippingAddress:{fullName:String,line1:String,city:String,postalCode:String,country:String}
},{timestamps:true});
export const User=mongoose.model("User",userSchema);
export const Product=mongoose.model("Product",productSchema);
export const Order=mongoose.model("Order",orderSchema);
