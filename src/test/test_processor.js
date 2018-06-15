let processor =  require("./../app/preprocessor.js");

let sender_psid = "123456789"
let coordinates = {
  "message":{
      "attachments": [
             {
               "title": "Facebook HQ",
               "url": "https://www.facebook.com/l.php?u=https%....5-7Ocxrmg",
               "type": "location",
               "payload": {
                 "coordinates": {
                   "lat": 37.483872693672,
                   "long": -122.14900441942
                 }
               }
             }
           ]
         }
  }

  let text = {
    "message":{
      text:"Hola!"
      }
    }

    let postback = {
      "postback":{
        payload:"SI!"
        }
      }

let loadContext = {
  nodes:["uno","dos"],
  communication_context:{}
}


let context = processor.proccesMessage(sender_psid,coordinates);

console.log(JSON.stringify(context,null,2));


context = processor.proccesMessage(sender_psid,coordinates,cloneJson(loadContext));

console.log(JSON.stringify(context,null,2));

context = processor.proccesMessage(sender_psid,text);

console.log(JSON.stringify(context,null,2));

context = processor.proccesMessage(sender_psid,text,cloneJson(loadContext));

console.log(JSON.stringify(context,null,2));

context = processor.proccesMessage(sender_psid,postback);

console.log(JSON.stringify(context,null,2));

function cloneJson(data){
  return JSON.parse(JSON.stringify(data))
}
