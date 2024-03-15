const express = require('express');
require('dotenv').config();

const mongoose = require('mongoose');
const bcrypt = require('bcrypt');
const validator = require('validator');
const session = require('express-session');
const mongoDbSession = require('connect-mongodb-session')(session);
const studentModel = require('./models/studentModel');
const userModel = require('./models/userModel');
const isAuth = require('./middleware/isAuth');
const rateLimiting = require('./middleware/rateLimiting');
const app= express();
const PORT = process.env.PORT || 8000;
const MONGO_URI = process.env.MONGO_URI;
const store = new mongoDbSession({
    uri:process.env.MONGO_URI,
    collection:'sessions'
})

app.set('view engine','ejs');
app.use(express.json());
app.use(express.urlencoded({extended:true}));
app.use(session({
    secret:process.env.SECRET_KEY,
    resave:false,
    saveUninitialized:false,
    store:store,
}))

app.use(express.static('public'));


mongoose.connect(MONGO_URI)
        .then(()=>{
            console.log("Mongodb connected successfully");
        })
        .catch((e)=>{
            console.log(e);
        });

app.get('/',(req,res)=>{
    return res.send("server is running");
});

app.get('/register',(req,res)=>{
    return res.render('register');
});

app.post('/register',async(req,res)=>{
    const {name,email,password,confirmPassword}=req.body;

    if(name!=='' && email!=='' && password!=='' && confirmPassword!==''){
    
        if(validator.isEmail(email) && (password===confirmPassword)){
            console.log('data cleaned up');
        }else{

            return res.send({
                status:400,
                message:'Data error'
            });

        }
       
    }else{
        return res.send({
            status:400,
            message:'Data error'
        });
    }
  


    const emailExist = await userModel.findOne({email});

    if(emailExist){
        return res.send({
            status:400,
            message:'Email already exists'
        });
    }


  const hashedPassword = await bcrypt.hash(password,parseInt(process.env.SALT));  

  const userObj = new userModel({
    name,
    email,
    password:hashedPassword,
  });
  try{
  const userdb = await userObj.save()
    return res.redirect('/login');
}
catch(e){
    return res.send({
        status:500,
        message:'Data base error',
        error:e,
    });
}
})

app.get('/login',(req,res)=>{
    return res.render('loginPage');
});

app.post('/login',async(req,res)=>{
    const {loginId,password}=req.body;
    const userDb = await userModel.findOne({email:loginId});
    if(!userDb){
        return res.send({
            status:400,
            message:'Email not found'
        });
    }

    const isMatch = await bcrypt.compare(password,userDb.password);

    if(!isMatch){
        return res.send({
            status:400,
            message:'Password is incorrect'
        });
    }
    


    req.session.isAuth = true;
    req.session.user = {
        email:userDb.email,
        userId:userDb._id
    };

    return res.redirect('/dashboard');

});


app.get('/dashboard',isAuth,async(req,res)=>{

    const user = req.session.user.email;
    try {
        const dataDb=await studentModel.find({adminEmail:user});
        return res.render('dashboardPage',{dataDb:dataDb});
    } catch (error) {
        return res.send({
            status:500,
            message:'Database error',
            error:error
        });
    }
    
});


app.post('/logout',isAuth,(req,res)=>{
    req.session.destroy((e)=>{
        if(e){
            return res.send({
                status:500,
                message:'Logout unsuccessfull',
                error:e
            });
        }

        return res.redirect('/login');
    });
});


app.post('/logout_from_all_devices',isAuth,async(req,res)=>{
    const userEmail = req.session.user.email;
    const sessionSchema = new mongoose.Schema({_id:String},{strict:false});
    const sessionModel = mongoose.model('session',sessionSchema);


    try {

        const deleteDb= await sessionModel.deleteMany({
            'session.user.email':userEmail,
        });

        return res.send({
            status:200,
            message:'Logout from all devices successfull',
            data:deleteDb
        })
        
    } catch (error) {
        return res.send({
            status:500,
            message:'Database error',
            error:error
        })
    }
   
});


