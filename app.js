var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const request = require('request');
let processor =  require("./src/app/processor.js");
let dataContext = [];

var index = require('./routes/index');
var users = require('./routes/users');
var config = require('config');
var Interprete = require("interpreter");
const recastai = require('recastai')
var build = new recastai.build(config.get("recastTokenDev"), 'es')
var app = express();
var countHandler = 0;

var interpreter =  new Interprete();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));


// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});


app.use(function(req, res, next) {
  // Website you wish to allow to connect
  res.setHeader('Access-Control-Allow-Origin', "*");
   next();
})
const PAGE_ACCESS_TOKEN = config.get("pageToken");
const VERIFY_TOKEN = config.get("verifyToken");


var idEntry;
// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {
    res.sendStatus(200);

  let body = req.body;
  // Checks this is an event from a page subscription
  if (body.object === 'page') {
    // Iterates over each entry - there may be multiple if batched

    body.entry.forEach(function(entry) {
      //    console.log(  entry.id +" "+idEntry);
      // if(idEntry && idEntry === entry.id){
      //   return true;
      // }
      //
      // idEntry = entry.id
    //  console.log(JSON.stringify(entry));
      // Gets the message. entry.messaging is an array, but
      // will only ever contain one message, so we get index 0
      let webhook_event = entry.messaging[0];
      //console.log(webhook_event);
      // Get the sender PSID
      if(webhook_event.sender){
        let sender_psid = webhook_event.sender.id;
      //  console.log('Sender PSID: ' + sender_psid);
        // Check if the event is a message or postback and
      // pass the event to the appropriate handler function
        // if (webhook_event.message) {
        //   handleMessage(sender_psid, webhook_event.message);
        // } else if (webhook_event.postback) {
        //   handlePostback(sender_psid, webhook_event.postback);
        // }
          countHandler = countHandler +1;
            console.log(new Date());
        handleMessageWatson(sender_psid, webhook_event);
      }
    });
    // Returns a '200 OK' response to all requests
  //  res.status(200).send('EVENT_RECEIVED');

  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }

console.log(new Date());

});


// Adds support for GET requests to our webhook
app.get('/webhook', (req, res) => {

  // Your verify token. Should be a random string.


  // Parse the query params
  let mode = req.query['hub.mode'];
  let token = req.query['hub.verify_token'];
  let challenge = req.query['hub.challenge'];

  // Checks if a token and mode is in the query string of the request
  if (mode && token) {
    // Checks the mode and token sent is correct
    if (mode === 'subscribe' && token === VERIFY_TOKEN) {
      // Responds with the challenge token from the request
      console.log('WEBHOOK_VERIFIED');
      res.status(200).send(challenge);
    } else {
      // Responds with '403 Forbidden' if verify tokens do not match
      res.sendStatus(403);
    }
  }
});


app.get("/pdp",function(req,res){
  res.render('pdp');
});

app.post("/data",function(req,res){

  let psid = req.body.psid;
  //console.log(req.body);

  let webhook_event = {
    form_content:req.body
  }

  handleMessageWatson(psid,webhook_event);

   var   response = { "text": "Gracias, estoy validando tu informacion.." }

    callSendAPI(psid, response);
res.sendStatus(200)
})

app.get('/test-view', function(req, res){
  let referer = req.get('Referer');
  if (referer) {
      if (referer.indexOf('www.messenger.com') >= 0) {
          res.set('X-Frame-Options', 'ALLOW-FROM https-.,www.messenger.com/ ');
          console.log("from : www.messenger.com");
      } else if (referer.indexOf('www.facebook.com') >= 0) {
        console.log("from : www.facebook.com");
          res.set('X-Frame-Options', 'ALLOW-FROM https://www.facebook.com/');
      }
  }
    res.set('Content-Type', 'text/html');
     res.sendFile(path.join(__dirname+'/public/html/view-test'));
});

app.get("/interpreter/:id",(req,res)=>{

  let idFile = req.param('id');
  let referer = req.get('Referer');
  if (referer) {
      if (referer.indexOf('www.messenger.com') >= 0) {
          res.set('X-Frame-Options', 'ALLOW-FROM https-.,www.messenger.com/ ');
          console.log("from : www.messenger.com");
      } else if (referer.indexOf('www.facebook.com') >= 0) {
        console.log("from : www.facebook.com");
          res.set('X-Frame-Options', 'ALLOW-FROM https://www.facebook.com/');
      }
  }
    res.set('Content-Type', 'text/html');
     res.sendFile(path.join(__dirname+'/public/templates/'+idFile));

});
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});
//
// const setDomainWhitelisting = () => {
//   var whitelist = {
//         setting_type: 'domain_whitelisting',
//         whitelisted_domains: ["https://watson-tlmx-messenger.herokuapp.com"],
//         domain_action_type: 'add',
//       };
//
//   var queryparams =  {
//         fields: 'whitelisted_domains',
//       };
//
//      const query = Object.assign({access_token: PAGE_ACCESS_TOKEN}, queryparams);
//
//     request({
//       "uri": "https://graph.facebook.com/v2.6/me/messages",
//       "qs": query,
//       "method": "POST",
//       "json": whitelist
//     }, (err, res, body) => {
//       if (!err) {
//         console.log('message sent!')
//       } else {
//         console.error("Unable to send message:" + err);
//       }
//     });
//
// };
//
//
// setDomainWhitelisting();


