import {h, Component} from 'preact'
import proptypes from 'proptypes'
import {bindActionCreators} from 'redux'
import {connectHelper} from 'lib/util'

import * as Constants from 'lib/constants'
import * as documentActions from 'actions/documentActions'
import * as fieldComponents from 'lib/field-components'

import Style from 'lib/Style'
import styles from './MediaEditor.css'

import Button from 'components/Button/Button'
import DocumentField from 'containers/DocumentField/DocumentField'
import EditInterface from 'components/EditInterface/EditInterface'
import EditInterfaceSection from 'components/EditInterface/EditInterfaceSection'
import Field from 'components/Field/Field'
import Label from 'components/Label/Label'
import TextInput from 'components/TextInput/TextInput'

const fileSize = require('file-size')

/**
 * Renders an editing interface for media documents.
 */
class MediaEditor extends Component {
  static propTypes = {
    /**
      * The global actions object.
    */
    actions: proptypes.object,

    /**
     * The API to operate on.
     */
    api: proptypes.object,    

    /**
     * The collection to operate on.
     */
    collection: proptypes.object,

    /**
     * The document to operate on.
     */
    documentData: proptypes.object,

    /**
     * The global state object.
     */
    state: proptypes.object
  }

  // Handles the callback that fires whenever a field changes and the new value
  // is ready to be sent to the store.
  handleFieldChange(fieldName, value, persistInLocalStorage = true) {
    const {
      actions,
      collection
    } = this.props

    actions.updateLocalDocument({
      path: collection.path,
      persistInLocalStorage,
      update: {
        [fieldName]: value
      }
    })
  }

  // Handles the callback that fires whenever there's a new validation error
  // in a field or when a validation error has been cleared.
  handleFieldError(fieldName, hasError, value) {
    const {actions} = this.props

    actions.setFieldErrorStatus(fieldName, value, hasError)
  }  

  // Renders a field, deciding which component to use based on the field type.
  render() {
    const {
      state
    } = this.props
    const {app, document} = state
    const hasAttemptedSaving = document.saveAttempts > 0
    const hasError = document.validationErrors

    // As per API docs, validation messages are in the format "must be xxx", which
    // assumes that something (probably the name of the field) will be prepended to
    // the string to form a final error message. For this reason, we're prepending
    // the validation message with "This field", but this is something that we can
    // easily revisit.
    const error = typeof hasError === 'string' ?
      'This field ' + hasError :
      hasError

    return (
      <EditInterface>
        <EditInterfaceSection
          isActive={true}
          main={this.renderMain()}
          sidebar={this.renderSidebar()}
        />      
      </EditInterface>
    )
  }

  renderMain(fields) {
    const {documentData} = this.props

    return (
      <div>
        <Field>
          <Label
            label="Preview"
          >
            <div class={styles.preview}>
              {this.renderPreview(documentData)}
            </div>
          </Label>
        </Field>
      </div>
    )
  }

  renderPreview(document) {
    const {state} = this.props
    const {config} = state.app
    const {mimeType = ''} = document
    const canonicalPath = document.path && (
      document.path.indexOf('/') === 0 ? document.path : `/${document.path}`
    )
    const url = (config.cdn && config.cdn.publicUrl) ?
      `${config.cdn.publicUrl}${canonicalPath}` :
      (document.url || canonicalPath)    

    if (mimeType.includes('image/')) {
      return (
        <img
          class={styles['image-preview']}
          src={url}
        />
      )
    }

    if (mimeType === 'application/pdf') {
      return (
        <object
          class={styles['pdf-preview']}
          data={url}
          type="application/pdf"
        >
          <iframe src={url} />
        </object>
      )
    }

    return (
      <p>No preview available for this file type</p>
    )
  }

  renderSidebar(fields) {
    const {
      api,
      documentData
    } = this.props

    return (
      <div>
        <Field>
          <Label
            label="MIME type"
          >
            <TextInput
              readonly={true}
              value={documentData.mimeType}
            />
          </Label>
        </Field>

        <Field>
          <Label
            label="File size"
          >
            <TextInput
              readonly={true}
              value={fileSize(documentData.contentLength).human('si')}
            />
          </Label>
        </Field>

        <Field>
          <Label
            label="File path"
          >
            <TextInput
              readonly={true}
              value={documentData.path}
            />
          </Label>
        </Field>

        <Field>
          <Label
            label="Public URL"
          >
            <TextInput
              readonly={true}
              value={documentData.url}
            />

            {documentData.url && (
              <Button
                accent="neutral"
                className={styles['link-button']}
                href={documentData.url} 
                openInNewWindow={true}
                size="small"
              >Open in new window</Button>
            )}
          </Label>
        </Field>

        {documentData.width !== undefined && (
          <Field>
            <Label
              label="Width"
            >
              <TextInput
                readonly={true}
                value={documentData.width}
              />
            </Label>
          </Field>
        )}

        {documentData.height !== undefined && (
          <Field>
            <Label
              label="Height"
            >
              <TextInput
                readonly={true}
                value={documentData.height}
              />
            </Label>
          </Field>
        )}

        <DocumentField
          api={api}
          collection={Constants.MEDIA_COLLECTION_SCHEMA}
          field={{
            _id: 'caption',
            type: 'String',
            label: 'Caption'
          }}
        />

        <DocumentField
          api={api}
          collection={Constants.MEDIA_COLLECTION_SCHEMA}
          field={{
            _id: 'altText',
            type: 'String',
            label: 'Alt text'
          }}
        />

        <DocumentField
          api={api}
          collection={Constants.MEDIA_COLLECTION_SCHEMA}
          field={{
            _id: 'copyright',
            type: 'String',
            label: 'Copyright Information'
          }}
        />
      </div>
    )
  }
}

export default connectHelper(
  state => ({
    api: state.api,
    app: state.app,
    document: state.document,
    router: state.router
  }),
  dispatch => bindActionCreators({
    ...documentActions
  }, dispatch)
)(MediaEditor)
