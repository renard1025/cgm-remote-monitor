'use strict';

var engine = require('share2nightscout-bridge');

// Track the most recently seen record
var mostRecentRecord;

function init (env) {
  if (env.extendedSettings.bridge && env.extendedSettings.bridge.userName && env.extendedSettings.bridge.password) {
    return create(env);
  } else {
    console.info('Dexcom bridge not enabled');
  }
}

function bridged (entries) {
  function payload (err, glucose) {
    if (err) {
      console.error('Bridge error: ', err);
    } else {
      if (glucose) {
        for (var i = 0; i < glucose.length; i++) {
          if (glucose[i].date > mostRecentRecord) {
            mostRecentRecord = glucose[i].date;
          }
        }
      }
      entries.create(glucose, function stored (err) {
        if (err) {
          console.error('Bridge storage error: ', err);
        }
      });
    }
  }
  return payload;
}

function options (env) {
  var config = {
    accountName: env.extendedSettings.bridge.userName
    , password: env.extendedSettings.bridge.password
  };

  var fetch_config = {
    maxCount: env.extendedSettings.bridge.maxCount || 1
    , minutes: env.extendedSettings.bridge.minutes || 1440
  };

  var interval = env.extendedSettings.bridge.interval || 60000 * 2.5; // Default: 2.5 minutes

  if (interval < 1000 || interval > 300000) {
        // Invalid interval range. Revert to default
        console.error("Invalid interval set: [" + interval + "ms]. Defaulting to 2.5 minutes.")
        interval = 60000 * 2.5 // 2.5 minutes
  }

  return {
    login: config
    , interval: interval
    , fetch: fetch_config
    , nightscout: { }
    , maxFailures: env.extendedSettings.bridge.maxFailures || 3
    , firstFetchCount: env.extendedSettings.bridge.firstFetchCount || 3
  };
}

function create (env) {

  var bridge = { };

  var opts = options(env);
  var interval = opts.interval;

  mostRecentRecord = new Date().getTime() - opts.fetch.minutes * 60000

  bridge.startEngine = function startEngine (entries) {

    opts.callback = bridged(entries);

    setInterval(function () {
      opts.fetch.minutes = parseInt(14400);
      opts.fetch.maxCount = parseInt(5000);
      opts.firstFetchCount = opts.fetch.maxCount
      console.log("Fetching Share Data: ", 'minutes', opts.fetch.minutes, 'maxCount', opts.fetch.maxCount);
      engine(opts);
    }, interval);
  };

  return bridge;
}

init.create = create;
init.bridged = bridged;
init.options = options;
exports = module.exports = init;
