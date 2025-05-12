const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { type } = require('os');

const userSchema = new mongoose.Schema({
    name: String,
    email: { type: String, unique: true },
    password: String,
    role: { type: String, enum: ['user', 'admin'], default: 'user' }
});


userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

userSchema.methods.comparePassword = function (password) {
    return bcrypt.compare(password, this.password);
}

module.exports = mongoose.model('User', userSchema);
