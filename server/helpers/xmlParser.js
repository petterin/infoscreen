const xml2js = require("xml2js");

const xmlParser = new xml2js.Parser();

module.exports = {
  parseXmlAsync: function (xmlData) {
    return new Promise((resolve, reject) => {
      xmlParser.parseString(xmlData, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  },
};
