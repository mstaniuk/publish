import {Component, h} from 'preact'
import proptypes from 'proptypes'

import styles from './Main.css'
import normalize from './Normalize.css'

import LoadingBar from 'containers/LoadingBar/LoadingBar'
import NotificationCentre from 'containers/NotificationCentre/NotificationCentre'

/**
 * The main content body element.
 */
export default class Main extends Component {
  render() {
    return (
      <main>
        {this.props.children}
        <LoadingBar />
        <NotificationCentre />
      </main>
    )
  }
}
