'use strict'

import * as documentsActions from 'actions/documentsActions'
import {bindActionCreators} from 'redux'
import {connectHelper} from 'lib/util'
import {h, Component} from 'preact'
import proptypes from 'proptypes'
import Button from 'components/Button/Button'
import DropArea from 'components/DropArea/DropArea'
import FileUpload from 'components/FileUpload/FileUpload'
import styles from './MediaListController.css'

/**
 * A controller bar for a list of media documents.
 */
class DocumentListController extends Component {
  static propTypes = {
    /**
     * The global actions object.
     */
    actions: proptypes.object,

    /**
     * The API to operate on.
     */
    api: proptypes.object
  }

  handleUpload(files) {
    const {actions, api} = this.props

    actions.saveMediaDocuments({
      api,
      files: Array.from(files)
    })
  }

  render() {
    return (
      <div>
        <DropArea
          className={styles.droparea}
          onDrop={this.handleUpload.bind(this)}
        >
          <div class={styles.wrapper}>
            <p>Drop files to upload</p>

            <span class={styles.separator}>or</span>

            <FileUpload
              multiple={true}
              onChange={this.handleUpload.bind(this)}
            >
              <Button
                accent="data"
                type="mock-stateful"
              >Select files</Button>
            </FileUpload>
          </div>
        </DropArea>
      </div>
    )
  }
}

export default connectHelper(
  state => ({
    api: state.api,
    app: state.app,
    documents: state.documents,
    router: state.router
  }),
  dispatch => bindActionCreators(documentsActions, dispatch)
)(DocumentListController)
