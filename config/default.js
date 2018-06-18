var export_config = {}


  export_config.pageToken = process.env.PAGE_ACCESS_TOKEN ? process.env.PAGE_ACCESS_TOKEN : "";
  export_config.verifyToken =   process.env.VERIFY_TOKEN ? process.env.VERIFY_TOKEN : "";
  export_config.recastToken = process.env.RECASTIA_TOKEN ? process.env.RECASTIA_TOKEN : "";
  export_config.recastTokenDev = process.env.RECASTIA_TOKEN_DEV ?  process.env.RECASTIA_TOKEN_DEV : "";
  export_config.url_dispatcher = process.env.URL_DISPATCHER ?  process.env.URL_DISPATCHER : "https://watson-tlmx-messenger.herokuapp.com/interpreter/";
  module.exports = export_config;
