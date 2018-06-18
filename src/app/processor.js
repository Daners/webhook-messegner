
var config = require('config');
var Interprete = require("interpreter");
var interpreter =  new Interprete();

let preProccesMessage = function(sender_psid, webhook_event,context){
  let received_message;
  let message ={
    "input": {
      "text": ""
    },
    "context": {}
  };
  if(context){
    message.context = context;
  }

  if(webhook_event.message) {
    received_message = webhook_event.message;
    if(received_message.text){
      proccesText(message,received_message);
    }
    if(received_message.attachments){
      proccesAttachment(message,received_message);
    }
  }else if (webhook_event.postback) {
     received_message = webhook_event.postback;
     proccesPostBack(message,received_message);
  }else if(webhook_event.form_content){
    message.context.form_content = webhook_event.form_content;
  }else{
    return false
  }
  if(sender_psid && !message.context.sender_psid){
    message.context.sender_psid =sender_psid;
  }

  return message;
}


let proccesText =  function(message,received_message){
  message.input.text = received_message.text;
}

let proccesPostBack = function(message,received_message){
  if(received_message.payload){
    message.input.text = received_message.payload;
  }
}

let proccesAttachment = function(message,received_message){
  let attachment = received_message.attachments[0];
    if(attachment.type == "location"){
      let payload = attachment.payload
      if(  payload && payload.coordinates){
        let coordinates =payload.coordinates;
        let location = {
            lat:coordinates.lat,
            lgn:coordinates.long
        };
        if(message.context && !message.context.communication_context){
          message.context.communication_context = {};
        }
          message.context.communication_context.location = location;
      }
    }
}


let postProccesMessage = function(body){
  let response = [];
  if(body){
    let output = body.output;
    let channel = body.context.channel||"messenger";
    let urlDispatcher=body.context.urlDispatcher||config.get("url_dispatcher")||"";
    if(urlDispatcher){
      interpreter.setUrlDispatcher(urlDispatcher);
    }
    if(output && output.attachment){
      let attch;
      attch = interpreter.build(body.output.attachment,channel);
      if(attch.attachment && attch.attachment.payload){
        if( attch.attachment.payload.hasOwnProperty("text")){
          attch.attachment.payload.text = output.text.join(" ");
        }else if (output.text){
          let text = { "text": body.output.text.join("")}
          response.push(text);
        }
          response.push(attch);
      }
    }else if (output && output.text){
      let attch= { "text": body.output.text.join("")}
      response.push(attch);
    }
  }
  return response;
}

exports.postProccesMessage = postProccesMessage;
exports.preProccesMessage = preProccesMessage;
