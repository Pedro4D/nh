var express = require('express.io'),
  http = require('http'),
  _ =  require('underscore'),
  path = require('path'),
  routes = require('./routes');


// Start express application
var app = express().http().io();

// all environments
app.set('port', process.env.PORT || 3000);
app.set('views', __dirname + '/views');
app.engine('html', require('ejs').renderFile);
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.cookieParser()); 
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieSession(
  {
    secret: process.env.COOKIE_SECRET || "walangosecuredsession"
  }));
app.use(app.router);
app.use(express.static(path.join(__dirname, 'public')));

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

//==================================================================
// routes
app.get('/',routes.index);

//==================================================================

/*require('./routes/routes')(app);*/

http.createServer(app).listen(app.get('port'), function(){
  console.log('Express server listening on port ' + app.get('port'));
});


// Setup a route for the ready event, and add session data.
app.io.route('ready', function(req) {

    if(null!=req.data && undefined!=req.data){
        req.session.data = req.data;

        console.log("something",req.data);
        req.session.save(function() {
            req.io.broadcast('givePoints',req.session.data);
        });
    }else{
        console.log("nothing");
    }
});

// send the new user their name and a list of users
app.io.emit('init', {
    name: getName()
});

function getName(){
    console.log("GETNAME");
    return "Pedro";
}