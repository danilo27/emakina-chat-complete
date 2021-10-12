const moment = require('moment');

function formatMessage(username, text, object) {
  return {
    username,
    text,
    object,
    time: moment().format('h:mm a')
  };
}

module.exports = formatMessage;