app.post('/create-student',isAuth,rateLimiting,async(req,res)=>{
    const {rollno,name,email} = req.body;
    const user = req.session.user.email;

    if(rollno===''||name===''||email===''){
        return res.send({
            status:400,
            message:'missing fields'
        });
    }

    const emailExist = await studentModel.findOne({studentEmail:email});
    const rollnoExist = await studentModel.findOne({rollno:rollno});

    if(emailExist){
        return res.send({
            status:400,
            message:'Student already exists'
        });
    }

    else if(rollnoExist){
        return res.send({
            status:400,
            message:'Student already exists'
        });
    }


   


    const stuObj = new studentModel({
        rollno:rollno,
        studentName:name,
        studentEmail:email,
        adminEmail:user
    });

    
    
    try {
        const stuDb = await stuObj.save();
        return res.send({
            status:201,
            message:'new student entry created successfully'
        });
    } catch (error) {
        return res.send({
            status: 500,
            message:'Database error',
            error:error
        });
    }


});

app.post('/edit-student',isAuth,rateLimiting,async(req,res)=>{
    const {id,rollno,studentName,studentEmail}=req.body;
    const user=req.session.user.email;

    try {
        const stuDb = await studentModel.findOne({_id:id});
        if(!stuDb){
            return res.send({
                status:400,
                message:'Data not found'
            });
        }
        if(user!==stuDb.adminEmail){
            return res.send({
                status:403,
                message:'Not authorised to edit'
            });
        }

        const preStuDb=await studentModel.findOneAndUpdate({_id:id},{rollno,studentName,studentEmail});
        return res.send({
            status:200,
            message:'Student entry updated',
            data:preStuDb

        })
    } catch (error) {
        return res.send({
            status:500,
            message:'Database error',
            error:error
        });
    }
});


app.post('/delete-student',isAuth,rateLimiting,async(req,res)=>{
    const id=req.body.id;
    const user=req.session.user.email;
    if(!id){
        return res.send({
            status:400,
            message:'Missing credentials'
        });
    }

    try {
        const stuDb = await studentModel.findOne({_id:id});

        if(!stuDb){
            return res.send({
                status:400,
                message:'Data not found'
            })
        }

        if(user!==stuDb.adminEmail){
            return res.send({
                status:403,
                message:'Not authorised to delete'
            }); 
        }

        const stuprv = await studentModel.findOneAndDelete({_id:id});
        return res.send({
            status:200,
            message:'Student entry deleted successfully',
            data:stuprv
        });


    } catch (error) {
        return res.send({
            status:500,
            message:'Database error',
            error:error
        });
    }



});





app.get('/read-student',isAuth,rateLimiting,async(req,res)=>{
    const user=req.session.user.email;

    try {
        const stuDb = await studentModel.find({adminEmail:user});
        return res.send({
            status:200,
            message:'Read success',
            data:stuDb
        })
    } catch (error) {
        return res.send({
            status:500,
            message:'Database error',
            error:error
        });
    }
})


app.get('/pagination_dashboard',isAuth,async(req,res)=>{
    const SKIP = req.query.skip || 0;
    const LIMIT = 5;
    const user = req.session.user.email;

    try {
        const dataDb = await studentModel.aggregate([
        {
            $match:{adminEmail:user}
        },
        
        {
            $facet:{
                data:[{$skip:parseInt(SKIP)},{$limit:LIMIT}]
            }
        }
    ]);
   
    return res.send({
        status:200,
        message:'Read success',
        data:dataDb[0].data
    });

    } catch (error) {

        return res.send({
            status:500,
            message:'Database error',
            error:error
        });
        
    }
});

app.listen(PORT,()=>{
  console.log(`server is running on port:${PORT}`)
})