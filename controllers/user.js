/**
* Debate Controller
*/
const 
	jwt = require( 'jsonwebtoken' ),
	secret = require('../lib/secret'),
	redisClient = require('../lib/redis_database').redisClient,
    userModel = require('../model/user'),
    DebateModel = require('../model/debate'),
    _ = require('underscore'),
	tokenManager = require('../lib/token_manager');

var user = function(){

		/**
		* signin user method
		*/
		var signin = function(req,res){

			var email = req.body.email || '';
			var password = req.body.password || '';

			if (email == '' || password == '') {
                return res.json({status:401,error:"bad parameter numbers"});
			}
                getUserByEmail( email , function (err, user) {
                    if (err) {
                        return res.json({status:401,error:err});
                    }

                    if (user == undefined) {
                        return res.json({status:401,error:"not user found"});
                    }

                    user.comparePassword(password, function(isMatch) {
                        console.warn("user",user);
                        console.warn("MATCH???",isMatch);
                        if (!isMatch) {
                            console.log("Attempt failed to login with " + user.username);
                            return res.json({status:401,error:"Attempt failed to login with " + user.username});
                        }

                        var token = jwt.sign({id: user._id}, secret.secretToken, { expiresInMinutes: tokenManager.TOKEN_EXPIRATION });

                        return res.json({status:200,token:token, userId: user._id, userName : user.username,photo:user.photo});
                    });

                });
		},
		/**
		* logout user method
		*/
		logout = function(req,res){

			if (req.user) {
				tokenManager.expireToken(req.headers);

				delete req.user;	
				return res.send(200);
			}
			else {
				return res.send(401);
			}

		},

        /**
         * get User By ID method
         */
        getUserById = function (req,res){

            var id = req.query.id;

            userModel.findOne({_id: id}, function (err, user) {
                if (err) {
                    console.log(err);
                }else{
                    res.json({status : 200 , user : user});
                }
            });

        },

		/**
		* register user method
		*/
		register = function(req,res){
            console.warn("registro /user/register");
			var username = req.body.username || '';
			 	password = req.body.password || '',
			 	passwordConfirmation = req.body.passwordConfirmation || '',
			 	email = req.body.email || '',
			 	emailConfirmation = req.body.emailConfirmation || '';

            console.warn("registro /user/registe email",password,email);
			if (username == '' || password == '' 
				|| password != passwordConfirmation || email != emailConfirmation) {
				return res.send(400);
			}

			var user = new userModel();
			user.username = username;
			user.password = password;
			user.email = email;
			user.role = 'user'; // by now only role
			user.active = false;

			user.save(function(err) {
				if (err) {
					console.log(err);
					return res.send(500);
				}	

				userModel.count({username:user.username},function(err, counter) {
					if (err) {
						console.log(err);
						return res.send(500);
					}

                    var userData = {
                            username : user.username,
                            id : user._id,
                            photo : user.photo,
                            token : jwt.sign({id: user._id}, secret.secretToken, { expiresInMinutes: tokenManager.TOKEN_EXPIRATION })
                        };


					if (counter == 1) {
						userModel.update({username:user.username}, {active:true}, function(err, nbRow) {
							if (err) {
								console.log(err);
								return res.send(500);
							}
                            
							return res.json({status : 200, user : userData} );
						});
					} 
					else {
						return res.json({status : 200, user : userData} );
					}
				});
			});

			

        },
        updateProfile = function(req,res){
            var idUser = req.body._id || '';
            var data = req.body.data || '';
            userModel.findOne({_id: idUser}, function (err, user) {
                if (err) {
                    res.json({status:401,error:err});
                }
                updateUserData(user,data, function(err,userUpdated) {
                    if (err) {
                        console.log("Attempt failed to login with " + userUpdated.username);
                        res.json({status:401,error:"Attempt failed to login with " + userUpdated.username});
                    }else{
                        //Salvo lo nuevo
                        saveUser(userUpdated);
                        //Actualizo los debates
                        updateDebateData(user._id,{_id:userUpdated._id,photo:userUpdated.photo,username:userUpdated.username});
                        //Retorno el usuario modificado
                        res.json({status:200, user: userUpdated});
                    }
                });

            });
        },
        /**
         * get User By ID method
         */
        getUserById_inApp = function (id,callback){


            userModel.findOne({_id: id}, function (err, user) {
                if (err) {
                    console.log(err);
                }else{
                    callback(user);
                }
            });

        },



        /**
         * Method for upload a new tag from administer service
         */
         imgUp =  function(req, res) {
            if(undefined!==req.files.file){
                fs.readFile(req.files.file.path, function (err, data) {
                    // creation of path based on timestamp
                    var now = Date.now(),
                        type = req.files.file.name.split('.').pop(),
                        newPath = IMG_TMP+now+'.'+type,
                        url = req.protocol + '://' + req.get('host') +'/tmp/'+now+'.'+type;
                    // writing file to disk
                    fs.writeFile(newPath, data, function (error) {
                        if(error) {
                            res.json({error:1,msg:error.message});
                        }else{
                            res.json({error:0,token:now,url:url,fileName: now+'.'+type});
                        }
                    });
                });
            }else{
                res.json({error:1,msg:"file not found"});
            }

        };

	return {
		signin : signin,
		logout : logout,
        getUserById: getUserById,
        updateProfile: updateProfile,
		register : register,
        getUserById_inApp : getUserById_inApp
	};

}();


