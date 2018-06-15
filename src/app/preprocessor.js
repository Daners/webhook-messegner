
let proccesMessage = function(sender_psid, webhook_event,context){
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

  if (webhook_event.message) {
    received_message = webhook_event.message;
    if(received_message.text){
      proccesText(message,received_message);
    }
    if(received_message.attachments){
      proccesAttachment(message,received_message);
    }
  } else if (webhook_event.postback) {
     received_message = webhook_event.postback;
     proccesPostBack(message,received_message);
  }
  if(webhook_event.form_content){
  message.context.form_content = received_message.form_content;
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

exports.proccesMessage = proccesMessage;
