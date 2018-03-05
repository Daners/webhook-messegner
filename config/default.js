var export_config = {}


  export_config.pageToken = process.env.PAGE_ACCESS_TOKEN ? process.env.PAGE_ACCESS_TOKEN : "";
  export_config.verifyToken =   process.env.VERIFY_TOKEN ? process.env.VERIFY_TOKEN : "";

  module.exports = export_config;
