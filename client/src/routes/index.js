import { Signin } from 'views/signin';
import { Dashboard } from 'views/dashboard';
import { Accounts } from 'views/accounts';
import { PaymentHistory } from 'views/payment_history';
import { Users } from 'views/users';
import { Feedback } from 'views/feedback';
import { Logs } from 'views/log/list';
import { LogDetail } from 'views/log/detail';
import { EventGroups } from 'views/event/groups';
import { Events } from 'views/event/list';
import { EventDetail } from 'views/event/detail';
import { EventGroups as EventManagement } from 'views/event-management/groups';
import { EventDetail as EventManagementDetail } from 'views/event-management/detail';
import { EventEditor } from 'views/event-management/editor';
import { EventBooking } from 'views/event-booking/groups';
import { EventBookingDetail } from 'views/event-booking/detail';
import { EventGrouping } from 'views/event-grouping/groups';
import { EventGroupingDetail } from 'views/event-grouping/group-detail';
import { EventGroupLists } from 'views/event-grouping/group-lists';
import { GroupEditor } from 'views/event-grouping/editor';
import { Cities } from 'views/cities/groups';
import { Locations } from 'views/locations/groups';
import { LocationsDetail } from 'views/locations/detail';
import { LocationEditor } from 'views/locations/editor';
import { TeamsDetail } from 'views/event-teams/detail';
import { TeamsLists } from 'views/event-teams/lists';
import { TeamsEditor } from 'views/event-teams/editor';
import { ParticipantMessages } from 'views/participant-messages/groups';
import { TeamFormation } from 'views/user-testing/team-formation';
import { EventScheduler } from 'views/user-testing/event-schedular2';
import { WaitlistList } from 'views/event-waitlist/list';

const Routes = [
  {
    path: '/',
    view: Signin,
    layout: 'auth',
    title: 'Mission Control'
  },
  {
    path: '/signin',
    view: Signin,
    layout: 'auth',
    title: 'Mission Control'
  },
  {
    path: '/dashboard',
    view: Dashboard,
    layout: 'app',
    permission: 'master',
    title: 'Mission Control'
  },
  {
    path: '/accounts',
    view: Accounts,
    layout: 'app',
    permission: 'master',
    title: 'Accounts'
  },
  {
    path: '/payment-history/:id',
    view: PaymentHistory,
    layout: 'app',
    permission: 'master',
    title: 'Payment History'
  },
  {
    path: '/users',
    view: Users,
    layout: 'app',
    permission: 'master',
    title: 'Users'
  },
  {
    path: '/feedback',
    view: Feedback,
    layout: 'app',
    permission: 'master',
    title: 'User Feedback'
  },
  {
    path: '/logs',
    view: Logs,
    layout: 'app',
    permission: 'master',
    title: 'App Logs'
  },
  {
    path: '/logs/:id',
    view: LogDetail,
    layout: 'app',
    permission: 'master',
    title: 'Log Detail'
  },
  {
    path: '/event-management',
    view: EventManagement,
    layout: 'app',
    permission: 'master',
    title: 'Event Management'
  },
  {
    path: '/event-management/:id',
    view: EventManagementDetail,
    layout: 'app',
    permission: 'master',
    title: 'Event Management Detail'
  },
  {
    path: '/event-management/edit/:id',
    view: EventEditor,
    layout: 'app',
    permission: 'master',
    title: 'Event Editor'
  },
  {
    path: '/event-management/group/:id',
    view: EventGroupLists,
    layout: 'app',
    permission: 'master',
    title: 'Groups'
  },
  {
    path: '/event-management/group/:id/:group-id',
    view: EventGroupingDetail,
    layout: 'app',
    permission: 'master',
    title: 'Event Group'
  },
  {
    path: '/event-management/group/:id/edit/:group-id',
    view: GroupEditor,
    layout: 'app',
    permission: 'master',
    title: 'Group Editor'
  },
  {
    path: '/event-management/group/:id/new',
    view: GroupEditor,
    layout: 'app',
    permission: 'master',
    title: 'New Group'
  },
  {
    path: '/event-management/teams/:id',
    view: TeamsLists,
    layout: 'app',
    permission: 'master',
    title: 'Event Group Teams'
  },
  {
    path: '/event-management/teams/:id/:team-id',
    view: TeamsDetail,
    layout: 'app',
    permission: 'master',
    title: 'Event Group Team Detail'
  },
  {
    path: '/event-management/teams/:id/edit/:team-id',
    view: TeamsEditor,
    layout: 'app',
    permission: 'master',
    title: 'Event Group Team Editor'
  },
  {
    path: '/event-management/teams/:id/new',
    view: TeamsEditor,
    layout: 'app',
    permission: 'master',
    title: 'New Team'
  },
  {
    path: '/event-management/new',
    view: EventEditor,
    layout: 'app',
    permission: 'master',
    title: 'New Event'
  },
  {
    path: '/event-management/registered-participants/:id',
    view: EventBooking,
    layout: 'app',
    permission: 'master',
    title: 'Registered Participants'
  },
  {
    path: '/event-management/registered-participants/:id/:user-id',
    view: EventBookingDetail,
    layout: 'app',
    permission: 'master',
    title: 'Registered Participant Detail'
  },
  {
    path: '/event-management/participant-messages/:id',
    view: ParticipantMessages,
    layout: 'app',
    permission: 'master',
    title: 'Participant Messages'
  },
  {
    path: '/cities',
    view: Cities,
    layout: 'app',
    permission: 'master',
    title: 'Cities'
  },
  {
    path: '/locations',
    view: Locations,
    layout: 'app',
    permission: 'master',
    title: 'Locations'
  },
  {
    path: '/locations/:id',
    view: LocationsDetail,
    layout: 'app',
    permission: 'master',
    title: 'Location Detail'
  },
  {
    path: '/locations/new',
    view: LocationEditor,
    layout: 'app',
    permission: 'master',
    title: 'Location'
  },
  {
    path: '/locations/edit/:id',
    view: LocationEditor,
    layout: 'app',
    permission: 'master',
    title: 'Location Editor'
  },
  {
    path: '/event-grouping',
    view: EventGrouping,
    layout: 'app',
    permission: 'master',
    title: 'Event Grouping'
  },
  {
    path: '/event-grouping/:id',
    view: EventGroupLists,
    layout: 'app',
    permission: 'master',
    title: 'Event Group Lists'
  },
  {
    path: '/event-grouping/group/:id',
    view: EventGroupingDetail,
    layout: 'app',
    permission: 'master',
    title: 'Event Group Members'
  },
  {
    path: '/events',
    view: EventGroups,
    layout: 'app',
    permission: 'master',
    title: 'Events'
  },
  {
    path: '/events/:group',
    view: Events,
    layout: 'app',
    permission: 'master',
    title: 'Event'
  },
  {
    path: '/events/:group/:id',
    view: EventDetail,
    layout: 'app',
    permission: 'master',
    title: 'Event Detail'
  },
  {
    path: "/event-management/waitlist/:id",
    view: WaitlistList,
    layout: "app",
    permission: "master",
    title: "Waitlist",
  },
  {
    path: '/test-team-formation',
    view: TeamFormation,
    layout: 'app',
    title: 'Test Team Formation'
  },
  {
    path: '/test-group-formation-and-bars-hopping',
    view: EventScheduler,
    layout: 'app',
    title: 'Test Group Formation and Bars Hopping'
  },
]

export default Routes;
