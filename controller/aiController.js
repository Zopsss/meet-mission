// const joi = require('joi');
const openai = require('../model/openai');
const account = require('../model/account');
const utility = require('../helper/utility');
const mail = require('../helper/mail');
const eventModel = require('../model/event-management');
const transaction = require('../model/transaction');
const participants = require('../model/registered-participant');
const confirmMatchModel = require('../model/confirm-match');
const mongoose = require('mongoose');
const fs = require('fs');
const path = require('path');
const groupModel = require('../model/group');
const teamModel = require('../model/team');
const i18n = require('i18n');
const { formTeams, formSlotGroups } = require('../helper/grouping');

exports.generateTeamGroup = async function(){
  const events = await eventModel.getEventCron({ day: 5, generated: false });
  console.log(JSON.stringify(events), 'events');
  
  if(events?.length){
    const handleGroupTeams = await Promise.all(events.map(async (event) => {
      const registeredParticipants = await transaction.getParticipantsCron({ event_id: new mongoose.Types.ObjectId(event._id)})
      if(registeredParticipants?.length){
        const teams = formTeams(registeredParticipants);
        if(teams?.length && event?.bars?.length){
          const groups = formSlotGroups(teams, event.bars);
          if(groups?.length){
            const teamMap = new Map();
    
            // Save all teams concurrently
            const savedTeams = await Promise.all(
              teams.map(async (team) => {
                const saved = await teamModel.add({ team: { ...team }, eventId: event._id });
                teamMap.set(team.team_name, saved._id);
                return saved;
              })
            );
    
            // Save all groups concurrently using the saved team IDs
            await Promise.all(
              groups.map(async (group) => {
                const team_ids = group.teams.map(t => teamMap.get(t));
                await groupModel.add({
                  group: { ...group, team_ids },
                  eventId: event._id
                });
              })
            );

            // update event
            await eventModel.update({ id: new mongoose.Types.ObjectId(event._id), data: {
              has_grouped_by_ai: true
            }})

            return { message: 'All teams and groups saved successfully.' };
          }
        }
        return
        
      }
    }))
  }
  
  return events
}

exports.eventStartReminder = async function(){
  const events = await eventModel.getEventCron({ day: 1, generated: true });
  if(events?.length){
    const handleGroupTeams = await Promise.all(events.map(async (event) => {
      const registeredParticipants = await participants.getRegistered({ event_id: new mongoose.Types.ObjectId(event._id), isValid: true})
      // console.log(registeredParticipants, 'registration');
      registeredParticipants && await Promise.all(registeredParticipants.map(async (reg) => {
        const team = await teamModel.getByUserId({ id: reg.user_id})
        // console.log(team, 'team');
        if(team){
          const group = await groupModel.getByTeamId({ id: team._id})
          // console.log(group, 'group');
          if(group?.length){
            const sortedGroups = group
              .sort((a, b) => a.slot - b.slot) // sort by slot ascending
              .map(group => ({
                slot: group.slot,
                group_name: group.group_name,
                bar_name: group.bar_id.name,
                bar_address: group.bar_id.address
                
              }));

            // console.log(sortedGroups, event, 'sort');
              
            const emailData = {
              name: `${reg.first_name}`,
              date: event.date && utility.formatDateString(event.date),
              email: reg.email,
              city: event.city.name,
              start_time: event.start_time,
              end_time: event.end_time,
              tagline: event.tagline,
              team_partners: team.members.map((member) => member.first_name ? `${member.first_name} ${member.last_name}` : member.name)?.join(', '),
              age_group: team.age_group,
              groups: sortedGroups
            }

            const formatTime = (date) =>
              date.toLocaleTimeString('en-GB', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
                hour12: false,
              });

            const slotDurationMinutes = 90;

            // Combine date and time into a single Date object
            const [day, month, year] = emailData.date.split('.');
            const [hour, minute] = emailData.start_time.split(':');
            const eventStart = new Date(
              Number(year),
              Number(month) - 1,
              Number(day),
              Number(hour),
              Number(minute)
            );

            const groupString = emailData.groups?.map((dt, idx) => {
              const slotStart = new Date(eventStart.getTime() + (idx * slotDurationMinutes * 60000));
              if (idx > 0) slotStart.setSeconds(slotStart.getSeconds() + 1);
              const slotEnd = new Date(slotStart.getTime() + (slotDurationMinutes) * 60000);
              if (idx > 0) slotEnd.setSeconds(slotEnd.getSeconds() - 1);

              return i18n.__('job.reminder_event.group', {
                index: dt.slot,
                slotStartTime: formatTime(slotStart),
                slotEndTime: formatTime(slotEnd),
                barName: dt.bar_name,
                barAddress: dt.bar_address,
              });
            })?.join('');

            const eventDate = new Date(Number(year), Number(month) - 1, Number(day));

            // Add 4 weeks (28 days) to get endTime
            const endDate = new Date(eventDate);
            endDate.setDate(endDate.getDate() + 28);
            // Format endTime as 'dd.mm.yyyy'
            const endTime = endDate.toLocaleDateString('en-GB'); // Outputs in 'dd/mm/yyyy'
            const endTimeFormatted = endTime.replace(/\//g, '.'); // Convert to 'dd.mm.yyyy'

            const body = i18n.__('job.reminder_event.body', {
              participantFirstName: emailData.name,
              eventDateFormatted: emailData.date,
              cityName: emailData.city,
              startTime: emailData.start_time,
              endTime: endTimeFormatted,
              eventTagline: emailData.tagline,
              teamPartnerName: emailData.team_partners,
              ageGroup: emailData.age_group,
              group: groupString,
              matchingPhaseTime: '12:00'
            })

            await mail.send({
              
              to: emailData.email,
              locale: reg.locale || 'de',
              template: 'template',
              subject: i18n.__('job.reminder_event.subject'),
              content: { 
                body,
                closing: i18n.__('job.reminder_event.closing'),
                button: {
                  url: process.env.CLIENT_URL,
                  label: i18n.__('job.reminder_event.button')
                }
              }
            })
            // console.log(emailData, body, 'emailData');
          }
          
        }
      }))
    }))
  }
  return events
}

