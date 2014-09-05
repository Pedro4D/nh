/**
 * Debate Controller
 */
/*const 
 debateLib = require( '../lib/debate' );
 */
    DebateModel = require('../model/debate'),
    UserController = require('../controllers/user');
var debate = function () {

    var moment = require('moment'),
        /**
         * Save user method
         *
         * @method save
         * @param {Object} data Argument 1
         * @return {JSON} Returns and JSON object with the result
         */
            save = function (req, res) {

            if (req.param('data')) {

                var newDebate = JSON.parse(req.param('data'));
                // add data to schema
                var schema = {

                    subject: newDebate.subject,
                    description: newDebate.description,
                    category: newDebate.category,
                    url: newDebate.url,
                    participantsNum: parseInt(newDebate.participantsNum),
                    invitedUsers: newDebate.invitedUsers,
                    startDate: newDebate.startDate,
                    endDate: moment(newDebate.startDate).add({months: 1}),
                    turn: 1,
                    debatePosition: 0,
                    private: newDebate.private,
                    createdBy: {
                        username : newDebate.username,
                        id : newDebate.userId,
                        photo : newDebate.userPhoto
                    },
                    moderator: newDebate.moderator,
                    participants: {
                        team1: newDebate.participants.team1,
                        team2: newDebate.participants.team2
                    },
                    comments: {
                        team1: newDebate.comments.team1,
                        team2: newDebate.comments.team2
                    },
                    votes: [],
                    status: 0

                };
                // save debate to mongoDB
               // filledCommentsArray(schema, function(newDeb){
                    DebateModel.saveDebate(schema, function (err, debate) {
                        if (!err) {

                            //CULPA DE MONGOOSE
                           debate.comments.team1={};
                            debate.comments.team2={};
                            debate.markModified('comments.team1');
                            debate.markModified('comments.team2');
                            debate.save();
                            //PUTO MONGOOSE

                            getUserById(newDebate.moderator, function(user,completeUser){
                                if(undefined !== completeUser){
                                    //update user with the new debate
                                    completeUser.update({$push: {createdDebates: debate._id}},function(err){
                                        if(err){
                                            console.log("error",err);
                                        }else{
                                            console.log("no error");
                                        }
                                    });
                                    // updating iddebate
                                    res.json({status: 200, debateId: debate._id});
                                }else{
                                    res.json({status: 503, error: 'user not found'});
                                }
                            });
                        } else {
                            console.warn(err);
                            res.json({status: 503, error: err});
                        }

                    });
               // });

            } else {
                res.json({status: 503, error: "bad sintaxis"});
            }

        },
        /**
         * Comment user method
         *
         * @method Comment
         * @param {Object} data Argument 1
         * @return {JSON} Returns and JSON object with the result
         */
            comment = function (req, res) {

            if (req.param('data')) {

                var newComment = req.param('data');
                // create comment object
                getDebateById(newComment.debate, function (err, debate) {
                    if (err) {
                        res.json({status: 503, error: err});
                    } else {
                        
                        var comment = {

                            id: newComment.subject + moment().unix(), //_id user + timestamp
                            subject: newComment.subject, //_id user
                            comment: newComment.comment,
                            points: 0,
                            voteParticipants: [],
                            commentTime: moment(newComment.startDate).unix()

                        };
                        // check if user is participant
                        var isValidParticipant = validateParticipant(debate, newComment.subject);
                        // check if user comments before in this turn [MEJORA A HACER]
                        //var commentBefore = checkCommentBefore(debate, newComment.subject);

                        if (isValidParticipant) {

                            if(1 !== debate.status){

                                res.json({status: 503, error: 'debate closed or not complete'});
                            
                            }else{
                            
                                insertComment(debate, comment , function(newDebate){
                                    res.json({status: 200, debate: newDebate});
                                });
                            }

                        } else {
                            res.json({status: 503, error: 'participant not valid'});
                        }
                        
                    }
                });

            } else {
                res.json({status: 503, error: "bad sintaxis"});
            }

        },
        /**
         * debateSignIn user method
         *
         * @method debateSignIn
         * @param {Object} data Argument 1
         * @return {JSON} Returns and JSON object with the result
         */
            debateSignIn = function (req, res) {

            if (req.param('data')) {

                //var data = JSON.parse(req.param('data'));
                var data = req.param('data');
                // create comment object
                getDebateById(data.idDebate, function (err, debate) {
                    if (err) {
                        res.json({status: 503, error: err});
                    } else {
                        
                        var participantTeam = validateParticipantSigned(debate,data.idUsuario);
                        if (participantTeam === 0) { //the users in not sign in
                            getUserById(data.idUsuario, function(user,completeUser){
                                if (1 === data.equipo && user !== undefined && debate.participants.team1.length<debate.participantsNum) {
                                    debate.participants.team1.push(data.idUsuario);
                                    debate.participantsData.team1.push(user);
                                } else if (2 === data.equipo && user !== undefined && debate.participants.team2.length<debate.participantsNum) {
                                    debate.participants.team2.push(data.idUsuario);
                                    debate.participantsData.team2.push(user);
                                } else {
                                    res.json({status: 503, error: 'invalid team or user'});
                                }
                                if(undefined !== completeUser){
                                    if((debate.participantsNum*2) === (debate.participantsData.team1.length + debate.participantsData.team2.length)){
                                       //already completed
                                        debate.status = 1;
                                    }
                                    saveDebate(debate);
                                    //update user with the new debate
                                    completeUser.update({$push: {joinedDebates: debate._id}},function(err){
                                        if(err){
                                            console.log("error",err);
                                        }else{
                                            console.log("no error");
                                        }
                                    });
                                    res.json({status: 200, debate: debate});
                                }else{
                                    res.json({status: 501, error: 'User error'});
                                }

                            });
                        } else {
                            res.json({status: 501, error: 'Participant is already sign in'});
                        }
                    }
                });

            } else {
                res.json({status: 503, error: "bad sintaxis"});
            }

        },
        /**
         * debateSignOut user method
         *
         * @method debateSignOut
         * @param {Object} data Argument 1
         * @return {JSON} Returns and JSON object with the result
         */
            debateSignOut = function (req, res) {
            if (req.param('data')) {

                var data = JSON.parse(req.param('data'));
                // create comment object
                getDebateById(data.idDebate, function (err, debate) {
                    if (err) {
                        res.json({status: 503, error: err});
                    } else {
                        var participantTeam = validateParticipantSigned(debate,data.idUsuario);
                        if (participantTeam === 0) { //the useres in not sign in
                            res.json({status: 503, error: 'Participant is not sign in'});
                        } else {
                            deleteUserFromDebate(debate,data.idUsario, function(err){
                                if(err){
                                    res.json({status: 503, error: err});
                                }else{
                                    res.json({status: 200, debate: debate});
                                }
                            });
                        }
                    }
                });

            } else {
                res.json({status: 503, error: "bad sintaxis"});
            }

        },
        /**
         * voteComment user method
         *
         * @method voteComment to vote the comment of any debate
         * @param {Object} data Argument 1
         * @return {JSON} Returns and JSON object with the result
         */
            voteComment = function (req, res) {

            if (req.param('data')) {

                var data = req.param('data');


                getDebateById(data.idDebate, function (err, debate) {
                    if (null !== err) {
                        res.json({status: 503, error: err});
                    } else {
                        getComment(debate, data.idComentario, function (indexI,indexJ, team) {
                            if (team === 0) {
                                res.json({status: 503, error: 'No comment found'});
                            } else {
                                if (1 === team) {
                                    if(debate.comments.team1[indexI][indexJ].voteParticipants.indexOf(data.idUsuario)===-1){
                                        debate.comments.team1[indexI][indexJ].voteParticipants.push(data.idUsuario);
                                        debate.comments.team1[indexI][indexJ].points += 1;
                                    }else{
                                        res.json({status: 503, error: 'User already vote for this comment'});
                                    }
                                } else {
                                    if(debate.comments.team2[indexI][indexJ].voteParticipants.indexOf(data.idUsuario)===-1){
                                        debate.comments.team2[indexI][indexJ].voteParticipants.push(data.idUsuario);
                                        debate.comments.team2[indexI][indexJ].points += 1;
                                    }else{
                                        res.json({status: 503, error: 'User already vote for this comment'});
                                    }
                                }
                                debate.markModified('comments.team1');
                                debate.markModified('comments.team2');
                                saveDebate(debate);
                                res.json({status: 200, debate: debate});
                            }
                        });
                    }
                });
            }
        },
        /**
         * vetoParticipants user method
         *
         * @method vetoParticipant to veto the participants of any debate
         * @param {Object} data Argument 1
         * @return {JSON} Returns and JSON object with the result
         */
            //idUsuario, idDebate
         vetoParticipant = function (req, res) {

            if (req.param('data')) {
                getDebateById(data.idDebate, function (err, debate) {
                    if (null !== err) {
                        res.json({status: 503, error: err});
                    } else {
                        var participantTeam = validateParticipantSigned(debate,data.idUsuario);
                        if (participantTeam === 0) { //the useres in not sign in
                            res.json({status: 503, error: 'Participant is not sign in'});
                        } else {
                           vetoLogic(debate,data,function(err,newDeb){
                               if(err){
                                   res.json({status: 503, error: err});
                               }else{
                                   saveDebate(newDeb);
                                   res.json({status: 200, debate: debate});
                               }
                           });
                        }
                    }
                });
            }
        },
        /**
         * ejectParticipants user method
         *
         * @method ejectParticipant to eject the participants of any debate
         * @param {Object} data Argument 1
         * @return {JSON} Returns and JSON object with the result
         */
            //idUsuario, idDebate
         ejectParticipant = function (req, res) {

            if (req.param('data')) {
                getDebateById(data.idDebate, function (err, debate) {
                    if (null === err) {
                        res.json({status: 200, debate: debate});
                    } else {
                        var participantTeam = validateParticipantSigned(debate,data.idUsuario);
                        if (participantTeam === 0) { //the useres in not sign in
                            res.json({status: 503, error: 'Participant is not sign in'});
                        } else {
                            deleteUserFromDebate(debate,data.idUsario, function(err){
                                if(err){
                                    res.json({status: 503, error: err});
                                }else{
                                    res.json({status: 200, debate: debate});
                                }
                            });
                        }
                    }
                });
            }
        },
        /**
         * get debate by ID
         */
            getById = function (req, res) {

            if (req.param('data')) {

                var data = req.param('data');
                getDebateById(data.idDebate, function (err, debate) {
                    if (null === err) {
                        res.json({status: 200, debate: debate});
                    } else {
                        res.json({status: 503, error: err});
                    }
                });
            }


        },
        /**
         * get debate by ID
         */
        getDebate = function (req, res) {
            var data = req.param('data');
            if (data) {
                getComplexDebate(data, function (err, debate) {
                    if (err === false) {
                        res.json({status: 200, debate: debate});
                    } else {
                        res.json({status: 503, error: err});
                    }
                });
            }else{
                res.json({status: 401 , error: 'bad parameters'});
            }

        },
        /**
         * get debate by ID
         */
            getAll = function (req, res) {

            DebateModel.list({start: 0, limit: 10, sort: 'subject'}, function (err, count, results) {
                if (err) throw err
                results.forEach(function (row) {
                    console.log('subject: ' + row.subject)
                })
                res.json({ status: 200, debate: results});
            })

        };

    return {
        save: save,
        getById: getById,
        getAll: getAll,
        getDebate: getDebate,
        debateSignIn: debateSignIn,
        debateSignOut: debateSignOut,
        voteComment: voteComment,
        vetoParticipant: vetoParticipant,
        ejectParticipant: ejectParticipant,
        comment: comment
    };

}();


