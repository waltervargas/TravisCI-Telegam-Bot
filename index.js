import TelegramBot from 'node-telegram-bot-api';                // importing telegram bot node api
import https from 'https';                                      // importing https to make requests to travis json user data
const token = '227706347:AAF-Iq5fV8L4JYdk3g5wcU-z1eK1dd4sKa0';  // authorization token
let bot = new TelegramBot(token, {polling: true});              // initializing new bot
const opts = {              // keyboard options
  reply_markup: {
    "keyboard": [
      ["Yes"],
      ["No"]
    ],
    one_time_keyboard: true // keyboard will shown only once and when it's required
  }
};
require('./web');

bot.on('text', msg => {                             // when user sending message
  const chatID = msg.chat.id;                       // Saving user chat id from who bot received message
  const msgText = msg.text;                         // Getting text content
  const travisLink = "https://travis-ci.org";       // Using for getting json data and slicing strings
  let userID;                                       // need to have this values in global scope
  let userRepo;                                     // need to have this values in global scope
  let options;                                      // options for http request json data
  let prevBuildNumber;                              // storing number of previous build
  let currBuildNumber;                              // storing number of current build

  // Send Message from bot function
  const botSendMsg = (text, response) => {  // Function takes two arguments, bot command, and bot response
    msgText === text ? bot.sendMessage(chatID, response) : false;
  };

  if (msgText === ('hi' || 'Hi' || 'HI' || 'Hello')) {
    bot.sendMessage(chatID, 'hi');
  }

  // Function for getting JSON data file for user repository
  const getTravisData = () => {
    userID = msgText.slice(msgText.lastIndexOf('org') + 4, msgText.lastIndexOf('/')); // getting user id
    userRepo = msgText.slice(msgText.lastIndexOf('/'));                               // getting user repository name

    bot.sendMessage(chatID, `Ok, ${msgText} is that link you want to watch?`, opts);
    // setting options for requested JSON file
    options = {
      host: 'api.travis-ci.org',
      path: `/repositories/${userID}${userRepo}.json`,
      method: 'GET',
      headers: {
        'User-Agent': userID
      }
    };

    // making request to user travis link to get current build status
    https.request(options, response => {
      let str = '';
      response.on('data', data => {
        str += data;
      });
      response.on('end', () => {
        const parsed = JSON.parse(str);               // parsing received data
        prevBuildNumber = parsed.last_build_number;   // ssigning previous build number to prevBuildNumber
        // checking if currBuildNumber has value
        if (!(!!currBuildNumber)) {                   // if it doesn't
          currBuildNumber = prevBuildNumber;          // assign it to prevBuildNumber
        }
      });
    }).end();
  };

  // creating function which will be called when user sends travis link
  let httpIntervalRequest = () => {
    // creating setInterval to make http request each 7 seconds
    setInterval(() => {
      https.request(options, response => {
        let str = '';
        response.on('data', data => {
          str += data;
        });
        response.on('end', () => {
          const parsed = JSON.parse(str);             // parsing JSON data
          currBuildNumber = parsed.last_build_number; // assigning current build number to currBuildNumber
          if (prevBuildNumber !== currBuildNumber && parsed.last_build_finished_at) {  // if after assigning it's not same as prevBuildNumber

            currBuildNumber = parsed.last_build_number;   // reassign new variables
            prevBuildNumber = parsed.last_build_number;   // reassign new variables

            let buildDoneText = parsed.last_build_status === 0 ? 'completed successfully' : 'failed';
            let buildNumber = parsed.last_build_number;
            let buildDuration = parsed.last_build_duration;
            let minutes = Math.floor(buildDuration / 60);
            let seconds = buildDuration - minutes * 60;
            if (seconds < 10) {
              seconds = '0' + seconds
            }
            let repoName = parsed.slug.slice(parsed.slug.lastIndexOf('/') + 1);

            bot.sendMessage(chatID, `Hi, your build at ${repoName} repository just has ended. \nYour build ${buildDoneText}. \nBuild number was ${buildNumber} and total time is ${minutes}:${seconds}`);
          }
        });
      }).end();
    }, 7000);
  };

  // Check if user send Travis Repository link
  const checkLink = msgText.indexOf(travisLink) > -1 || msgText.indexOf(travisLink.slice(8)) > -1;
  if (checkLink) {
    getTravisData();
    httpIntervalRequest();
  }

  botSendMsg('/help', `Hi, i'm @TravisCI_Telegam_Bot. I will notify you each time when your Travis CI build is done. You can read more on https://github.com/artemgurzhii/TravisCI_Telegam_Bot.\n\nTo start please send me your Travis CI link.`);
  botSendMsg('/how', 'You send me your Tavis CI repository link. Example: \nhttps://travis-ci.org/twbs/bootstrap \nThen I will watch for changes and will notify you each time when your build is done. \n\nI will also include some basic information about your build. \nCurrently i can watch only one repository from each user.');
  botSendMsg('Yes', 'Ok, now I will start watching for changes. Since know I will notify you each time when your Travis CI build is done.');
  botSendMsg('No', 'Ok, than send me link you want to watch');

});
