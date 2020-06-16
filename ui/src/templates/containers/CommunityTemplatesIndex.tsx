import React, {Component} from 'react'
import {withRouter, WithRouterProps} from 'react-router'
import {connect} from 'react-redux'

// Components
import {ErrorHandling} from 'src/shared/decorators/errors'
import {
  Bullet,
  Button,
  ComponentColor,
  ComponentSize,
  Heading,
  HeadingElement,
  Input,
  LinkButton,
  LinkTarget,
  Page,
  Panel,
} from '@influxdata/clockface'
import SettingsTabbedPage from 'src/settings/components/SettingsTabbedPage'
import SettingsHeader from 'src/settings/components/SettingsHeader'

import {setActiveCommunityTemplate} from 'src/templates/actions/creators'
import {getOrg} from 'src/organizations/selectors'

// Utils
import {pageTitleSuffixer} from 'src/shared/utils/pageTitles'
import {
  getGithubUrlFromTemplateName,
  getTemplateNameFromGithubUrl,
} from 'src/templates/utils'

import {postPackagesApply} from 'src/client'

// Types
import {AppState, Organization} from 'src/types'

const communityTemplatesUrl =
  'https://github.com/influxdata/community-templates#templates'

interface StateProps {
  org: Organization
}

interface OwnProps extends WithRouterProps {
  params: {templateName: string}
}

type Props = OwnProps & StateProps

// works specifically for csgo, the greatest community template ever conceived
// https://github.com/influxdata/community-templates/tree/master/csgo
const getRawYamlFromGithub = repoUrl => {
  return repoUrl
    .replace('github.com', 'raw.githubusercontent.com')
    .replace('tree/', '')
}

@ErrorHandling
class UnconnectedTemplatesIndex extends Component<Props> {
  state = {
    currentTemplate: '',
  }

  public componentDidMount() {
    if (this.props.params.templateName) {
      const currentTemplate = getGithubUrlFromTemplateName(
        this.props.params.templateName
      )

      this.setState({currentTemplate}, () => {
        this.applyPackages(
          this.props.org.id,
          getTemplateNameFromGithubUrl(currentTemplate)
        )
      })
    }
  }

  public render() {
    const {org, children} = this.props
    return (
      <>
        <Page titleTag={pageTitleSuffixer(['Templates', 'Settings'])}>
          <SettingsHeader />
          <SettingsTabbedPage activeTab="templates" orgID={org.id}>
            {/* todo: maybe make this not a div */}
            <div className="community-templates-upload">
              <Panel className="community-templates-upload-panel">
                <Panel.SymbolHeader
                  symbol={<Bullet text={1} size={ComponentSize.Medium} />}
                  title={
                    <Heading element={HeadingElement.H4}>
                      Find a template then return here to install it
                    </Heading>
                  }
                  size={ComponentSize.Small}
                >
                  <LinkButton
                    color={ComponentColor.Primary}
                    href={communityTemplatesUrl}
                    size={ComponentSize.Small}
                    target={LinkTarget.Blank}
                    text="Browse Community Templates"
                  />
                </Panel.SymbolHeader>
              </Panel>
              <Panel className="community-templates-panel">
                <Panel.SymbolHeader
                  symbol={<Bullet text={2} size={ComponentSize.Medium} />}
                  title={
                    <Heading element={HeadingElement.H4}>
                      Paste the Template's Github URL below
                    </Heading>
                  }
                  size={ComponentSize.Medium}
                />
                <Panel.Body size={ComponentSize.Large}>
                  <div>
                    <Input
                      className="community-templates-template-url"
                      onChange={this.handleTemplateChange}
                      placeholder="Enter the URL of an InfluxDB Template..."
                      style={{width: '80%'}}
                      value={this.state.currentTemplate}
                    />
                    <Button
                      onClick={this.startTemplateInstall}
                      size={ComponentSize.Small}
                      text="Lookup Template"
                    />
                  </div>
                </Panel.Body>
              </Panel>
            </div>
          </SettingsTabbedPage>
        </Page>
        {children}
      </>
    )
  }

  private applyPackages = async (orgID, templateName) => {
    const yamlLocation =
      getRawYamlFromGithub(this.state.currentTemplate) + `/${templateName}.yml`

    const params = {
      data: {
        dryRun: true,
        orgID,
        remotes: [{url: yamlLocation}],
      },
    }
    try {
      const resp = await postPackagesApply(params)
      if (resp.status < 300) {
        const template = resp.data.summary
        this.props.setActiveCommunityTemplate(template)
        return template
      }
      console.error('Failed to apply packages: ', resp)
    } catch (err) {
      console.error(err)
    }
  }

  private startTemplateInstall = () => {
    if (!this.state.currentTemplate) {
      console.error('undefined')
      return false
    }

    const name = getTemplateNameFromGithubUrl(this.state.currentTemplate)
    this.showInstallerOverlay(name)
    this.applyPackages(this.props.org.id, name)
  }

  private showInstallerOverlay = templateName => {
    const {router, org} = this.props

    router.push(`/orgs/${org.id}/settings/templates/import/${templateName}`)
  }

  private handleTemplateChange = event => {
    this.setState({currentTemplate: event.target.value})
  }
}

const mstp = (state: AppState): StateProps => {
  return {
    org: getOrg(state),
  }
}

const mdtp = {
  setActiveCommunityTemplate,
}

export const CommunityTemplatesIndex = connect<StateProps, {}, {}>(
  mstp,
  mdtp
)(withRouter<{}>(UnconnectedTemplatesIndex))