module.exports = debate;

//Helper Functions

/**
 * @function validateParticipant for validate the participant can to comment
 * @param debate Object with the actual debate
 * @param participant the id who wants to comment
 * @returns {Boolean} false: error, true: OK
 */
function validateParticipant(debate, participant) {
    
    var debObject = debate.toObject(); 

    if (-1 !== debObject.participants.team1.indexOf(participant) && -1 === debObject.participantsRejected.indexOf(participant)) {
        if (debObject.turn === 1) {
            return true;
        }
    } else if (-1 !== debObject.participants.team2.indexOf(participant) && -1 === debObject.participantsRejected.indexOf(participant)) {
        if (debObject.turn === 2) {
            return true;
        }
    } else {
        return false;
    }
}


/**
 * @function validateParticipantSigned for validate the participant is already sign in
 * @param debate Object with the actual debate
 * @param participant the id who wants to comment
 * @returns {Integer} 0: false, 1 : tema1, 2 team2
 */
function validateParticipantSigned(debate, participant) {
    var _debate = debate.toObject();
    //se puede validar que este invitado
    var isInteam1 = _debate.participants.team1.indexOf(participant);
    var isInteam2 = _debate.participants.team2.indexOf(participant);


    if(isInteam1 === -1 && isInteam2 === -1){
        return 0; // quiere decir que no participa en ningun equipo
    } else if(isInteam1 !== -1){
        return 1; // participa en equipo1
    }else if(isInteam2 !== -1){
        return 2; //partiipa en equipo2
    }
}

