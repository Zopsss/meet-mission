const cron = require('node-cron');
const moment = require('moment-timezone');
const utility = require('../helper/utility');
const { generateTeamGroup, eventStartReminder, swipeEventStartReminder, eventEndReminder } = require('../controller/aiController');

async function runAIJobForGrouping() {
  console.log('AI Grouping Start');

  try {
    await generateTeamGroup();
    console.log('AI Grouping Finish');
  } catch (err) {
    console.error('AI Grouping job error:', err);
  }
}

async function runAIJobForEventStartReminder() {
  console.log('AI tarting Event Reminder Start');

  try {
    await eventStartReminder();
    console.log('AI tarting Event Reminder Finish');
  } catch (err) {
    console.error('AI tarting Event Reminder job error:', err);
  }
}

async function runAIJobForSwipeEventStartReminder() {
  console.log('AI tarting Swipe Event Reminder Start');

  try {
    await swipeEventStartReminder();
    console.log('AI tarting Swipe Event Reminder Finish');
  } catch (err) {
    console.error('AI tarting Swipe Event Reminder job error:', err);
  }
}

async function runAIJobForEndEventReminder() {
  console.log('AI tarting Eng Event Reminder Start');

  try {
    await eventEndReminder();
    console.log('AI tarting Eng Event Reminder Finish');
  } catch (err) {
    console.error('AI tarting Eng Event Reminder job error:', err);
  }
}

// Run at 8:00 AM Europe/Berlin time every day
// */5 * * * *
// 0 8 * * *
cron.schedule('0 8 * * *', () => {
  const now = moment().tz('Europe/Berlin');
  console.log('Running AI Grouping job at:', now.format());
  runAIJobForGrouping();
}, {
  timezone: 'Europe/Berlin'
});

// Run at 10:00 AM Europe/Berlin time every day
// */5 * * * *
// 0 10 * * *
cron.schedule('* 10 * * *', () => {
  const now = moment().tz('Europe/Berlin');
  if (now.hour() === 10) {
    console.log('Running AI Starting Event Reminder job at:', now.format());
    runAIJobForEventStartReminder();
  }
}, {
  timezone: 'Europe/Berlin'
});

// Run at 23:58 AM Europe/Berlin time every day
// */5 * * * *
// 59 23 * * *
cron.schedule('59 23 * * *', () => {
  const now = moment().tz('Europe/Berlin');
  console.log('Running AI Starting Swipe Event Reminder job at:', now.format());
  runAIJobForSwipeEventStartReminder();
}, {
  timezone: 'Europe/Berlin'
});

// Run at 23:58 AM Europe/Berlin time every day
// */5 * * * *
// 00 23 * * *
cron.schedule('00 23 * * *', () => {
  const now = moment().tz('Europe/Berlin');
  console.log('Running AI Starting End Event Reminder job at:', now.format());
  runAIJobForEndEventReminder();
}, {
  timezone: 'Europe/Berlin'
});