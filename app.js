var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
const request = require('request');
let processor =  require("./src/app/preprocessor.js");
let dataContext = [];

var index = require('./routes/index');
var users = require('./routes/users');
var config = require('config');
var Interprete = require("interpreter");
const recastai = require('recastai')
var build = new recastai.build(config.get("recastTokenDev"), 'es')
var app = express();

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



// Creates the endpoint for our webhook
app.post('/webhook', (req, res) => {

  let body = req.body;
  // Checks this is an event from a page subscription
  if (body.object === 'page') {
    // Iterates over each entry - there may be multiple if batched
    body.entry.forEach(function(entry) {
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

        handleMessageWatson(sender_psid, webhook_event);
      }
    });
    // Returns a '200 OK' response to all requests
    res.status(200).send('EVENT_RECEIVED');
  } else {
    // Returns a '404 Not Found' if event is not from a page subscription
    res.sendStatus(404);
  }
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
  console.log(req.body);

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
  let payload = processor.proccesMessage(sender_psid,received_message,context);
 console.log(JSON.stringify(payload));
  request({
    "uri": "https://telmex-watson-orchestrator-johana.mybluemix.net/api/message",
    headers: {
      'Origin': 'https://watsonuserinterface-dev-johana.mybluemix.net'
    },
    "method": "POST",
    "json": payload
  }, (err, res, body) => {
    //  console.log(body);
    if (!err) {
      let response ;
      console.log(JSON.stringify(body,null,2));
      if(body.output.attachment){
           let channel = "messenger";
          let urlDispatcher = "https://watson-tlmx-messenger.herokuapp.com/interpreter/";

          if(urlDispatcher){
            interpreter.setUrlDispatcher(urlDispatcher);
          }
          response = interpreter.build(attch,channel);

          if(response.attachment){
            response.attachment.payload.text = body.output.text.join(" ")
          }
      }else{
        let textToSend = body.output.text.join("");
        textToSend = textToSend.toLowerCase() ==="hola"?"":textToSend
          response = { "text": textToSend}
      }

       callSendAPI(sender_psid, response);
       updateContext(sender_psid,body.context);

    } else {
      console.error("Unable to send message:" + err);
    }
  });

}


