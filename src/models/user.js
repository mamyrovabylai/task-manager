const mongoose = require('mongoose')
const validator = require('validator')
const bcrypt = require('bcryptjs')
const jwt = require('jsonwebtoken')
const Task = require('./task')

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        trim: true
    },
    email:{
        type: String,
        unique: true,
        required: true,
        trim: true,
        lowercase: true,
        validate(value){
            if(!validator.isEmail(value)){
                throw new Error("Innapropriate email")
            }
        }
    },
    age: {
        type: Number,
        default: 0,
        validate(value){
            if(value<0){
                throw new Error('Age must be a positive')
            }
        }
    },
    password: {
        type: String,
        require: true,
        trim: true,
        minlength: 7,
        validate(value){
            if(value.toLowerCase().includes('password')){
                throw new Error('Password shouldn\'t inlcude "password"')
            }
        }
    },
    tokens: [{
        token: {
            type: String,
            required: true
        }
    }], // arrays of objects
    avatar: {
        type: Buffer
    }
},{
    timestamps: true
})

//instance methods

userSchema.methods.generateAuthToken = async function() {
    const user = this

    const token = jwt.sign({_id: user._id.toString()}, process.env.JWT_SECRET) // toString because it is binary object
    user.tokens = user.tokens.concat({token})
    user.save()
    return token
}

userSchema.methods.toJSON = function(){
    const user = this
    
    const userObject = user.toObject() // provide raw profile data
    // in order to manipulate
    delete userObject.password
    delete userObject.tokens
    delete userObject.avatar

    
    return userObject
}

// model methods

userSchema.statics.findByCredentials = async (email, password)=>{
    const user = await User.findOne({email})
    if(!user) throw new Error('Unable to log in')
    const isMatch = await bcrypt.compare(password, user.password)
    if(!isMatch) throw new Error('Unable to login')
    return user
}

//Hash the plain text password before saving
userSchema.pre('save', async function(next){
    const user = this

    if (user.isModified('password')){
        user.password = await bcrypt.hash(user.password, 8)
    }

    next()
})

// Delete tasks when user is deleted

userSchema.pre('remove', async function(next){
    const user = this
    await Task.deleteMany({ owner: user._id})
    next()
})

//binding to the Task
userSchema.virtual('tasks',{
    ref: 'Task',
    localField: '_id',
    foreignField: 'owner'
})


const User = mongoose.model('User', userSchema)

module.exports = User