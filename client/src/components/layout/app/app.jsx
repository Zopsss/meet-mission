/***
*
*   APP LAYOUT
*   Main application layout containing the navigation
*   and header (title, secondary nav and user)
*
*   PROPS
*   children: will be passed from router > view > here (component(s), required)
*   title: title of the view for the header (string, required)
*
**********/

import { Fragment, useContext } from 'react';
import { AuthContext, AppNav, Header } from 'components/lib';
import Style from './app.module.scss';

export function AppLayout(props){

  // context & style
  const context = useContext(AuthContext);

  return (
    <Fragment>
      <AppNav
        type='popup'
        items={[
          { label: 'Dashboard', icon: 'activity', link: '/dashboard' },
          { label: 'Dating Event', icon: 'calendar', link: '/event-management' },
          // { label: 'Event Booking', icon: 'trello', link: '/event-booking' },
          // { label: 'Event Grouping', icon: 'grid', link: '/event-grouping' },
          { label: 'Locations', icon: 'map-pin', link: '/locations' },
          { label: 'Cities', icon: 'map', link: '/cities' },
          { label: 'Feedback', icon: 'heart', link: '/feedback' },
          { label: 'Logs', icon: 'clipboard', link: '/logs' },
          { label: 'Events', icon: 'clock', link: '/events' },
          { label: 'Accounts', icon: 'credit-card', link: '/accounts' },
          { label: 'Users', icon: 'users', link: '/users' },
          { label: 'Sign Out', icon: 'log-out', action: context.signout },
          { label: "Test Team Formation", icon: "clipboard", link: "/test-team-formation" },
          { label: "Test Group Formation and Bars Hopping", icon: "clipboard", link: "/test-group-formation-and-bars-hopping" }
        ]}
      />

      <main className={ Style.app }>

        <Header title={ props.title } />
        { <props.children {...props.data }/> }

      </main>
    </Fragment>
  );
}
