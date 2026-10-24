import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import Stripe from "stripe";
import {z} from "zod";
import {User,Product,Order} from "./models.js";

const app=express();
app.use(helmet());
app.use(cors({origin:process.env.CLIENT_ORIGIN||"http://localhost:5173"}));
// Stripe webhook must receive the exact raw body for signature verification.
app.post("/api/payments/webhook",express.raw({type:"application/json"}),async(req,res)=>{
 if(!process.env.STRIPE_SECRET_KEY||!process.env.STRIPE_WEBHOOK_SECRET)return res.status(503).send("Payments are not configured.");
 let event;try{event=new Stripe(process.env.STRIPE_SECRET_KEY).webhooks.constructEvent(req.body,req.headers["stripe-signature"],process.env.STRIPE_WEBHOOK_SECRET);}catch(e){return res.status(400).send(`Webhook signature error: ${e.message}`);}
 try{
  const session=event.data.object;
  if(event.type==="checkout.session.completed"){
   const o=await Order.findOne({paymentSessionId:session.id});
   if(o&&o.paymentStatus!=="paid"){o.paymentStatus="paid";o.status="Paid";await o.save();}
  }
  if(event.type==="checkout.session.expired"){
   const o=await Order.findOne({paymentSessionId:session.id});
   if(o&&o.paymentStatus==="unpaid"){for(const i of o.items)await Product.updateOne({_id:i.product},{$inc:{stock:i.quantity}});o.paymentStatus="failed";o.status="Payment Failed";await o.save();}
  }
  res.json({received:true});
 }catch(e){console.error("Stripe webhook error",e);res.status(500).send("Webhook processing failed.");}
});
app.use(express.json({limit:"1mb"}));
app.use("/api",rateLimit({windowMs:15*60*1000,limit:250,standardHeaders:true,legacyHeaders:false}));

const tokenFor=u=>jwt.sign({id:u._id.toString(),role:u.role},process.env.JWT_SECRET,{expiresIn:"2h"});
const safeUser=u=>({id:u._id,name:u.name,email:u.email,role:u.role,wishlist:u.wishlist||[]});
function auth(req,res,next){const h=req.headers.authorization||"";if(!h.startsWith("Bearer "))return res.status(401).json({message:"Please sign in to continue."});try{req.user=jwt.verify(h.slice(7),process.env.JWT_SECRET);next();}catch{return res.status(401).json({message:"Session expired. Please sign in again."});}}
const allow=(...roles)=>(req,res,next)=>roles.includes(req.user.role)?next():res.status(403).json({message:"You are not authorized to do this."});
const wrap=fn=>(req,res,next)=>Promise.resolve(fn(req,res,next)).catch(next);
const slugify=s=>s.toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,100);
const regSchema=z.object({name:z.string().trim().min(2).max(80),email:z.string().trim().email().max(254),password:z.string().min(8).max(72)});
const loginSchema=z.object({email:z.string().trim().email(),password:z.string().min(1).max(72)});
const productSchema=z.object({name:z.string().trim().min(2).max(140),description:z.string().trim().min(10).max(5000),category:z.string().trim().min(2).max(60),price:z.coerce.number().min(0).max(10000000),compareAtPrice:z.union([z.coerce.number().min(0),z.null()]).optional(),stock:z.coerce.number().int().min(0).max(1000000),sku:z.string().trim().min(3).max(40),image:z.string().trim().max(1000).optional().default(""),featured:z.boolean().optional().default(false),active:z.boolean().optional().default(true),rating:z.coerce.number().min(0).max(5).optional().default(4.5)});
const addressSchema=z.object({fullName:z.string().trim().min(2).max(100),line1:z.string().trim().min(3).max(200),city:z.string().trim().min(2).max(100),postalCode:z.string().trim().min(3).max(20),country:z.string().trim().min(2).max(80)});
const money=n=>Math.round(n*100)/100;

app.get("/api/health",(_req,res)=>res.json({status:"ok",service:"NEXORA Commerce API"}));
app.post("/api/auth/register",wrap(async(req,res)=>{
 const p=regSchema.safeParse(req.body);if(!p.success)return res.status(400).json({message:p.error.issues.map(i=>i.message).join("; ")});
 const email=p.data.email.toLowerCase();if(await User.exists({email}))return res.status(409).json({message:"An account with this email already exists."});
 const user=await User.create({name:p.data.name,email,passwordHash:await bcrypt.hash(p.data.password,12),role:"customer"});
 res.status(201).json({token:tokenFor(user),user:safeUser(user)});
}));
app.post("/api/auth/login",wrap(async(req,res)=>{
 const p=loginSchema.safeParse(req.body);if(!p.success)return res.status(400).json({message:"Enter a valid email and password."});
 const user=await User.findOne({email:p.data.email.toLowerCase()}).select("+passwordHash");
 if(!user||!(await bcrypt.compare(p.data.password,user.passwordHash)))return res.status(401).json({message:"Invalid email or password."});
 res.json({token:tokenFor(user),user:safeUser(user)});
}));
app.get("/api/auth/me",auth,wrap(async(req,res)=>{const user=await User.findById(req.user.id);if(!user)return res.status(404).json({message:"Account not found."});res.json({user:safeUser(user)});}));

