/***
*
*   NEW TEMPLATE
*   Upload a new template
*
**********/

import { useState, useEffect, useCallback } from 'react';
import { Animate, Card, Form, useLocation, Helper, Loader, useAPI } from 'components/lib';
import Axios from 'axios';

import Settings from 'settings';
const BUCKET = Settings[process.env.NODE_ENV].s3_bucket;

export function EventEditor(props){

  const location = useLocation();
  const path = location?.pathname?.split('/');
  const group = path[2];
  const id = path[3];
  const event = useAPI(id ? `/api/event-management/${id}` : false)
  const city = useAPI(`/api/city`)

  const groupTemplate = {
      name: {
        label: 'Bar',
        placeholder: 'Bar Name',
        type: 'select',
        required: true,
        options: null
      },
      available_spots: {
        type: 'number',
        label: 'Available Spots',
        required: true,
      },
  }

  const [form, setForm] = useState({
    date: {
      label: 'Date',
      type: 'date',
      required: true,
      value: event?.date
    },
    city: {
      label: 'City',
      type: 'select',
      required: true,
      options: null,
      default: event?.city?._id
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
    // status: {
    //   label: 'Status',
    //   type: 'select',
    //   required: true,
    //   options: [
    //     {
    //       label: 'Upcoming Event', value: 'Upcoming Event'
    //     },
    //     {
    //       label: 'Past Event', value: 'Past Event'
    //     },
    //     {
    //       label: 'Draft', value: 'Draft'
    //     },
    //     {
    //       label: 'Canceled', value: 'Canceled'
    //     }
    //   ],
    //   default: event?.status
    // },
    ...id !== null ? {
      subject_email: {
        label: 'Subject Email',
        type: 'text',
        required: false,
        value: event?.subject_email
      },
      body_email: {
        label: 'Body Email',
        type: 'editor',
        required: false,
        value: event?.body_email
      },
    } : {}
  });

  const handleForm = async (id, event) => {
    if (id && event.data) {
      const data = event.data;
      const f = { ...form };

      f.date.value = data.date;
      f.city.value = data.city._id;
      f.city.default = data.city._id;
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

      if (id !== null) {
        f.subject_email = {
          label: 'Subject Email',
          type: 'text',
          required: false,
          value: data.subject_email || ''
        };
        f.body_email = {
          label: 'Body Email',
          type: 'editor',
          required: false,
          value: data.body_email || ''
        };
      }
      const bars = await getBar(data.city._id);
      if(data.bars?.length){
        data.bars.map((dt, i) => {
          f.bars.group[i] = {
            name: {
              label: 'Bar',
              placeholder: 'Bar Name',
              type: 'select',
              required: true,
              options: bars.map((bar) => {
                return {
                  label: bar.name,
                  value: bar._id
                }
              }),
              default: dt._id,
              value: dt._id
            },
            available_spots: {
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
              options: bars.map((bar) => {
                return {
                  label: bar.name,
                  value: bar._id
                }
              }),
            },
            available_spots: {
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

  const handleCity = (city, form) => {
    const f = { ...form };
    f.city.options = city?.data?.map((ct) => {
      return {
        label: ct.name, value: ct._id
      }
    })
    setForm(f);
  }

  useEffect(() => {
    const timer = setTimeout(() => {
      handleCity(city, form)
    }, 30)

    return () => clearTimeout(timer)
  }, [city, form])

  const getBar = useCallback(async (id) => {
    try {
      const res = await Axios({

        url: `/api/location/city/${id}`,
        method: 'get',
        
      })

      const data = res.data.data;
      const f = { ...form };
      if(data?.length){
        f.bars.group?.map((dt, i) => {
          f.bars.group[i] = {
            name: {
              label: 'Bar',
              placeholder: 'Bar Name',
              type: 'select',
              required: true,
              options: data.map((dt) => {
                return {
                  label: dt.name,
                  value: dt._id
                }
              }),
              default: f.bars.group[i]._id,
              value: f.bars.group[i]._id
            },
            available_spots: {
              type: 'number',
              label: 'Available Spots',
              required: true,
              value: f.bars.group[i].available_spots
            }
          }
        })
      } else {
        f.bars.group[0] = {
            name: {
              label: 'Bar',
              placeholder: 'Bar Name',
              type: 'select',
              required: true,
              options: data.map((dt) => {
                return {
                  label: dt.name,
                  value: dt._id
                }
              }),
            },
            available_spots: {
              type: 'number',
              label: 'Available Spots',
              required: true
            }
          }
      }
      return data
    }
    catch (err){
      console.log(err);
    }
  }, [form])

  function update(data){
    if(data.input === 'city'){
      getBar(data.value);
    }
    if (data.input === 'placeholders'){
      
      // show the dropdown
      if (data.group.input === 'type'){

        const f = {...form }

        if (data.value === 'select'){

          // is select - set default select value
          if (!f.placeholders.group[data.group.index].type.value){

            f.placeholders.group[data.group.index].type.value = 'text';
            f.placeholders.group[data.group.index].type.default = 'text';
            
          }

          // show the options input textarea
          f.placeholders.group[data.group.index].options.required = true;
          f.placeholders.group[data.group.index].options.type = 'textarea'
          f.placeholders.group[data.group.index].type.items = null

          const type = f.placeholders.group[data.group.index].type.value

          f.placeholders.group[data.group.index].required.type = 'switch';
          f.placeholders.group[data.group.index].default_value.type = type === 'select' ? 'text' : type;
          f.placeholders.group[data.group.index].default_value.required = true;

        } else if (data.value === 'group'){
          // is group - set default group value

          f.placeholders.group[data.group.index].type.items = [groupTemplate];
          f.placeholders.group[data.group.index].type.default = 'group';
          f.placeholders.group[data.group.index].options.type = null;
          f.placeholders.group[data.group.index].options.required = false;

          f.placeholders.group[data.group.index].required.type = null;
          f.placeholders.group[data.group.index].default_value.type = null;
          f.placeholders.group[data.group.index].default_value.required = false;

        } else if (data.value === 'card_selector'){
          // is group - set default group value

          f.placeholders.group[data.group.index].type.items = [cardGroupTemplate];
          f.placeholders.group[data.group.index].type.default = 'card_selector';
          f.placeholders.group[data.group.index].options.type = null;
          f.placeholders.group[data.group.index].options.required = false;

          f.placeholders.group[data.group.index].required.type = null;
          f.placeholders.group[data.group.index].default_value.type = null;
          f.placeholders.group[data.group.index].default_value.required = false;

        } else {
          // not select - hide the dropdown options
          f.placeholders.group[data.group.index].options.type = null;
          f.placeholders.group[data.group.index].options.required = false;
          f.placeholders.group[data.group.index].type.items = null;

          const type = f.placeholders.group[data.group.index].type.value

          f.placeholders.group[data.group.index].required.type = 'switch';
          f.placeholders.group[data.group.index].default_value.type = type === 'select' ? 'text' : type;
          f.placeholders.group[data.group.index].default_value.required = true;

        }

        setForm(f);

      }

      // show chatgpt prompt
      if (data.group.input === 'use_chatgpt'){

        const f = {...form }

        if (data.value === true){

          // switch on
          f.placeholders.group[data.group.index].chatgpt_prompt.type = 'textarea';
          f.placeholders.group[data.group.index].chatgpt_prompt.required = true;

        }
        else {

          // switch off
          f.placeholders.group[data.group.index].chatgpt_prompt.type = null;
          f.placeholders.group[data.group.index].chatgpt_prompt.required = false;
          f.placeholders.group[data.group.index].chatgpt_prompt.value = null;
        }

        setForm(f);

      }

      // show chatgpt prompt
      if (data.group.input === 'required'){

        const f = {...form }
        
        if (data.value === true){

          // switch on
          f.placeholders.group[data.group.index].default_value.type = null;
          // f.placeholders.group[data.group.index].default_value.value = null;
          f.placeholders.group[data.group.index].default_value.required = false;

        }
        else {
          const type = f.placeholders.group[data.group.index].type.value
          // switch off
          f.placeholders.group[data.group.index].default_value.type = type === 'select' ? 'text' : type;
          // f.placeholders.group[data.group.index].default_value.value = null;
          f.placeholders.group[data.group.index].default_value.required = true;
        }

        setForm(f);

      }
    }
    if (data.value?.input === 'required' && data.indexSource){
      const f = {...form }

      if (data.input === true){
        f.placeholders.group[data.indexSource].type.items[data.value.index][data.value.input].default = true;
        // switch on
        f.placeholders.group[data.indexSource].type.items[data.value.index].default_value.type = null;
        f.placeholders.group[data.indexSource].type.items[data.value.index].default_value.required = false;

      }
      else {
        const type = f.placeholders.group[data.indexSource].type.items[data.value.index].type.value
        // switch off
        f.placeholders.group[data.indexSource].type.items[data.value.index][data.value.input].default = false;
        f.placeholders.group[data.indexSource].type.items[data.value.index].default_value.type = type === 'select' ? 'text' : type;
        f.placeholders.group[data.indexSource].type.items[data.value.index].default_value.required = true;
      }

      setForm(f);
    }

    if (data.input === 'select' && data.indexSource){
      const f = {...form }
      // is select - set default select value
      if (!f.placeholders.group[data.indexSource].type.items[data.value.index].type.value){

        f.placeholders.group[data.indexSource].type.items[data.value.index].type.value = 'text';
        f.placeholders.group[data.indexSource].type.items[data.value.index].type.default = 'text';
        
      }

      // show the options input textarea
      f.placeholders.group[data.indexSource].type.items[data.value.index].options.required = true;
      f.placeholders.group[data.indexSource].type.items[data.value.index].options.type = 'textarea'

    } else if (data.indexSource && data.input !== 'placeholders' && data.value?.input !== 'options') {
      const f = {...form }
      if(f.placeholders.group[data.indexSource].type.items[data.value.index].options){
        f.placeholders.group[data.indexSource].type.items[data.value.index].options.required = false;
        f.placeholders.group[data.indexSource].type.items[data.value.index].options.type = null
      }
    }
    if (data.input === 'test_mode_users') {
      const f = { ...form };
    
      f.test_mode_users.value = data.value;
    
      setForm(f);
    }

    if(data.source === "placeholders") {
      const f = { ...form };
      const isRequired = f.placeholders.group[data.indexSource].type.items[data.value.index].required?.default;
      const typeOpt = f.placeholders.group[data.indexSource].type.items[data.value.index].type?.value;
      
      // switch on
      if(!isRequired && !['card_selector', 'group'].includes(typeOpt)){
        if(f.placeholders.group[data.indexSource].type.items[data.value.index].default_value){
          f.placeholders.group[data.indexSource].type.items[data.value.index].default_value.type = typeOpt !== 'file' ? typeOpt : 'file' ;
          f.placeholders.group[data.indexSource].type.items[data.value.index].default_value.required = true;
        }
      } else {
        f.placeholders.group[data.indexSource].type.items[data.value.index].default_value.type = null;
        f.placeholders.group[data.indexSource].type.items[data.value.index].default_value.required = false;
      }
    
      setForm(f);
    }
  }

  if (event.loading)
    return <Loader />

  return (
    <Animate>

      <Card title={ id ? 'Edit Event' : 'New Event' }>
        <Form
          cols={{ left: 3, right: Object.keys(form).length-3 }}
          inputs={ form }
          clientSideUpload
          updateOnChange
          onChange={ update }
          method={ id ? 'patch' : 'post' }
          url={ id ? `/api/event-management/${id}` : '/api/event-management' }
          buttonText={ 'Save and Publish' }
          buttonDraftText={ 'Save as Draft' }
          redirect={ id ? false : '/event-management' }
          callback={ res => {

            // clear file inputs after uploading
            const f = {...form }

            setForm(f);

          }}
        />
      </Card>
    </Animate>
  )
}