function getContext(sender_psid){
  let context;
  context = dataContext.filter(obj => {
     return obj.sender_psid === sender_psid;
     }).map(obj => {
        return obj.context;
   });
   if(!context[0]){
     context = {
  "conversation_id": "c8c1d288-bd78-4d01-9f50-fead5a9b3a31",
  "system": {
    "dialog_stack": [
      {
        "dialog_node": "node_1_1506965509096"
      }
    ],
    "dialog_turn_counter": 1,
    "dialog_request_counter": 1,
    "_node_output_map": {
      "node_1_1512579898703": [
        0
      ]
    }
  },
  "this_workspace": "nc",
  "cambio_workspace": {
    "dummy": null
  },
  "servicios_disponibles": [
    {
      "tipo": "residencial",
      "activo": false,
      "nombre": "Paquete 289",
      "precio": 289,
      "inferior": null,
      "internet": {
        "subida": 256,
        "velocidad": 3
      },
      "superior": "Paquete 389",
      "telefono": {
        "lineas": 1,
        "celular": 200,
        "locales": 100
      },
      "info_mail": "El Paquete289 incluye hasta 3 Megas de velocidad, 100 llamadas locales y tarifas promocionales de larga distancia. Además, disfrutarás un mes de Claro video SIN COSTO y mucho más.",
      "beneficios": "Con el Paquete 289 navegas con hasta 3Mbps, puedes hacer hasta 100 llamadas locales sin límite de tiempo, obtienes tarifas preferenciales en larga distancia internacional, disfrutas las mejores series y películas con Claro video SIN COSTO por un mes, proteges hasta tres computadoras con Antivirus McAfee, obtienes Infinitum Mail y navegas en miles de sitios Wifi móvil en todo el país SIN COSTO.",
      "tecnologia": 1,
      "descripcion": "El Paquete 289 incluye hasta 3 Megas de velocidad, 100 llamadas locales y tarifas promocionales de larga distancia. Además, disfrutas un mes de Claro video SIN COSTO y mucho más."
    },
    {
      "tipo": "residencial",
      "activo": false,
      "nombre": "Paquete 333",
      "precio": 333,
      "inferior": 289,
      "internet": {
        "subida": 640,
        "velocidad": 3
      },
      "superior": "Paquete 389",
      "telefono": {
        "lineas": 1,
        "celular": 200,
        "locales": 100
      },
      "info_mail": "El Paquete 333 incluye hasta 5 Megas de velocidad, 100 llamadas locales y tarifas promocionales de larga distancia. Además, disfrutarás un mes de Claro video SIN COSTO.",
      "beneficios": "Con el Paquete 333 navegas con hasta 5Mbps, puedes realizar 100 llamadas locales sin límite de tiempo, obtienes tarifas preferenciales de larga distancia internacional, disfrutas las mejores series y películas con Claro video sin costo por un mes, proteges hasta tres computadoras con Antivirus McAfee, obtienes Infinitum Mail y navegas en miles de sitios Wifi móvil en todo el país SIN COSTO.",
      "tecnologia": 1,
      "descripcion": "El Paquete 333 incluye hasta 5 Megas de velocidad, 100 llamadas locales y tarifas promocionales de larga distancia. Además, disfrutas un mes de Claro video SIN COSTO."
    },
    {
      "tipo": "residencial",
      "activo": true,
      "nombre": "Paquete 389",
      "precio": 389,
      "inferior": null,
      "internet": {
        "subida": 640,
        "velocidad": 10
      },
      "superior": "Paquete 499",
      "telefono": {
        "lineas": 1,
        "celular": 200,
        "locales": 100
      },
      "info_mail": "El Paquete 389 incluye hasta 10 Megas de velocidad, 100 llamadas locales sin límite de tiempo, 200 minutos a celular, minutos ilimitados de larga distancia mundial y cinco servicios digitales. Además, disfrutas Claro video SIN COSTO",
      "beneficios": "Con el Paquete 389 navegas con hasta 10Mbps, puedes hacer 100 llamadas locales sin límite de tiempo, tienes 200 minutos a celular, minutos ilimitados de larga distancia mundial, 5 servicios digitales, Claro video SIN COSTO, protección hasta para tres computadoras con Antivirus McAfee, además, Infinitum Mail y acceso a miles de sitios Wifi móvil SIN COSTO.",
      "tecnologia": 1,
      "descripcion": "El Paquete 389 incluye hasta 10 Megas de velocidad, 100 llamadas locales, 200 minutos a celular, minutos ilimitados de larga distancia mundial y 5 servicios digitales. Además, disfrutas Claro video SIN COSTO."
    },
    {
      "tipo": "residencial",
      "activo": true,
      "nombre": "Paquete 499",
      "precio": 499,
      "inferior": "Paquete 389",
      "internet": {
        "subida": 768,
        "velocidad": 20
      },
      "superior": "Paquete 599",
      "telefono": {
        "lineas": 1,
        "celular": 200,
        "locales": 100
      },
      "info_mail": "El Paquete 499 incluye hasta 20 Megas de velocidad, 100 llamadas locales sin límite de tiempo, 200 minutos a celular, minutos ilimitados de larga distancia mundial y cinco servicios digitales. Además, disfrutas Claro video SIN COSTO.",
      "beneficios": "El Paquete 499 te permite navegar con hasta 20Mbps, realizar 100 llamadas locales sin límite de tiempo, tienes 200 minutos a celular y minutos ilimitados de larga distancia mundial, incluye 5 servicios digitales. Además puedes disfrutar SIN COSTO de Claro video, protección con Antivirus McAfee, Infinitum Mail y acceso a miles de sitios Wifi.",
      "tecnologia": 2,
      "descripcion": "El Paquete 499 incluye hasta 20 Megas de velocidad, 100 llamadas locales, 200 minutos a celular, minutos ilimitados de larga distancia mundial y 5 servicios digitales. Además, disfrutas Claro video SIN COSTO."
    },
    {
      "tipo": "residencial",
      "activo": true,
      "nombre": "Paquete 599",
      "precio": 599,
      "inferior": "Paquete 499",
      "internet": {
        "subida": 768,
        "velocidad": 40
      },
      "superior": "Paquete 999",
      "telefono": {
        "lineas": 1,
        "celular": "ilimitado",
        "locales": "ilimitado"
      },
      "info_mail": "El Paquete 599 incluye hasta 40 Megas de velocidad, llamadas locales ilimitadas, minutos ilimitados a celular y de larga distancia mundial, así como cinco servicios digitales y Claro video SIN COSTO.",
      "beneficios": "El Paquete 599 te permite navegar con hasta 40Mbps, realizar llamadas locales ilimitadas, tienes minutos ilimitados a celular y de larga distancia mundial, además, 5 servicios digitales. También disfrutas de de Claro video, protección con Antivirus McAfee para hasta tres computadoras, Infinitum Mail y Wifi móvil en Infinitum SIN COSTO.",
      "tecnologia": 2,
      "descripcion": "El Paquete 599 incluye hasta 40 Megas de velocidad, llamadas locales, minutos a celular y de larga distancia mundial ilimitados, así como 5 servicios digitales y Claro video SIN COSTO."
    },
    {
      "tipo": "residencial",
      "activo": true,
      "nombre": "Paquete 999",
      "precio": 999,
      "inferior": "Paquete 599",
      "internet": {
        "subida": 768,
        "velocidad": 100
      },
      "superior": "Paquete 1499",
      "telefono": {
        "lineas": 1,
        "celular": "ilimitado",
        "locales": "ilimitado"
      },
      "info_mail": "El Paquete 999 incluye hasta 100 Megas de velocidad, llamadas locales ilimitadas, minutos ilimitados a celular y de larga distancia mundial, así como cinco servicios digitales y Claro video SIN COSTO.",
      "beneficios": "El paquete 999 te permite navegar con hasta 100 megas, hacer llamadas locales ilimitadas, con minutos ilimitados a celular y larga distancia mundial, además, 5 servicios digitales. También tienes conexión gratis a internet en miles de sitios públicos con WiFi Móvil, infinitum Mail, Antivirus Intel Security hasta para tres equipos y Claro video SIN COSTO.",
      "tecnologia": 3,
      "descripcion": "El Paquete 999 incluye hasta 100 Megas de velocidad, llamadas locales, minutos a celular y de larga distancia mundial ilimitados, así como 5 servicios digitales y Claro video SIN COSTO."
    },
    {
      "tipo": "residencial",
      "activo": true,
      "nombre": "Paquete 1499",
      "precio": 1499,
      "inferior": "Paquete 999",
      "internet": {
        "subida": 768,
        "velocidad": 200
      },
      "superior": null,
      "telefono": {
        "lineas": 1,
        "celular": "ilimitado",
        "locales": "ilimitado"
      },
      "info_mail": "El Paquete 1499 incluye hasta 200 Megas de velocidad, llamadas locales ilimitadas, minutos ilimitados a celular y de larga distancia mundial, así como cinco servicios digitales y Claro video SIN COSTO.",
      "beneficios": "El Paquete 1499 te permite navegar con hasta 200 megas, hacer llamadas locales ilimitadas, con minutos ilimitados a celular y de larga distancia mundial. También tienes conexión gratis a internet en miles de sitios públicos con WiFi Móvil, infinitum Mail, Antivirus Intel Security hasta para tres equipos y Claro video SIN COSTO.",
      "tecnologia": 3,
      "descripcion": "El Paquete 1499 incluye hasta 200 Megas de velocidad, llamadas locales, minutos a celular y de larga distancia mundial ilimitados, así como 5 servicios digitales y Claro video SIN COSTO."
    },
    {
      "tipo": "comercial",
      "activo": true,
      "nombre": "Paquete 399",
      "precio": 399,
      "inferior": null,
      "internet": {
        "subida": 640,
        "velocidad": 10
      },
      "superior": "Paquete 549",
      "telefono": {
        "lineas": 1,
        "celular": "ilimitado",
        "locales": 100
      },
      "info_mail": "El Paquete 399 incluye hasta 10 Mbps, 100 llamadas locales, minutos a celular, LADA Internacional y Mundial ilimitados. Además, servicios Cloud como Seguridad Internet, Respaldo de información, Correo Negocio, Página Web, Aspel Facture y Servidor Virtual de hasta 1 GB.",
      "beneficios": "Con un Paquete 399 negocio navegas con hasta 10 megas, incluye tarifa preferencial en Larga Distancia mundial, seguridad en internet, almacenamiento en línea de 10GB, una cuenta de correo electrónico con el nombre de tu negocio, solución de factura electrónica de Telmex. Además, Claro video y publicidad en Seccionamarilla.com SIN COSTO.",
      "tecnologia": 1,
      "descripcion": "El Paquete 399 incluye hasta 10 Mbps, 100 llamadas locales, minutos a celular, LADA Internacional y Mundial ilimitados. Además, servicios Cloud: Respaldo de información, Correo Negocio, Página Web, Aspel Facture y mucho más.",
      "servicios_adicionales": {
        "pagina_web": {
          "nombre": "Página Web",
          "precio": 99
        },
        "correo_negocio": {
          "nombre": "Correo Negocio",
          "precio": 0
        },
        "factura_basica": {
          "cfdis": 100,
          "nombre": "Factura Electrónica Básica",
          "precio": 0,
          "aspel_facture": false
        },
        "servidor_virtual": {
          "nombre": "Servidor Virtual",
          "precio": 199,
          "almacenamiento": 1
        },
        "seguridad_internet": {
          "nombre": "Seguridad Internet",
          "precio": 0
        },
        "respaldo_informacion": {
          "nombre": "Respaldo de Información",
          "precio": 0
        }
      }
    },
    {
      "tipo": "comercial",
      "activo": true,
      "nombre": "Paquete 549",
      "precio": 549,
      "inferior": "Paquete 399",
      "internet": {
        "subida": 640,
        "velocidad": 30
      },
      "superior": "Paquete 799",
      "telefono": {
        "lineas": 1,
        "celular": "ilimitado",
        "locales": "ilimitado"
      },
      "info_mail": "El Paquete 549 incluye hasta 30 Mbps, llamadas locales ilimitadas, minutos a celular, LADA Internacional y Mundial ilimitados. Además, servicios Cloud como Seguridad Internet, Respaldo de información, Correo Negocio, Página Web, Aspel Facture y Servidor Virtual de hasta 2 GB.",
      "beneficios": "El Paquete 549 negocio te permite navegar con hasta 30 megas, adicionalmente incluye seguridad en internet, almacenamiento en línea de 10GB, una cuenta de correo electrónico con el nombre de tu negocio, solución de factura electrónica de Telmex, tarifa preferencial de $99 en tu página de Iinternet con tu dominio, almacena tus archivos y aplicaciones de forma segura en la nube. Además de Claro video y publicidad en Seccionamarilla.com SIN COSTO.",
      "tecnologia": 2,
      "descripcion": "El Paquete 549 incluye hasta 30 Mbps, llamadas locales ilimitadas, minutos a celular, LADA Internacional y Mundial ilimitados. Además, servicios Cloud: Respaldo de información, Correo Negocio, Página Web, Aspel Facture y mucho más.",
      "servicios_adicionales": {
        "pagina_web": {
          "nombre": "Página Web",
          "precio": 79
        },
        "correo_negocio": {
          "nombre": "Correo Negocio",
          "precio": 0
        },
        "factura_basica": {
          "cfdis": 100,
          "nombre": "Factura Electrónica Básica",
          "precio": 0,
          "aspel_facture": false
        },
        "servidor_virtual": {
          "nombre": "Servidor Virtual",
          "precio": 289,
          "almacenamiento": 2
        },
        "seguridad_internet": {
          "nombre": "Seguridad Internet",
          "precio": 0
        },
        "respaldo_informacion": {
          "nombre": "Respaldo de Información",
          "precio": 0
        }
      }
    },
    {
      "tipo": "comercial",
      "activo": true,
      "nombre": "Paquete 799",
      "precio": 799,
      "inferior": "Paquete 549",
      "internet": {
        "subida": 640,
        "velocidad": 50
      },
      "superior": "Paquete 1499",
      "telefono": {
        "lineas": 1,
        "celular": "ilimitado",
        "locales": "ilimitado"
      },
      "info_mail": "El Paquete 799 incluye hasta 50 Mbps, llamadas locales ilimitadas, minutos a celular, LADA Internacional y Mundial ilimitados. Además, servicios Cloud como Seguridad Internet, Respaldo de información, Correo Negocio, Página Web, Aspel Facture y Servidor Virtual de hasta 4 GB.",
      "beneficios": "Con un Paquete 799 negocio navegas con hasta 50 megas, incluye seguridad en internet para tu equipo, almacenamiento en línea de 10GB, una cuenta de correo electrónico con el nombre de tu negocio, solución de factura electrónica, página de internet con tu dominio y herramientas en la nube. Además de Claro video SIN COSTO, publicidad en Seccionamarilla.com",
      "tecnologia": 3,
      "descripcion": "El Paquete 799 incluye hasta 50 Mbps, llamadas locales, minutos a celular, LADA Internacional y Mundial ilimitados. Además, servicios Cloud: Respaldo de información, Correo Negocio, Página Web, Aspel Facture y mucho más.",
      "servicios_adicionales": {
        "pagina_web": {
          "nombre": "Página Web",
          "precio": 0
        },
        "correo_negocio": {
          "nombre": "Correo Negocio",
          "precio": 0
        },
        "factura_basica": {
          "cfdis": 100,
          "nombre": "Factura Electrónica Básica",
          "precio": 0,
          "aspel_facture": false
        },
        "servidor_virtual": {
          "nombre": "Servidor Virtual",
          "precio": 399,
          "almacenamiento": 4
        },
        "seguridad_internet": {
          "nombre": "Seguridad Internet",
          "precio": 0
        },
        "respaldo_informacion": {
          "nombre": "Respaldo de Información",
          "precio": 0
        }
      }
    },
    {
      "tipo": "comercial",
      "activo": true,
      "nombre": "Paquete 1499",
      "precio": 1499,
      "inferior": "Paquete 799",
      "internet": {
        "subida": 640,
        "velocidad": 100
      },
      "superior": "Paquete 1789",
      "telefono": {
        "lineas": 2,
        "celular": "ilimitado",
        "locales": "ilimitado"
      },
      "info_mail": "El Paquete 1499 incluye hasta 100 Mbps, llamadas locales ilimitadas, minutos a celular, LADA Internacional y LADA Mundial ilimitados. Además, servicios Cloud como Seguridad Internet, Respaldo de información, Correo Negocio, Página Web, Aspel Facture y Servidor Virtual de hasta 4 GB.",
      "beneficios": "El Paquete 1499 te permite navegar con hasta 100 megas, tienes acceso a un crédito para equipar tu negocio o liquidez cuando lo necesites, un anuncio en secciónamarilla.com, dos líneas telefónicas y servicios que harán crecer tu negocio como: Página Web,  Solución de factura electrónica Aspel Facture, una cuenta de correo con el nombre de tu negocio, almacenamiento en línea de 10 GB y un servidor virtual para que almacenes información en la nube, entre muchos otros beneficios.",
      "tecnologia": 3,
      "descripcion": "El Paquete 1499 incluye hasta 100 Mbps, llamadas locales, minutos a celular, LADA Internacional y LADA Mundial ilimitados. Además, servicios Cloud: Respaldo de información, Correo Negocio, Página Web, Aspel Facture y mucho más.",
      "servicios_adicionales": {
        "pagina_web": {
          "nombre": "Página Web",
          "precio": 0
        },
        "correo_negocio": {
          "nombre": "Correo Negocio",
          "precio": 0
        },
        "factura_basica": {
          "cfdis": 0,
          "nombre": "Factura Electrónica Básica",
          "precio": 0,
          "aspel_facture": true
        },
        "servidor_virtual": {
          "nombre": "Servidor Virtual",
          "precio": 0,
          "almacenamiento": 4
        },
        "seguridad_internet": {
          "nombre": "Seguridad Internet",
          "precio": 0
        },
        "respaldo_informacion": {
          "nombre": "Respaldo de Información",
          "precio": 0
        }
      }
    },
    {
      "tipo": "comercial",
      "activo": true,
      "nombre": "Paquete 1789",
      "precio": 1789,
      "inferior": "Paquete 1499",
      "internet": {
        "subida": 640,
        "velocidad": 150
      },
      "superior": "Paquete 2289",
      "telefono": {
        "lineas": 4,
        "celular": "ilimitado",
        "locales": "ilimitado"
      },
      "info_mail": "El Paquete 1789 incluye hasta 150 Mbps, llamadas locales ilimitadas, minutos a celular, LADA Internacional y Mundial ilimitados y cuatro líneas. Además, servicios Cloud como Seguridad Internet, Respaldo de información, Correo Negocio, Página Web, Aspel Facture y Servidor Virtual de hasta 4GB.",
      "beneficios": "El Paquete 1789 te permite navegar con hasta 150 megas, tienes acceso a un crédito para equipar tu negocio o liquidez cuando lo necesites, un anuncio en secciónamarilla.com, cuatro líneas telefónicas, y servicios que harán crecer tu negocio como: Página Web, Solución de factura electrónica Aspel Facture, una cuenta de correo con el nombre de tu negocio, almacenamiento en línea de 10 GB y un servidor virtual para que almacenes tu información en la nube, entre muchos otros beneficios.",
      "tecnologia": 3,
      "descripcion": "El Paquete 1789 incluye hasta 150 Mbps, llamadas locales, minutos a celular, LADA Internacional y Mundial ilimitados y 4 líneas. Además, servicios Cloud: Respaldo de información, Correo Negocio, Página Web, Aspel Facture y mucho más.",
      "servicios_adicionales": {
        "pagina_web": {
          "nombre": "Página Web",
          "precio": 0
        },
        "correo_negocio": {
          "nombre": "Correo Negocio",
          "precio": 0
        },
        "factura_basica": {
          "cfdis": 0,
          "nombre": "Factura Electrónica Básica",
          "precio": 0,
          "aspel_facture": true
        },
        "servidor_virtual": {
          "nombre": "Servidor Virtual",
          "precio": 0,
          "almacenamiento": 4
        },
        "seguridad_internet": {
          "nombre": "Seguridad Internet",
          "precio": 0
        },
        "respaldo_informacion": {
          "nombre": "Respaldo de Información",
          "precio": 0
        }
      }
    },
    {
      "tipo": "comercial",
      "activo": true,
      "nombre": "Paquete 2289",
      "precio": 2289,
      "inferior": "Paquete 1789",
      "internet": {
        "subida": 640,
        "velocidad": 200
      },
      "superior": null,
      "telefono": {
        "lineas": 6,
        "celular": "ilimitado",
        "locales": "ilimitado"
      },
      "info_mail": "El paquete 2289 incluye hasta 200 Mbps, llamadas locales ilimitadas, minutos a celular, LADA Internacional y Mundial ilimitados. Además, seis líneas y servicios Cloud como Seguridad Internet, Respaldo de información, Correo Negocio, Página Web, Aspel Facture y Servidor Virtual de hasta 4GB.",
      "beneficios": "El Paquete 2289 te permite navegar con hasta 200 megas, te brinda crédito para equipar tu negocio o liquidez cuando lo necesites, un anuncio en secciónamarilla.com, 6 líneas telefónicas y servicios que harán crecer tu negocio como: Página Web, solución de factura electrónica Aspel Facture, una cuenta de correo con el nombre de tu negocio,almacenamiento en línea de 10 GB y un servidor virtual para que almacenes tus información de en la nube, entre muchos otros beneficios.",
      "tecnologia": 3,
      "descripcion": "El paquete 2289 incluye hasta 200 Mbps, llamadas locales, minutos a celular, LADA Internacional y Mundial ilimitados. Además, 6 líneas y servicios Cloud: Respaldo de información, Correo Negocio, Página Web, Aspel Facture y mucho más.",
      "servicios_adicionales": {
        "pagina_web": {
          "nombre": "Página Web",
          "precio": 0
        },
        "correo_negocio": {
          "nombre": "Correo Negocio",
          "precio": 0
        },
        "factura_basica": {
          "cfdis": 0,
          "nombre": "Factura Electrónica Básica",
          "precio": 0,
          "aspel_facture": true
        },
        "servidor_virtual": {
          "nombre": "Servidor Virtual",
          "precio": 0,
          "almacenamiento": 4
        },
        "seguridad_internet": {
          "nombre": "Seguridad Internet",
          "precio": 0
        },
        "respaldo_informacion": {
          "nombre": "Respaldo de Información",
          "precio": 0
        }
      }
    },
    {
      "tipo": "residencial",
      "activo": true,
      "nombre": "Solo infinitum sin voz 349",
      "precio": 349,
      "inferior": null,
      "internet": {
        "subida": 640,
        "velocidad": 10
      },
      "superior": "Solo infinitum sin voz 499",
      "telefono": {
        "lineas": null,
        "celular": null,
        "locales": null
      },
      "info_mail": "Infinitum sin voz 349 incluye hasta 10 megas de velocidad, Claro video SIN COSTO y Antivirus de Intel Security.",
      "beneficios": "Con Infinitum sin voz 349 residencial podrás navegar con hasta 10 megas de Infinitum, conectarte gratis a internet en miles de sitios públicos con Wifi Móvil en Infinitum, proteger tu computadora de virus con Suite de Seguridad Infinitum y mantenerte siempre conectado con Infinitum Mail.",
      "tecnologia": 1,
      "descripcion": "Infinitum sin voz 349 incluye hasta 10 megas de velocidad, Claro video SIN COSTO y Antivirus de Intel Security."
    },
    {
      "tipo": "residencial",
      "activo": true,
      "nombre": "Solo infinitum sin voz 499",
      "precio": 499,
      "inferior": "Solo infinitum sin voz 349",
      "internet": {
        "subida": 768,
        "velocidad": 20
      },
      "superior": "Solo infinitum sin voz 649",
      "telefono": {
        "lineas": null,
        "celular": null,
        "locales": null
      },
      "info_mail": "Infinitum sin voz 499 incluye hasta 20 megas de velocidad, Claro video SIN COSTO y Antivirus de Intel Security.",
      "beneficios": "Con Infinitum sin voz 499 residencial podrás navegar con hasta 20 megas de Infinitum, conectarte gratis a internet en miles de sitios públicos Wifi Móvil, proteger tu computadora de virus con Suite de Seguridad Infinitum y mantenerte siempre en conectado con Infinitum Mail.",
      "tecnologia": 1,
      "descripcion": "Infinitum sin voz 499 incluye hasta 20 megas de velocidad, Claro video SIN COSTO y Antivirus de Intel Security."
    },
    {
      "tipo": "residencial",
      "activo": true,
      "nombre": "Solo infinitum sin voz 649",
      "precio": 649,
      "inferior": "Solo infinitum sin voz 499",
      "internet": {
        "subida": 768,
        "velocidad": 50
      },
      "superior": "Solo infinitum sin voz 899",
      "telefono": {
        "lineas": null,
        "celular": null,
        "locales": null
      },
      "info_mail": "Infinitum sin voz 649 incluye hasta 50 megas de velocidad, Claro video SIN COSTO y Antivirus de Intel Security.",
      "beneficios": "Con Infinitum sin voz 649 residencial podrás navegar con hasta 50 megas de Infinitum, conectarte gratis a internet en miles de sitios públicos Wifi Móvil en Infinitum, proteger tu computadora de virus con Suite de Seguridad Infinitum y mantenerte siempre en conectado con Infinitum Mail.",
      "tecnologia": 1,
      "descripcion": "Infinitum sin voz 649 incluye hasta 50 megas de velocidad, Claro video SIN COSTO y Antivirus de Intel Security."
    },
    {
      "tipo": "residencial",
      "activo": true,
      "nombre": "Solo infinitum sin voz 899",
      "precio": 899,
      "inferior": "Solo infinitum sin voz 649",
      "internet": {
        "subida": 768,
        "velocidad": 100
      },
      "superior": null,
      "telefono": {
        "lineas": null,
        "celular": null,
        "locales": null
      },
      "info_mail": "Infinitum sin voz 899 incluye hasta 100 megas de velocidad, Claro video SIN COSTO y Antivirus de Intel Security.",
      "beneficios": "Con Infinitum sin voz 899 residencial navegas con hasta 100 megas de Infinitum, podrás conectarte gratis a internet en miles de sitios públicos Wifi Móvil, proteger tu computadora de virus con Suite de Seguridad Infinitum y mantenerte siempre en conectado con Infinitum Mail.",
      "tecnologia": 3,
      "descripcion": "Infinitum sin voz 899 incluye hasta 100 megas de velocidad, Claro video SIN COSTO y Antivirus de Intel Security."
    },
    {
      "tipo": "comercial",
      "activo": false,
      "nombre": "Infinitum Puro 399",
      "precio": 399,
      "inferior": null,
      "internet": {
        "subida": 640,
        "velocidad": 10
      },
      "superior": "Infinitum Puro 549",
      "telefono": {
        "lineas": null,
        "celular": null,
        "locales": null
      },
      "info_mail": "Infinitum Puro 399 incluye hasta 10 Mbps de velocidad, tres Licencias de Suite de Seguridad Internet y 10 cuentas de correo ",
      "beneficios": "Los beneficios de Infinitum Puro 399 son: conexión de hasta 10 Megas, tres Licencias de Suite de Seguridad  Internet, 10 Cuentas Correo  y conexión gratis en miles de sitios públicos WiFi Móvil.",
      "tecnologia": 1,
      "descripcion": "Infinitum Puro 399 incluye hasta 10 Mbps de velocidad, 3 Licencias de Suite de Seguridad Internet y 10 cuentas de correo "
    },
    {
      "tipo": "comercial",
      "activo": false,
      "nombre": "Infinitum Puro 549",
      "precio": 549,
      "inferior": "Infinitum Puro 399",
      "internet": {
        "subida": 640,
        "velocidad": 20
      },
      "superior": "Infinitum Puro 899",
      "telefono": {
        "lineas": null,
        "celular": null,
        "locales": null
      },
      "info_mail": "Infinitum Puro 549 incluye hasta 20 Mbps de velocidad, tres Licencias de Suite de Seguridad Internet, 10 cuentas de correo ",
      "beneficios": "Los beneficios de Infinitum Puro 549 son: conexión de hasta 20 Megas, tres Licencias de Suite de Seguridad  Internet, 10 Cuentas Correo  y conexión gratis en miles de sitios públicos con WiFi Móvil.",
      "tecnologia": 1,
      "descripcion": "Infinitum Puro 549 incluye hasta 20 Mbps de velocidad, 3 Licencias de Suite de Seguridad Internet, 10 cuentas de correo "
    },
    {
      "tipo": "comercial",
      "activo": false,
      "nombre": "Infinitum Puro 899",
      "precio": 899,
      "inferior": "Infinitum Puro 549",
      "internet": {
        "subida": 640,
        "velocidad": 50
      },
      "superior": null,
      "telefono": {
        "lineas": null,
        "celular": null,
        "locales": null
      },
      "info_mail": "Infinitum puro 899 incluye hasta 50 Mbps de velocidad, tres Licencias de Suite de Seguridad Internet, 10 cuentas de correo ",
      "beneficios": "Los beneficios de Infinitum Puro 899 son: conexión de hasta 50 Megas, tres Licencias de Suite de Seguridad  Internet, 10 Cuentas Correo  y conexión gratis en miles de sitios públicos con WiFi Móvil.",
      "tecnologia": 1,
      "descripcion": "Infinitum puro 899 incluye hasta 50 Mbps de velocidad, 3 Licencias de Suite de Seguridad Internet, 10 cuentas de correo "
    },
    {
      "tipo": "residencial",
      "activo": true,
      "nombre": "Línea telefónica residencial",
      "precio": 187.05,
      "internet": {
        "velocidad": null
      },
      "telefono": {
        "lineas": 1,
        "celular": "ilimitado",
        "locales": "ilimitado"
      },
      "info_mail": "La línea Telmex incluye 100 llamadas locales, tres meses de servicios digitales SIN COSTO y Buzón Telmex por $187.05 pesos al mes.",
      "beneficios": "Con una Línea Telmex residencial puedes mantenerte comunicado con familiares y amigos, comprar tecnología con cargo a tu Recibo Telmex, disfrutar de una línea de crédito personal con Inbursa y muchos beneficios más.",
      "tecnologia": 1,
      "descripcion": "La línea Telmex incluye 100 llamadas locales, 3 meses de servicios digitales SIN COSTO y Buzón Telmex, por $187.05 pesos al mes."
    },
    {
      "tipo": "comercial",
      "activo": false,
      "nombre": "Línea telefónica comercial",
      "precio": 236.57,
      "internet": {
        "velocidad": null
      },
      "telefono": {
        "lineas": 1,
        "celular": "ilimitado",
        "locales": "ilimitado"
      },
      "info_mail": "Línea comercial: servicio de voz para que tengas comunicación directa con tus clientes y proveedores, pagando una renta mensual de $236.57 pesos. Si requieres una línea independiente da clic <a href='http://telmex.com/web/negocios/linea-telmex' target='_top'>aquí</a>. Si requieres una extensión o troncal da clic <a href='http://telmex.com/web/empresas/troncales-telmex' target='_top'>aquí</a>. O si lo prefieres, puedes consultar a un ejecutivo de cuenta en el 01 800 123 12 12.",
      "beneficios": "Te ofrecemos una Línea comercial para que te comuniques a cualquier destino nacional con tus clientes y proveedores. Las llamadas se cobran por evento. Si quieres más información, contáctanos en el 01 800 123 0321.",
      "tecnologia": 1,
      "descripcion": "Línea comercial es el servicio de voz para que tengas comunicación directa con tus clientes y proveedores, pagando una renta mensual de $236.57 pesos. Si requieres una línea independiente da clic <a href='http://telmex.com/web/negocios/linea-telmex' target='_top'>aquí</a>. Si requieres una extensión o troncal da clic <a href='http://telmex.com/web/empresas/troncales-telmex' target='_top'>aquí</a>. O si lo prefieres, puedes consultar a un ejecutivo de cuenta en el 01 800 123 12 12."
    },
    {
      "tipo": "comercial",
      "activo": false,
      "nombre": "Línea Negocio 200",
      "precio": 537.66,
      "internet": {
        "velocidad": null
      },
      "telefono": {
        "lineas": 1,
        "celular": null,
        "locales": 250
      },
      "info_mail": "Línea negocio incluye la renta de la línea comercial y una cantidad determinada de llamadas locales al mes: Línea negocio 200 - $537.66 pesos, Línea negocio 500 - $953.45 pesos y Línea negocio 1,000 -$1,431.37 pesos.",
      "beneficios": "Línea Negocio otorga el beneficio de un menor costo de las llamadas de servicio medido lo que implica un ahorro para tu negocio. Si quieres más información, contáctanos en el 01 800 123 0321.",
      "tecnologia": 1,
      "descripcion": "Línea negocio incluye la renta de la línea comercial y una cantidad determinada de llamadas locales al mes: Línea negocio 200 - $537.66 pesos, Línea negocio 500 - $953.45 pesos y Línea negocio 1,000 -$1,431.37 pesos."
    },
    {
      "tipo": "comercial",
      "activo": false,
      "nombre": "Línea Negocio 500",
      "precio": 953.45,
      "internet": {
        "velocidad": null
      },
      "telefono": {
        "lineas": 1,
        "celular": null,
        "locales": 650
      },
      "info_mail": "Línea negocio incluye la renta de la línea comercial y una cantidad determinada de llamadas locales al mes: Línea negocio 200 - $537.66 pesos, Línea negocio 500 - $953.45 pesos y Línea negocio 1,000 -$1,431.37 pesos.",
      "beneficios": "Línea Negocio otorga el beneficio de un menor costo de las llamadas de servicio medido lo que implica un ahorro para tu negocio. Si quieres más información, contáctanos en el 01 800 123 0321.",
      "tecnologia": 1,
      "descripcion": "Línea negocio incluye la renta de la línea comercial y una cantidad determinada de llamadas locales al mes: Línea negocio 200 - $537.66 pesos, Línea negocio 500 - $953.45 pesos y Línea negocio 1,000 -$1,431.37 pesos."
    },
    {
      "tipo": "comercial",
      "activo": false,
      "nombre": "Línea Negocio 1000",
      "precio": 1431.37,
      "internet": {
        "velocidad": null
      },
      "telefono": {
        "lineas": 1,
        "celular": null,
        "locales": 1200
      },
      "info_mail": "Línea negocio incluye la renta de la línea comercial y una cantidad determinada de llamadas locales al mes: Línea negocio 200 - $537.66 pesos, Línea negocio 500 - $953.45 pesos y Línea negocio 1,000 -$1,431.37 pesos.",
      "beneficios": "Línea Negocio otorga el beneficio de un menor costo de las llamadas de servicio medido lo que implica un ahorro para tu negocio. Si quieres más información, contáctanos en el 01 800 123 0321.",
      "tecnologia": 1,
      "descripcion": "Línea negocio incluye la renta de la línea comercial y una cantidad determinada de llamadas locales al mes: Línea negocio 200 - $537.66 pesos, Línea negocio 500 - $953.45 pesos y Línea negocio 1,000 -$1,431.37 pesos."
    }
  ],
  "day": "15",
  "log": [
    "[] Inicializo",
    "[] Pregunto nombre de cliente"
  ],
  "hour": "16",
  "year": "2018",
  "month": "06",
  "form_c": null,
  "form_r": null,
  "minute": "26",
  "second": "04",
  "cliente": {
    "correo": null,
    "nombre": null
  },
  "molesto": {
    "cuenta": 0,
    "limite": 2
  },
  "busqueda": "general",
  "contexto": "Nombres",
  "timezone": "America/Mexico_City",
  "confianza": 0.7,
  "perfilado": {
    "tipo": null,
    "activo": null,
    "nombre": null,
    "precio": null,
    "inferior": null,
    "internet": {
      "velocidad": null
    },
    "superior": null,
    "telefono": {
      "lineas": null,
      "celular": null,
      "locales": null
    },
    "beneficios": null,
    "tecnologia": null,
    "descripcion": null
  },
  "tema_ayuda": null,
  "perfilado_max": {
    "nombre": null,
    "precio": null,
    "internet": {
      "velocidad": null
    },
    "telefono": {
      "lineas": null,
      "celular": null,
      "locales": null
    },
    "tecnologia": null
  },
  "perfilado_min": {
    "nombre": null,
    "precio": null,
    "internet": {
      "velocidad": null
    },
    "telefono": {
      "lineas": null,
      "celular": null,
      "locales": null
    },
    "tecnologia": null
  },
  "incomprensible": {
    "cuenta": 0,
    "limite": 2
  },
  "oferta_accepta": false,
  "saludo_ingreso": "",
  "perfilado_extras": {
    "sugerir": {
      "cuenta": 0,
      "limite": 3
    },
    "internet": {
      "uso": null,
      "nube": null,
      "juegos": null,
      "videos": null,
      "dispositivos": null,
      "redessociales": null,
      "videollamadas": null,
      "trabajarencasa": null
    },
    "sinonimo": null,
    "actualizar": false,
    "pagina_web": null,
    "motivo_solicitud": null,
    "servidor_virtual": null,
    "nombres_servicios": null,
    "servicio_sugerido": null,
    "servicio_a_evaluar": null,
    "servicios_sugeridos": [],
    "servicio_sugerido_anterior": null
  },
  "tentativa_oferta": false,
  "timestamp_inicio": "2018-06-15 11:26:04",
  "start_chronometer": true,
  "caso_de_uso_actual": "nueva_contratacion",
  "calculo_ponderacion": 0,
  "motivo_transferencia": null,
  "text_continue_conversation": [
    "¡Gracias por regresar! Hemos tenido una conversación reciente, ¿Quieres continuar con la misma conversación?"
  ]
}
   }
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