/**
 * @function insertComment insert valid comment
 * @param debate Object with the actual debate
 * @param comment Object with the comment
 */
function insertComment(debate, comment, callback) {
    var turn = debate.turn,
        pos = debate.debatePosition;
    
    if (1 === turn) {
        if(undefined === debate.comments.team1[pos]){
            debate.comments.team1[pos]=[];
        }
        debate.turn = 2;
        debate.comments.team1[debate.debatePosition].push(comment);
    } else {
        if(undefined === debate.comments.team2[pos]){
            debate.comments.team2[pos]=[];
        }
        debate.turn = 1;
        debate.comments.team2[debate.debatePosition].push(comment);
        if (debate.comments.team2[debate.debatePosition].length === debate.participantsNum) { //everybody comment for this turn
            
            // if is the final turn 
            if (13 === debate.debatePosition) { //debate closed because everybody comment for the last turn
                debate.status = 2; //Debate closed
                //TODO call to count points
            } else {
                debate.debatePosition++;
            }
        }
    }

    debate.markModified('comments.team1');
    debate.markModified('comments.team2');
    debate.save();
    callback(debate);
}


/**
 * @function saveDebate basic save debate
 * @param debate Object with the actual debate
 */
function saveDebate(debate) {
    //deberia retornar error si no se pudo guardar y controlarlo en el metodo que lo llama
    debate.save(function(err){
        if(err){
            console.log('ERROR!!!',err);
        }else{
            console.log('todo ok')
        }
    });
}