function handleMessageWatson(sender_psid, received_message){

  let context = getContext(sender_psid);
  let payload = processor.preProccesMessage(sender_psid,received_message,context);
  if(!context){
      payload.input.text = "";
  }
 //console.log(JSON.stringify(payload));
 setTimeout(function(){  callSendAPI(sender_psid, { "text": "Gracias, estoy validando tu informacion.." }); }, 3000);

  // request({
  //   "uri": "https://telmex-watson-orchestrator-johana.mybluemix.net/api/message",
  //   headers: {
  //     'Origin': 'https://watsonuserinterface-dev-johana.mybluemix.net'
  //   },
  //   "method": "POST",
  //   "json": payload
  // }, (err, res, body) => {
  //   //  console.log(body);
  //   if (!err) {
  //     let response =[];
  //       response = processor.postProccesMessage(body);
  //
  //       for (var i = 0,res; res = response[i++];) {
  //          callSendAPI(sender_psid, res);
  //       }
  //
  //
  //      updateContext(sender_psid,body.context);
  //
  //   } else {
  //     console.error("Unable to send message:" + err);
  //   }
  //
  // });

}


function getContext(sender_psid){
  let context;
  context = dataContext.filter(obj => {
     return obj.sender_psid === sender_psid;
     }).map(obj => {
        return obj.context;
   });
  return context[0];
}


