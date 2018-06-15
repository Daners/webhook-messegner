const request = require('request');
let message ={
  "input": {
    "text": ""
  },
  "context": {}
};
request({
  "uri": "https://telmex-watson-orchestrator-johana.mybluemix.net/api/message",
  headers: {
    'Origin': 'https://watsonuserinterface-dev-johana.mybluemix.net'
  },
  "method": "POST",
  "json": message
}, (err, res, body) => {
    console.log(JSON.stringify(body.context,null,2));
  // if (!err) {
  //   var   response = { "text": body.output.text.join(" ")}
  //    callSendAPI(sender_psid, response);
  //    updateContext(sender_psid,body.context);
  // } else {
  //   console.error("Unable to send message:" + err);
  // }
});
