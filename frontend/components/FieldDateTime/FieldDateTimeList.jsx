'use strict'

import {h, Component} from 'preact'
import proptypes from 'proptypes'

import DateTime from 'lib/datetime'

/**
 * Component for rendering API fields of type String on a list view.
 */
export default class FieldDateTimeList extends Component {
  static propTypes = {
    /**
     * App config.
     */
    config: proptypes.object,

    /**
     * The field schema.
     */
    schema: proptypes.object,

    /**
     * The field value.
     */
    value: proptypes.string
  }

  getDateFormat() {
    const {config, schema} = this.props

    return schema.format || config.formats.date.long
  }

  render() {
    const {config, schema, value} = this.props

    // If there's no value, we return `null`.
    if (!value) return null

    const dateFormat = this.getDateFormat()
    const dateTimeObj = new DateTime(value, dateFormat)

    return (dateTimeObj.isValid() && dateTimeObj.format(dateFormat)) || value
  }
}