/**
 * @function getDebateById obtain the debate by id
 * @param debate Object with the actual debate
 * @param callback function
 * @returns {Array} comment array
 */
function getDebateById(id, callback) {

    DebateModel.findOne({'_id': id}, function (err, debate) {

        if (err) {
            if (null === err) {
                err = "Debate no disponible";
            }
            callback(err);
        } else {
            callback(null, debate);
        }

    });

}

/**
 * @function getComplexDebate obtain the array with the comments
 * @param idCategoria if wants to find for category
 * @param pag page number for pagination
 * @param idCategoria if wants to find for category
 * @param callback function
 * @returns {Array} comment array
 */
function getComplexDebate(params, callback) {
    var category = params.idCategoria || 0,
        page  = params.pag | 10,
        skip = params.skip | 0,
        filters = params.filters;
    if(0 === category || undefined === category || null === category){ //all categories
        var query =  DebateModel.find({});
    }else{
        var query =  DebateModel.find({'category': category});
    }

    Object.keys(filters).forEach(function(key) {
        query.where(key,filters[key]);
    });

    query.sort('-createdOn')
        .lean()
        .skip(skip*page)
        .limit(page)
        .exec(function(err, debates) {
            if (!err) {

                callback(false,debates);

            }else{
                callback(err,null);
            }
        });


}