exports.swipeEventStartReminder = async function(){
  const events = await eventModel.getSwipeEventCron({ generated: true });
  if(events?.length){
    const handleGroupTeams = await Promise.all(events.map(async (event) => {
      const registeredParticipants = await participants.getRegistered({ event_id: new mongoose.Types.ObjectId(event._id), isValid: true})
      // console.log(registeredParticipants, 'registration');
      registeredParticipants && await Promise.all(registeredParticipants.map(async (reg) => {
        const team = await teamModel.getByUserId({ id: reg.user_id})
        if(team){
          const group = await groupModel.getByTeamId({ id: team._id})
          if(group?.length){
              
            const emailData = {
              name: `${reg.first_name}`,
              date: event.date && utility.formatDateString(event.date),
              email: reg.email,
              city: event.city.name,
              start_time: event.start_time,
              end_time: event.end_time,
            }
            // Combine date and time into a single Date object
            const [day, month, year] = emailData.date.split('.');
            const eventDate = new Date(Number(year), Number(month) - 1, Number(day));

            // Add 4 weeks (28 days) to get endTime
            const endDate = new Date(eventDate);
            endDate.setDate(endDate.getDate() + 28);
            // Format endTime as 'dd.mm.yyyy'
            const endTime = endDate.toLocaleDateString('en-GB'); // Outputs in 'dd/mm/yyyy'

            const body = i18n.__('job.reminder_event_swipe.body', {
              participantFirstName: emailData.name,
              eventDateFormatted: emailData.date,
              city: emailData.city
            })

            await mail.send({
              
              to: emailData.email,
              locale: reg.locale || 'de',
              template: 'template',
              subject: i18n.__('job.reminder_event_swipe.subject'),
              content: { 
                body,
                closing: i18n.__('job.reminder_event_swipe.closing'),
                button: {
                  url: process.env.CLIENT_URL,
                  label: i18n.__('job.reminder_event_swipe.button')
                }
              }
            })
            // console.log(emailData, body, 'emailData');
          }
          
        }
      }))
    }))
  }
  return events
}

exports.eventEndReminder = async function(){
  const events = await eventModel.getEndEventCron({ generated: true });
  console.log(events, 'events');
  
  if(events?.length){
    const handleGroupTeams = await Promise.all(events.map(async (event) => {
      const registeredParticipants = await participants.getRegistered({ event_id: new mongoose.Types.ObjectId(event._id), isValid: true})
      console.log(registeredParticipants, 'registration');
      registeredParticipants && await Promise.all(registeredParticipants.map(async (reg) => {
        const team = await teamModel.getByUserId({ id: reg.user_id})
        if(team){
          const group = await groupModel.getByTeamId({ id: team._id})
          const hasConfirmedMatch = await confirmMatchModel.hasConfirmedMatch({
            eventId: new mongoose.Types.ObjectId(event._id),
            userId: new mongoose.Types.ObjectId(reg.user_id),
          });
          
          if(group?.length && !hasConfirmedMatch){
            const emailData = {
              name: `${reg.first_name}`,
              date: event.date && utility.formatDateString(event.date),
              email: reg.email,
              city: event.city.name,
              start_time: event.start_time,
              end_time: event.end_time,
            }

            const body = i18n.__('job.reminder_event_end.body', {
              participantFirstName: emailData.name,
              eventDateFormatted: emailData.date,
              city: emailData.city
            })

            await mail.send({
              
              to: emailData.email,
              locale: reg.locale || 'de',
              template: 'template',
              subject: i18n.__('job.reminder_event_end.subject'),
              content: { 
                body,
                closing: i18n.__('job.reminder_event_end.closing'),
                button: {
                  url: process.env.CLIENT_URL,
                  label: i18n.__('job.reminder_event_end.button')
                }
              }
            })
            // console.log(emailData, body, 'emailData');
          }
          
        }
      }))
    }))
  }
  return events
}