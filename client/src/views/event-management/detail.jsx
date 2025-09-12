/***
*
*   EVENT/DETAIL
*   View the details of an individual event
*
**********/

import { useEffect, useState } from 'react';
import { Animate, Card, Breadcrumbs, Form, useAPI, useLocation } from 'components/lib';

export function EventDetail(props){

  const location = useLocation();
  const path = location?.pathname?.split('/');
  const id = path[2];

  // fetch
  const event = useAPI(`/api/event-management/${id}`);
  
  const groupTemplate = {
    name: {
      label: 'Bar',
      placeholder: 'Bar Name',
      type: 'select',
      required: true,
      options: null
    },
    available_spot: {
      type: 'number',
      label: 'Available Spots',
      required: true,
    },
  }
  
  const [form, setForm] = useState({
    date: {
      label: 'Date',
      type: 'text',
      required: true,
      value: event?.date
    },
    city: {
      label: 'City',
      type: 'select',
      required: true,
      options: null,
      default: event?.city?.name
    },
    tagline: {
      label: 'Tagline',
      type: 'text',
      required: true,
      default: event?.tagline
    },
    bars: {
      type: 'group',
      required: true,
      label: 'Available Bars',
      group: [JSON.parse(JSON.stringify(groupTemplate))]
    },
    start_time: {
      label: 'Start Time',
      type: 'time',
      required: true,
      value: event?.start_time
    },
    end_time: {
      label: 'End Time',
      type: 'time',
      required: true,
      value: event?.end_time
    },
    image: {
      type: 'file',
      required: false,
      label: 'Optional Image',
      accept: ['jpg', 'jpeg', 'png'],
      max: 1,
      errorMessage: 'Please upload a valid image file',
    },
    status: {
      label: 'Status',
      type: 'select',
      required: true,
      options: [
        {
          label: 'Published', value: 'Published'
          },
        {
          label: 'Canceled', value: 'Canceled'
        },
        {
          label: 'Draft', value: 'Draft'
        },
        {
          label: 'Past Event', value: 'Past Event'
        }
      ],
      default: event?.status
    }
  });

  const handleForm = (id, event) => {
    if (id && event.data) {
      const data = event.data;
        const f = { ...form };
        console.log(data);
        const formatter = new Intl.DateTimeFormat('de-DE', {
          timeZone: 'Europe/Berlin',
          year: 'numeric',
          month: '2-digit',
          day: '2-digit'
        });
        f.date.value = formatter.format(new Date(data.date));
        f.city.value = data.city.name;
        f.city.default = data.city.name;
        f.city.options = [
          { label: data.city.name, value: data.city.name }
        ]
        f.start_time.value = data.start_time;
        f.end_time.value = data.end_time;
        f.image.value = data.image;
        f.image.default = data.image;
        f.tagline.value = data.tagline;
  
        if (data.image) {
          f.image.preview = data.image.startsWith('http')
            ? data.image
            : `${BUCKET}/event/${data.image}`;
        }
  
        f.status.value = data.status;
        f.status.default = data.status;
  
        if(data.bars?.length){
          data.bars.map((dt, i) => {
            f.bars.group[i] = {
              name: {
                label: 'Bar',
                placeholder: 'Bar Name',
                type: 'select',
                required: true,
                options: [
                  {
                    label: dt.name, value: dt.name
                  }
                ],
                default: dt.name,
                value: dt.name
              },
              available_spot: {
                type: 'number',
                label: 'Available Spots',
                required: true,
                value: dt.available_spots
              }
            }
          })
        } else {
          f.bars[0] = {
              name: {
                label: 'Bar',
                placeholder: 'Bar Name',
                type: 'select',
                required: true,
                options: [
                  {
                    label: '', value: ''
                  },
                ],
              },
              available_spot: {
                type: 'number',
                label: 'Available Spots',
                required: true
              }
            }
        }
  
        setForm(f);
    }
  }
  
  useEffect(() => {
    const timer = setTimeout(() => {
      handleForm(id, event)
    }, 30)
  
    return () => clearTimeout(timer)
  }, [event, id]);

  return (
    <Animate>

      <Breadcrumbs items={[
        { name: 'groups', url: '/event-management' },
        { name: 'detail', url: `/event-management/${id}` }
      ]}/>

      <Card loading={ event.loading }>

        { form &&
        <Form inputs={ form } disabled />}

      </Card>
    </Animate>
  )
}