function getUserByEmail(email,callback){

    userModel.findOne({email: email}, function (err, user) {
        if (err) {
            callback(err);
        }else{
            callback(null,user);
        }

    });

}


/**
 * @function saveUser basic save user
 * @param debate Object with the actual debate
 */
function saveUser(user) {
    //deberia retornar error si no se pudo guardar y controlarlo en el metodo que lo llama
    user.save();
}

function updateUserData(user,data,callback){
    var err = null;
    console.log("updateUserData",user,data);
    Object.keys(data).forEach(function(key) {
        if(data[key] === undefined){
            err = "Value "+key+ "not exists";
        }else{
            user.key =data[key];
        }
    });
    callback(err,user);
}


/**
 * @function updateUserPhoto basic save user photo
 * @param user Object with the user
 * @param file Object with the photo
 */
function updateUserPhoto(user,file,callback){
    var err = null;
    console.log("updateUserData",user,data);
    Object.keys(data).forEach(function(key) {
        if(data[key] === undefined){
            err = "Value "+key+ "not exists";
        }else{
            user.key =data[key];
        }
    });
    callback(err,user);
}


function updateDebateData(userId,user){
    var debates = findDebateByUser(userId);

    //hay que validar que no sea null debates
    _.each(debates, function(deb, index) {
        if(deb.paticipants.team1.indexOf(userId)!==-1){
            for (var i=0; i<deb.paticipantsData.team1.length;i++){
                newUser = deb.paticipantsData.team1.shift();
                if(newUser._id === userId){
                    deb.paticipantsData.team1.push(user);
                    break;
                }
                deb.paticipantsData.team1.push(newUser);
            }
        }else{
            for (var i=0; i<deb.paticipantsData.team2.length;i++){
                newUser = deb.paticipantsData.team2.shift();
                if(newUser._id === userId){
                    deb.paticipantsData.team2.push(user);
                    break;
                }
                deb.paticipantsData.team2.push(newUser);
            }
        }
        //vuelvo a salvar el debate con los datos actualizados
        deb.save();
    });
}

function findDebateByUser(userId){
    DebateModel.find({ $or:[ {'participants.team1':{ $in: userId}},{'participants.team2':{ $in: userId}}]} , function (err, debates) {
        if (err) {
            return (null);
        } else {
            return (debates);
        }

    });

}

module.exports = user;