app.get("/api/products",wrap(async(req,res)=>{
 const f={};if(req.query.admin!=="true")f.active=true;
 if(req.query.category&&req.query.category!=="All")f.category=String(req.query.category).slice(0,60);
 if(req.query.q){const q=String(req.query.q).slice(0,80).replace(/[.*+?^${}()|[\]\\]/g,"\\$&");f.$or=[{name:{$regex:q,$options:"i"}},{description:{$regex:q,$options:"i"}},{category:{$regex:q,$options:"i"}},{sku:{$regex:q,$options:"i"}}];}
 const sortMap={newest:{createdAt:-1},"price-asc":{price:1},"price-desc":{price:-1},rating:{rating:-1},featured:{featured:-1,createdAt:-1}};
 const products=await Product.find(f).sort(sortMap[req.query.sort]||sortMap.featured).limit(150).lean();res.json({products,total:products.length});
}));
app.get("/api/products/:id",wrap(async(req,res)=>{const p=await Product.findOne({_id:req.params.id,active:true}).lean();if(!p)return res.status(404).json({message:"Product not found."});res.json({product:p});}));
app.post("/api/products",auth,allow("admin"),wrap(async(req,res)=>{
 const p=productSchema.safeParse(req.body);if(!p.success)return res.status(400).json({message:p.error.issues.map(i=>i.message).join("; ")});
 try{const d=p.data;const product=await Product.create({...d,slug:`${slugify(d.name)}-${Date.now().toString(36)}`,sku:d.sku.toUpperCase()});res.status(201).json({product});}
 catch(e){if(e.code===11000)return res.status(409).json({message:"SKU already exists. Use a unique SKU."});throw e;}
}));
app.patch("/api/products/:id",auth,allow("admin"),wrap(async(req,res)=>{
 const p=productSchema.partial().safeParse(req.body);if(!p.success)return res.status(400).json({message:p.error.issues.map(i=>i.message).join("; ")});const d=p.data;if(d.name)d.slug=`${slugify(d.name)}-${Date.now().toString(36)}`;if(d.sku)d.sku=d.sku.toUpperCase();
 try{const product=await Product.findByIdAndUpdate(req.params.id,{$set:d},{new:true,runValidators:true});if(!product)return res.status(404).json({message:"Product not found."});res.json({product});}
 catch(e){if(e.code===11000)return res.status(409).json({message:"SKU already exists."});throw e;}
}));
app.delete("/api/products/:id",auth,allow("admin"),wrap(async(req,res)=>{const p=await Product.findByIdAndUpdate(req.params.id,{active:false},{new:true});if(!p)return res.status(404).json({message:"Product not found."});res.json({message:"Product archived."});}));

app.get("/api/wishlist",auth,wrap(async(req,res)=>{const u=await User.findById(req.user.id).populate({path:"wishlist",match:{active:true}});res.json({products:u.wishlist||[]});}));
app.post("/api/wishlist/:productId",auth,wrap(async(req,res)=>{
 const p=await Product.findOne({_id:req.params.productId,active:true});if(!p)return res.status(404).json({message:"Product not found."});
 const u=await User.findById(req.user.id);const exists=u.wishlist.some(id=>id.toString()===p._id.toString());
 if(exists)u.wishlist.pull(p._id);else u.wishlist.addToSet(p._id);await u.save();res.json({wishlist:u.wishlist.map(String),added:!exists});
}));

