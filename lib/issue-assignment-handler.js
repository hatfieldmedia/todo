const axios = require('axios')
const { titleChange } = require('./templates')

axios.defaults.baseURL = 'https://api.mavenlink.com/api/v1'
axios.defaults.headers.common['Authorization'] = `Bearer ${process.env.MAVENLINK_OAUTH}`

/**
 * @param {import('probot').Context} context
 */
module.exports = async context => {
  const { issue, action, assignee } = context.payload
  const app = process.env.APP_NAME + '[bot]'
  const ml = process.env.MAVENLINK_OAUTH


  try {

    // First we need to make sure the workspace is synced

    const mlWorkspace = await getMavenlinkWorkspaceByGithubRepoName(issue.repository_url.replace('https://api.github.com/repos/hatfieldmedia/', ''))

    // Second we need to make sure the issue exists in mavenlink tbh, if it doesn't, do nothing

    const mlIssue = await getMavenlinkIssueByGithubIssueNumber(issue.number, mlWorkspace.id)

    // Finally we need to make sure the github user exists in Mavenlink

    const mlUser = await getMavenlinkUserByGithubUsername(assignee.login)

    if(action == 'assigned' && !mlIssue.assignee_ids.includes(mlUser.id)){
      mlIssue.assignee_ids.push(mlUser.id)
    }

    if(action == 'unassigned' && mlIssue.assignee_ids.includes(mlUser.id)){
      mlIssue.assignee_ids = mlIssue.assignee_ids.filter(item => {
        return item !== mlUser.id
      })
    }

    await updateMavenlinkStory(mlIssue)

  } catch (e) {
    context.log(e)
  }

}

function updateMavenlinkStory(story){
  return new Promise((resolve, reject) => {
    axios.put(`/stories/${story.id}`, {
      story: {
        assignees: story.assignee_ids
      }
    }).then(res => {
      if(res.data.count == 1){
        resolve(res.data.stories[res.data.results[0].id])
      } else {
        reject("Issue updating the story.")
      }
    }).catch(err => {
      reject(err)
    })
  })
}

function getMavenlinkIssueByGithubIssueNumber(issueNumber, mlWorkspaceId){
  return new Promise((resolve, reject) => {
    axios.get(`/stories?archived=exclude&include=assignees&external_reference_service_name=github&external_reference_service_model=issue&external_reference_service_model_ref=${issueNumber}&workspace_id=${mlWorkspaceId}`).then(res => {
      if(res.data.count == 1){
        resolve(res.data.stories[res.data.results[0].id])
      } else if (res.data.count == 0){
        // Should we create the issue here? Maybe, extra syncing
        reject("No issue found")
      }
    })
  })
}

function getMavenlinkUserByGithubUsername(username){
  return new Promise((resolve, reject) => {
    axios.get(`/users?by_custom_text_value=799685:${username}`).then(res => {
      if(res.data.count == 1){
        resolve(res.data.users[res.data.results[0].id])
      } else {
        reject("No mavenlink user found.")
      }
    });
  })
}

function getMavenlinkWorkspaceByGithubRepoName(name) {
  return new Promise((resolve, reject) => {
    axios.get(`/workspaces?archived=exclude&by_custom_text_value=798535:${name}`).then(res => {
      if(res.data.count == 1){
        resolve(res.data.workspaces[res.data.results[0].id])
      } else if(res.data.count == 0){
        reject('Please make sure that the "Github Repo Name" custom field in Mavenlink is filled out.')
      } else {
        reject('Please make sure that there is only one Mavenlink project with this Github Repo Name custom field.')
      }
    })
  })
}
