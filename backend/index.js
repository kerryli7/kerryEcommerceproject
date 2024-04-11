const port = 4000;
const express = require('express');
const app = express();
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const cors = require('cors');

app.use(express.json());
app.use(cors());

// Database Connection With MongoDB
mongoose.connect('mongodb+srv://ZongpengLi:1438824Kerry@cluster1.vtyx2ck.mongodb.net/e-commerce')

// Api Creation

app.get('/',(req,res)=>{
    res.send('Express App is Running')
})

// Image Storage Engine

const storage = multer.diskStorage({
    destination: './upload/images',
    filename:(req,file,cb)=>{
        return cb(null,`${file.fieldname}_${Date.now()}${path.extname(file.originalname)}`)
    }
})

const upload = multer({storage:storage})

// Creating Upload Endpoint for images

app.use('/images',express.static('upload/images'))

app.post('/upload',upload.single('product'),(req,res)=>{
    res.json({
        success:1,
        image_url:`http://localhost:${port}/images/${req.file.filename}`
    })
})

// Schema for Creating Products

const Product = mongoose.model('Product',{
    id:{
        type: Number,
        required:true,
    },
    name:{
        type:String,
        required:true,
    },
    image:{
        type:String,
        required:true,
    },
    category:{
        type: String,
        required:true,
    },
    new_price:{
        type: Number,
        required:true,
    },
    old_price:{
        type: Number,
        required:true,
    },
    date:{
        type:Date,
        default:Date.now,
    },
    avilable:{
        type:Boolean,
        default:true,
    },
})

app.post('/addproduct',async (req,res)=>{
    let products = await Product.find({});
    let id;
    if(products.length>0)
    {
        let last_product_array = products.slice(-1);
        let last_product = last_product_array[0];
        id = last_product.id+1;
    }
    else{
        id=1;
    }
    const product = new Product({
        id:id,
        name:req.body.name,
        image:req.body.image,
        category:req.body.category,
        new_price:req.body.new_price,
        old_price:req.body.old_price,
    });
    console.log(product);
    await product.save();
    console.log('Saved');
    res.json({
        success:true,
        name:req.body.name,
    })
})

// Creating API For deleting Products

app.post('/removeproduct',async (req,res)=>{
    await Product.findOneAndDelete({id:req.body.id});
    console.log("Removed");
    res.json({
        success:true,
        name:req.body.name,
    })
})

// Creating API for getting all products
app.get('/allproducts',async (req,res)=>{
    let products = await Product.find({});
    console.log("All Products Fetched");
    res.send(products)
})


// Schema for creating user model
const Users = mongoose.model("Users", {
    name: {
      type: String,
    },
    email: {
      type: String,
      unique: true,
    },
    password: {
      type: String,
    },
    cartData: {
      type: Object,
    },
    date: {
      type: Date,
      default: Date.now,
    },
  });

  //Create  endpoint for regestring the user 
app.post('/signup', async (req, res) => {


          let check = await Users.findOne({ email: req.body.email });
          if (check) {
              return res.status(400).json({ success: false, errors: "existing user found with this email" });
          }
          let cart = {};
            for (let i = 0; i < 300; i++) {
            cart[i] = 0;
          }
          const user = new Users({
              name: req.body.username,
              email: req.body.email,
              password: req.body.password,
              cartData: cart,
          });
          await user.save();
          const data = {
              user: {
                  id: user.id
              }
          }
          
          const token = jwt.sign(data, 'secret_ecom');
          res.json({ success:true, token })
      });

//Create an endpoint for login the user 
app.post('/login', async (req, res) => {

      let user = await Users.findOne({ email: req.body.email });
      if (user) {
          const passCompare = req.body.password === user.password;
          if (passCompare) {
              const data = {
                  user: {
                      id: user.id
                  }
              }

              const token = jwt.sign(data, 'secret_ecom');
              res.json({ success:true, token });
          }
          else {
              return res.status(400).json({success: false, errors: "Wrong Password"})
          }
      }
      else {
          return res.status(400).json({success: false, errors: "Wrong Email Id"})
      }
  });

// creating enpoint for newcollection data
  app.get("/newcollections", async (req, res) => {
	let products = await Product.find({});
  let newcollection = products.slice(1).slice(-8);
  console.log("New Collections");
  res.send(newcollection);
});


// creating enpoint for Popular In Womendata
app.get("/popularinwomen", async (req, res) => {
	let products = await Product.find({category:"women"});
    let popular_in_women = products.splice(0,  4);
    console.log("Popular In Women");
    res.send(popular_in_women);
});

// MiddleWare to fetch user from database
const fetchuser = async (req, res, next) => {
    const token = req.header("auth-token");
    if (!token) {
      res.status(401).send({ errors: "Please authenticate using a valid token" });
    }
    try {
      const data = jwt.verify(token, "secret_ecom");
      req.user = data.user;
      next();
    } catch (error) {
      res.status(401).send({ errors: "Please authenticate using a valid token" });
    }
  };
  
// Create an endpoint for saving the product in cart
app.post('/addtocart',fetchuser,async (req, res) => {
	console.log("Added", req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    userData.cartData[req.body.itemId] += 1;
    await Users.findOneAndUpdate({_id:req.user.id}, {cartData:userData.cartData});
    res.send("Added")
  })

    //Create an endpoint to remove product from cart
app.post('/removefromcart', fetchuser, async (req, res) => {
	console.log("Remove Cart", req.body.itemId);
    let userData = await Users.findOne({_id:req.user.id});
    if(userData.cartData[req.body.itemId]>0)
    {
      userData.cartData[req.body.itemId] -= 1;
    }
    await Users.findOneAndUpdate({_id:req.user.id}, {cartData:userData.cartData});
    res.send("Removed");
  })

    //Create an endpoint to get cartdata
app.post('/getcart', fetchuser, async (req, res) => {
    console.log("Get Cart");
    let userData = await Users.findOne({_id:req.user.id});
    res.json(userData.cartData);
  
    })

    app.get('/backend/hello', (req, res) => {
        res.send({ message: 'Hello from Vercel!' });
      });



app.listen(port,(error)=>{
    if (!error){
        console.log('Server Running on Port '+port)
    }
    else{
        console.log('Error : '+error)
    }
})