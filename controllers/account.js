/**
* Router account
*/
const 
	accountLib = require( '../lib/account' );

var account = function(){
	/**
	* Save user method
	*/
	var UserModel = require('../model/user'),
		save = function(req,res){

			//idfacebook	device_id
			var newUser = JSON.parse(req.param('usr'));
			// TODO checkear estos dos parámetros contra la BBDD
			// Si el usuario existe devolver un token
			res.json(newUser);
			var newUserModel = new User();  

		},
		/**
		* Deactivate user method
		*/
		deactivate = function(req,res){

		};

	return {
		save : save,
		deactivate : deactivate
	};

}();


module.exports = account;