function updateContext(sender_psid,context){
  let data = dataContext.filter(obj => {
     return obj.sender_psid === sender_psid;
     }).map(obj => {
        obj.context = context
        return obj;
   });
   if(data.length == 0){
     dataContext.push({"sender_psid":sender_psid,"context":context});
   }
}
// Handles messages events
function handleMessage(sender_psid, received_message) {
  let response;
    // Check if the message contains text
    console.log(received_message.text);
    if(received_message.text && received_message.text == "test-image"){
      response = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "generic",
            "elements": [{
              "title": "Imagen",
              "image_url": "https://www.loboswiki.com/Imagenes/guia-de-los-lobos.jpg"
            },{
              "title": "Imagen",
              "image_url": "https://www.loboswiki.com/Imagenes/guia-de-los-lobos.jpg"
            }]
          }
        }
      }

      callSendAPI(sender_psid, response);
      return true;

    }
    if(received_message.text && received_message.text == "opg"){
      response = {
          "attachment":{
            "type":"template",
            "payload":{
              "template_type":"open_graph",
              "elements":[
                 {
                  "url":"http://ogp.me/",
                  "buttons":[
                    {
                      "type":"web_url",
                      "url":"http://telmex.com/web/negocios",
                      "title":"Telmex.com"
                    }
                  ]
                }
              ]
            }
          }
        }


      callSendAPI(sender_psid, response);
      return true;

    }
    if(received_message.text && received_message.text == "link"){
      response = {
          "attachment":{
            "type":"template",
            "payload":{
              "template_type":"button",
              "text":"Accesa a la siguiente liga para mas informacion",
              "buttons":[
                {
                  "type":"web_url",
                  "url":"http://telmex.com/web/negocios",
                  "title":"telmex",
                  "webview_height_ratio": "full",
                  "messenger_extensions": "false"
                }
              ]
            }
          }
        }


      callSendAPI(sender_psid, response);
      return true;

    }

    if(received_message.text && received_message.text == "test-video"){
      response ={
        "attachment": {
          "type": "video",
          "payload": {
              "url": "https://www.w3schools.com/html/mov_bbb.mp4"
          }
        }
      }

      callSendAPI(sender_psid, response);
      return true;

    }
    if(received_message.text && received_message.text == "test-list"){

      response = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "generic",
            "elements": [{
              "title": "Es correcta la imagen?",
              "subtitle": "Tap al boton para contestar.",
              "image_url": "https://watson-tlmx-messenger.herokuapp.com/images/imgae1.png",
              "buttons": [
                {
                  "type": "postback",
                  "title": "Si!",
                  "payload": "yes",
                }
              ],
            },
            {
              "title": "Es correcta la imagen 2?",
              "subtitle": "Tap al boton para contestar.",
              "image_url": "https://watson-tlmx-messenger.herokuapp.com/images/imgae2.png",
              "buttons": [
                {
                  "type": "postback",
                  "title": "Contrata",
                  "payload": "contratarlo",
                }
              ],
            }]
          }
        }
      }



      callSendAPI(sender_psid, response);
      return true;
    }
    if(received_message.text && received_message.text == "test-list2"){

      response = {
          "attachment": {
            "type": "template",
            "payload": {
              "template_type": "generic",
              "elements": [{
                    "title":"<TITLE_TEXT>",
                    "image_url":"https://www.w3schools.com/html/mov_bbb.mp4",
                    "subtitle":"<SUBTITLE_TEXT>",
                    "default_action": {
                      "type": "web_url",
                      "url": "https://www.w3schools.com/html/mov_bbb.mp4"
                    }
                  }
              ]
            }
          }
        }



      callSendAPI(sender_psid, response);
      return true;
    }
  if (received_message.text) {
      // Create the payload for a basic text message
      build.dialog({ type: 'text', content: received_message.text}, { conversationId: sender_psid })
        .then(res   => {
          console.log(res);
          if (res.conversation.memory && res.conversation.memory.attachment) {

                var attch = res.conversation.memory.attachment;
                var msg =  res.messages[0];

                  if(attch.instance){
                    console.log("Interprete instance");
                    let channel = "messenger";
                    let urlDispatcher = "https://watson-tlmx-messenger.herokuapp.com/interpreter/";

                    if(urlDispatcher){
                      interpreter.setUrlDispatcher(urlDispatcher);
                    }
                    let body = interpreter.build(attch,channel);
                    console.log(body);
                    if(msg){
                      if(body&&body.attachment.payload.hasOwnProperty("text")){
                        body.attachment.payload.text = msg.content
                      }
                    }
                    console.log(JSON.stringify(body,null,2));
                      callSendAPI(sender_psid, body);
                    return true;

                  }else{

                  attch.channelId = "messenger";
                  attch.urlDispatcher = "https://interpreter-builder.herokuapp.com/interpreter/";


                request({
                  "uri": "https://interpreter-builder.herokuapp.com/interpreter",
                  "method": "POST",
                  "json": attch
                }, (err, res, body) => {
                    console.log(body);
                  if (!err) {
                    if(msg){
                      if(body&&body.attachment.payload.hasOwnProperty("text")){
                        body.attachment.payload.text = msg.content
                      }
                    }
                    console.log(JSON.stringify(body,null,2));
                    callSendAPI(sender_psid, body);
                  } else {
                    console.error("Unable to send message:" + err);
                  }
                });


                return true;
              }
          }

           res.messages.forEach(result => {
             console.log(result);
               if(result.type === "text"){
                 response = {
                   "text": result.content
                 }
               }else if(result.type === "picture"){
                     response = {
                       "attachment":{
                          "type":"template",
                            "payload":{
                              "template_type":"button",
                              "text":"Ahora vamos a perfilarte",
                              "buttons":[
                                {
                                  "type":"web_url",
                                  "url":"https://watson-tlmx-messenger.herokuapp.com/test-view",
                                  "title":"perfilar",
                                  "webview_height_ratio": 'tall',
                                  "messenger_extensions": true
                                }
                                ]
                              }
                              }
                          }
               }

              // console.log(response);

                 callSendAPI(sender_psid, response);

            })
        }).catch(err => {
        console.error('Error while sending message to Recast.AI', err)
      });

  }else if (received_message.attachments) {

    // Gets the URL of the message attachment
    let attachment_url = received_message.attachments[0].payload.url;
    if(received_message.attachments[0].payload.coordinates){
      response = {
           "text": "Gracias, en tu ubicacion contamos con fibra :)"
      }
    }else{
    response = {
      "attachment": {
        "type": "template",
        "payload": {
          "template_type": "generic",
          "elements": [{
            "title": "Es correcta la imagen?",
            "subtitle": "Tap al boton para contestar.",
            "image_url": attachment_url,
            "buttons": [
              {
                "type": "postback",
                "title": "Si!",
                "payload": "yes",
              },
              {
                "type": "postback",
                "title": "No!",
                "payload": "no",
              }
            ],
          }]
        }
      }
    }
  }
        callSendAPI(sender_psid, response);
  }
    // Sends the response message

}

// Handles messaging_postbacks events
function handlePostback(sender_psid, received_postback) {
  let response;

  // Get the payload for the postback
  let payload = received_postback.payload;

  // Set the response based on the postback payload
  if (payload === 'yes') {
    response = { "text": "Gracias!" }
  } else if (payload === 'no') {
    response = { "text": "Prueba con otra imagen." }
  }
  // Send the message to acknowledge the postback
  callSendAPI(sender_psid, response);

}

// Sends response messages via the Send API
function callSendAPI(sender_psid, response) {
  // Construct the message body
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "uri": "https://graph.facebook.com/v2.6/me/messages",
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    if (!err) {
      console.log('message sent!')
    } else {
      console.error("Unable to send message:" + err);
    }
  });
}




module.exports = app;