async function restoreStock(order){for(const i of order.items)await Product.updateOne({_id:i.product},{$inc:{stock:i.quantity}});}
app.post("/api/orders",auth,allow("customer"),wrap(async(req,res)=>{
 const p=z.object({items:z.array(z.object({productId:z.string().min(1),quantity:z.coerce.number().int().min(1).max(25)})).min(1).max(30),shippingAddress:addressSchema}).safeParse(req.body);
 if(!p.success)return res.status(400).json({message:p.error.issues.map(i=>i.message).join("; ")});
 const quantities=new Map();for(const i of p.data.items)quantities.set(i.productId,(quantities.get(i.productId)||0)+i.quantity);
 const ids=[...quantities.keys()];const products=await Product.find({_id:{$in:ids},active:true});if(products.length!==ids.length)return res.status(400).json({message:"A product is unavailable. Refresh your cart."});
 const byId=new Map(products.map(p=>[p._id.toString(),p]));const items=[];let subtotal=0;
 for(const [id,quantity] of quantities){
  const product=byId.get(id);if(product.stock<quantity){await Promise.all(items.map(i=>Product.updateOne({_id:i.product},{$inc:{stock:i.quantity}})));return res.status(409).json({message:`Only ${product.stock} units left for ${product.name}.`});}
  const updated=await Product.findOneAndUpdate({_id:product._id,stock:{$gte:quantity},active:true},{$inc:{stock:-quantity}},{new:true});
  if(!updated){await Promise.all(items.map(i=>Product.updateOne({_id:i.product},{$inc:{stock:i.quantity}})));return res.status(409).json({message:`Stock changed for ${product.name}. Retry checkout.`});}
  subtotal+=product.price*quantity;items.push({product:product._id,name:product.name,image:product.image,price:product.price,quantity});
 }
 subtotal=money(subtotal);const shipping=subtotal>=75?0:6.99;let order;
 try{order=await Order.create({orderNumber:`NX-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`,customer:req.user.id,items,subtotal,shipping,total:money(subtotal+shipping),shippingAddress:p.data.shippingAddress,status:process.env.STRIPE_SECRET_KEY?"Pending":"Processing",paymentStatus:process.env.STRIPE_SECRET_KEY?"unpaid":"demo"});}
 catch(e){await Promise.all(items.map(i=>Product.updateOne({_id:i.product},{$inc:{stock:i.quantity}})));throw e;}
 if(process.env.STRIPE_SECRET_KEY){
  try{const stripe=new Stripe(process.env.STRIPE_SECRET_KEY);const session=await stripe.checkout.sessions.create({mode:"payment",success_url:process.env.PAYMENT_SUCCESS_URL||"http://localhost:5173/?payment=success",cancel_url:process.env.PAYMENT_CANCEL_URL||"http://localhost:5173/?payment=cancelled",metadata:{orderId:order._id.toString()},line_items:[...items.map(i=>({quantity:i.quantity,price_data:{currency:"usd",unit_amount:Math.round(i.price*100),product_data:{name:i.name}}})),...(shipping>0?[{quantity:1,price_data:{currency:"usd",unit_amount:Math.round(shipping*100),product_data:{name:"Shipping"}}}]:[])]});
   order.paymentSessionId=session.id;await order.save();return res.status(201).json({order,checkoutUrl:session.url,demo:false});
  }catch(e){await restoreStock(order);await Order.findByIdAndDelete(order._id);throw e;}
 }
 res.status(201).json({order,demo:true,message:"Demo checkout complete. No real payment was taken."});
}));
app.get("/api/orders/mine",auth,allow("customer"),wrap(async(req,res)=>{const orders=await Order.find({customer:req.user.id}).sort({createdAt:-1}).limit(100).lean();res.json({orders});}));
app.get("/api/orders",auth,allow("admin"),wrap(async(req,res)=>{const orders=await Order.find().populate("customer","name email").sort({createdAt:-1}).limit(200).lean();res.json({orders});}));
app.patch("/api/orders/:id/status",auth,allow("admin"),wrap(async(req,res)=>{
 const p=z.enum(["Processing","Shipped","Delivered","Cancelled"]).safeParse(req.body.status);if(!p.success)return res.status(400).json({message:"Invalid order status."});
 const order=await Order.findById(req.params.id);if(!order)return res.status(404).json({message:"Order not found."});
 if(p.data==="Cancelled"&&order.status!=="Cancelled"&&order.status!=="Delivered"&&order.paymentStatus!=="failed")await restoreStock(order);
 order.status=p.data;await order.save();res.json({order});
}));
app.get("/api/admin/analytics",auth,allow("admin"),wrap(async(_req,res)=>{
 const [productCount,userCount,orderCount,lowStock,revenue,recentOrders,topProducts]=await Promise.all([
  Product.countDocuments({active:true}),User.countDocuments({role:"customer"}),Order.countDocuments(),
  Product.find({active:true,stock:{$lte:5}}).sort({stock:1}).limit(10).lean(),
  Order.aggregate([{$match:{paymentStatus:{$in:["paid","demo"]},status:{$nin:["Cancelled","Payment Failed"]}}},{$group:{_id:null,total:{$sum:"$total"}}}]),
  Order.find().sort({createdAt:-1}).limit(8).populate("customer","name email").lean(),
  Order.aggregate([{$match:{status:{$nin:["Cancelled","Payment Failed"]}}},{$unwind:"$items"},{$group:{_id:"$items.name",units:{$sum:"$items.quantity"},revenue:{$sum:{$multiply:["$items.price","$items.quantity"]}}}},{$sort:{units:-1}},{$limit:5}])
 ]);
 res.json({analytics:{productCount,userCount,orderCount,revenue:revenue[0]?.total||0,lowStock,recentOrders,topProducts}});
}));
app.use((err,_req,res,_next)=>{if(err?.name==="CastError")return res.status(400).json({message:"Invalid resource ID."});if(err?.code===11000)return res.status(409).json({message:"A record with this value already exists."});if(err?.name==="ValidationError")return res.status(400).json({message:err.message});console.error(err);res.status(500).json({message:"Server error. Check the backend terminal."});});

const PORT=Number(process.env.PORT||5000);
if(process.env.NODE_ENV!=="test"){
 if(!process.env.JWT_SECRET||process.env.JWT_SECRET.length<32){console.error("Set JWT_SECRET to a random secret of at least 32 characters in server/.env");process.exit(1);}
 mongoose.connect(process.env.MONGODB_URI||"mongodb://127.0.0.1:27017/nexora_commerce").then(()=>app.listen(PORT,()=>console.log(`NEXORA API running at http://localhost:${PORT}`))).catch(e=>{console.error("MongoDB connection failed:",e.message);process.exit(1);});
}
export {app};
