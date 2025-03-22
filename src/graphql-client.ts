import {graphql} from '@octokit/graphql'

// Create the GraphQL client with auth
export const graphqlWithAuth = graphql.defaults({
  headers: {
    authorization: `token ${process.env.GITHUB_TOKEN}`
  }
})
