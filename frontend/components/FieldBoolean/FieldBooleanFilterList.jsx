'use strict'

import {h, Component} from 'preact'
import proptypes from 'proptypes'

/**
 * Component for rendering API fields of type Boolean on a list view.
 */
export default class FieldBooleanList extends Component {
  static propTypes = {
    /**
     * App config.
     */
    config: proptypes.object,

    /**
     * Node with rendered field name.
     */
    nodeField: proptypes.node,

    /**
     * Node with rendered filter operator.
     */
    nodeOperator: proptypes.node,

    /**
     * Field value.
     */
    value: proptypes.object
  }

  render() {
    const {nodeField, value} = this.props

    return (
      <span>is {value ? '' : 'not '}{nodeField}</span>
    )
  }
}
