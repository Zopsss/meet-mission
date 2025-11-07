import { useState } from 'react';
import { ClassHelper, Checkbox } from 'components/lib';
import Style from './table.tailwind.js';

export function Header(props){

  // initialise
  let data = [...props.data]
  let colLength = data?.length ? data.length-1 : 0;

  // state
  const [sortDirections, setSortDirections] = useState(new Array(colLength));

  if (!data)
    return false;

  // inject select
  if (props.select)
    data.unshift({ name: 'select', title: 'Select', sort: false });

  // inject actions
  if (props.actions && props.data[colLength]?.name)
    data.push({ name: 'actions', title: 'Actions', sort: false });

  // sort the columns
  function sort(index, cell){

    // check column is sortable
    // if selectable, there will be an extra header col
    if (!props.data[props.select ? index-1 : index].sort)
      return false;

    const direction =
      sortDirections[index] === 'asc' ? 'desc' : 'asc';

    // reset sorting on all columns
    let sorted = new Array(colLength)
    sorted[index] = direction;

    // done
    props.callback(cell, direction);
    setSortDirections(sorted)

  }

  return(
    <thead className={ Style.thead }>
      <tr>
        { data.map((cell, index) => {

          // style
          const css = ClassHelper(Style, {

            th: true,
            sort: cell.sort,
            th_actions: cell.name === 'actions',
            th_select: cell.name === 'select',
            asc: sortDirections[index] === 'asc',
            desc: sortDirections[index] === 'desc'

          });

          // hide
          if (props.hide?.includes(cell.name))
            return false;

          // select all
          if (cell.name === 'select' && props.hasData){
            return (
              <th key={ index } className={ css }>
                <Checkbox
                  className={ Style.checkbox }
                  checked={ props.selectAll }
                  callback={ props.select }
                />
              </th>
            )
          }

          // show
          if (props.show && !props.show.includes(cell.name) && cell.name !== 'actions')
            return false;

          return (
            <th
              key={index}
              className={css}
              onClick={() => cell.sort && sort(index, cell.name)}
            >
              {cell.name === 'registered_count' ? (
                <span className="inline-flex items-center gap-1">
                  Registered Count
                  <span
                    className="text-gray-400 cursor-help"
                    title="Only paid users are counted in this column"
                  >
                    ⓘ
                  </span>
                </span>
              ) : (
                cell.title?.replaceAll('_', ' ')
              )}
            </th>
          );
        })}
      </tr>
    </thead>
  );
}
