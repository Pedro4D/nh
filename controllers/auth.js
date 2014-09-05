const passport = require('passport')
    , FacebookStrategy = require('passport-facebook').Strategy
    , TwitterStrategy = require('passport-twitter').Strategy
    , userModel = require('../model/user')
    , ObjectId = require('mongoose').Types.ObjectId
    , GoogleStrategy = require('passport-google').Strategy
    , confg_auth = require('../config/auth');

passport.serializeUser(function(user, done) {
    done(null, user);
});


passport.deserializeUser(function(obj, done) {
    done(null, obj);
});

var auth = function () {


// metodo para generar un public token
    var  logFacebook  = function(req,res){

        passport.use(new FacebookStrategy({
                clientID: confg_auth.facebookAuthDev.clientID,
                clientSecret: confg_auth.facebookAuthDev.clientSecret,
                callbackURL: confg_auth.facebookAuthDev.callbackURL
            },
            function(req, token, refreshToken, profile, done) {
                // asynchronous
                process.nextTick(function() {

                    // check if the user is already logged in
                    if (!req.user) {
                        console.log("============ ================= ================ Entrando en passport config");
                        userModel.findOne({email: profile.email}, function (err, user) {
                            if (err) {
                                return done(err);
                            }else{
                                if(user){
                                    // if there is a user id already but no token (user was linked at one point and then removed)
                                    if (!user.facebook.token) {
                                        user.facebook.token = token;

                                        user.save(function(err) {
                                            if (err)
                                                throw err;
                                            return done(null, user);
                                        });
                                    }
                                }else{
                                    var newUser = new userModel();
                                    newUser.username = profile.name.givenName;
                                    newUser.email = profile.emails[0].value;
                                    newUser.role = 'user'; // by now only role
                                    newUser.active = true;
                                    newUser.facebook.token = token;

                                    newUser.save(function(err) {
                                        if (err)
                                            throw err;
                                        return done(null, newUser);
                                    });
                                }
                            }

                        });

                    } else {
                        // user already exists and is logged in, we have to link accounts
                        var user            = req.user; // pull the user out of the session

                        user.facebook.id    = profile.id;
                        user.facebook.token = token;

                        user.save(function(err) {
                            if (err)
                                throw err;
                            return done(null, user);
                        });

                    }
                });

            }));

        res.json({status:200});
    };


return {
    logFacebook: logFacebook
};

}();

function findOrCreate(profile, callback){

    userModel.findOne({_id: new ObjectId(profile.id)}, function (err, user) {
        if (err) {
            callback(err);
        }else{
            if(null == user){
                var user = new userModel();
                user.username = profile.username;
                user.password = pass;
                user.email = profile.email;
                user.role = 'user'; // by now only role
                user.active = true;
            }else{
                callback(null,user);
            }
        }

    });

}


module.exports = auth;