/**
 * @function getComment obtain the comment
 * @param debate Object with the actual debate
 * @param callback function
 * @returns {Array} comment array
 */
function getComment(debate, idComentario, callback) {
    var indexI = 0,
        indexJ = 0,
        team = 0;
    Object.keys(debate.comments.team1).forEach(function(key) {
        for(var i= 0; i< debate.comments.team1[key].length; i++){
            if (idComentario === debate.comments.team1[key][i].id) {
                indexI = key;
                indexJ = i;
                team = 1;
                break;
            }
        }
    });

    if (team === 0) {
        //repito el proceso para el team 2
        Object.keys(debate.comments.team2).forEach(function(key) {
            for(var j= 0; j< debate.comments.team2[key].length; j++){
                if (idComentario === debate.comments.team2[key][j].id) {
                    indexI = key;
                    indexJ = j;
                    team = 2;
                    break;
                }
            }
        });
    }
    callback(indexI,indexJ, team);
}

/**
 * @function getComment obtain the comment
 * @param debate Object with the actual debate
 * @param idUser obectId with the id of the participant
 * @param callback function
 * @returns {Array} comment array
 */
function deleteUserFromDebate(debate, idUser, callback) {
    if (-1 !== debate.participants.team1) {
        debate.participants.team1.splice(idUser, 1);
    } else if(-1 !== debate.participants.team2){
        debate.participants.team2.splice(idUser, 1);
    }else{
        callback("user not found");
    }
    saveDebate(debate);
    callback(null);
}


/**
 * @function vetoLogic veto logic
 * @param debate Object with the actual debate
 * @param idUser obectId with the id of the participant
 * @param callback function
 * @returns {Array} comment array
 */
function vetoLogic(debate, data, callback) {
    if (-1 === debate.participantsRejected.indexOf(data.idUsuario)) { //the user is not in the black list
        debate.voteToReject[data.idUsuario].push(data.idVeto); //count vote to veto
    } else {
        if(-1 === debate.voteToReject[data.idUsuario].indexOf(data.idUsuario)){
            debate.voteToReject[data.idUsuario].push(data.idVeto); //only if the user not vote
        }else{
            var err = 'Participant can not vote twice';
            callback(err);
        }
    }
    if(1 === participantTeam){
        if(debate.voteToReject[data.idUsuario].length === (debate.participants.team1.length - 1)){//everybody vote
            debate.participantsRejected.push(data.idUsuario); //introduce the user in veto
        }
    }else{
        if(debate.voteToReject[data.idUsuario].length === (debate.participants.team2.length - 1)){//everybody vote
            debate.participantsRejected.push(data.idUsuario); //introduce the user in veto
        }
    }
    callback(null,debate);
}



/**
 * @function getUserById obtain the user
 * @param idUser obectId with the id of the participant
 * @param callback function
 * @returns {Object} user object, user Model
 */
function getUserById(idUser, callback) {
    UserController.getUserById_inApp(idUser, function(user){
        if(undefined === user){
            callback(undefined);
        }else{
            callback({_id:user._id,photo:user.photo, username:user.username},user);

        }
    });
}

