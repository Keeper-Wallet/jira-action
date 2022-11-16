import { getInput, setFailed } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { HttpClient } from '@actions/http-client';
import { PushEvent } from '@octokit/webhooks-definitions/schema';

import { parseIssuesFromCommitMessages } from './utils';

const octokit = getOctokit(getInput('github-token', { required: true }));
const { owner, repo } = context.repo;

async function getAllIssuesSince(base: string) {
  const commitMessages = await octokit.paginate(
    octokit.rest.repos.compareCommits,
    {
      base,
      head: context.sha,
      owner,
      per_page: 100,
      repo,
    },
    response => response.data.commits.map(({ commit }) => commit.message)
  );

  return parseIssuesFromCommitMessages(commitMessages);
}

async function run() {
  try {
    if (context.eventName !== 'push') {
      throw new Error('Only running on push event is supported for now');
    }

    let releaseVersion = getInput('release-version', { required: true });

    let report: 'merge' | 'release';

    if (releaseVersion) {
      report = 'release';
    } else if (process.env.GITHUB_REF_TYPE === 'tag') {
      if (!process.env.GITHUB_REF_NAME) {
        throw new Error('Expected GITHUB_REF_NAME to be present');
      }

      releaseVersion = process.env.GITHUB_REF_NAME;
      report = 'release';
    } else {
      report = 'merge';
    }

    const hooksUrl = getInput('hooks-url', { required: true });
    const http = new HttpClient();

    switch (report) {
      case 'merge': {
        const hookMerge = getInput('hook-merge', { required: true });
        const payload = context.payload as PushEvent;

        const issues = await getAllIssuesSince(payload.before);

        const url = `${hooksUrl}/${hookMerge}`;
        const headers = { 'Content-Type': 'application/json' };
        const body = JSON.stringify({ issues });

        if (issues.length === 0) {
          // eslint-disable-next-line no-console
          console.log('No issues to report');
        } else {
          // eslint-disable-next-line no-console
          console.log(`✅ Reporting issues as merged: ${issues.join(', ')}`);
          await http.post(url, body, headers);
        }
        break;
      }
      case 'release': {
        const component = getInput('component', { required: true });
        const hookRelease = getInput('hook-release', { required: true });

        const tags = await octokit.rest.repos.listTags({
          owner,
          repo,
          per_page: 1,
        });

        const issues = await getAllIssuesSince(tags.data[0].name);

        const url = `${hooksUrl}/${hookRelease}`;
        const headers = { 'Content-Type': 'application/json' };
        const body = JSON.stringify({ component, issues, releaseVersion });

        if (issues.length === 0) {
          // eslint-disable-next-line no-console
          console.log('No issues to report');
        } else {
          // eslint-disable-next-line no-console
          console.log(
            `🚀 Reporting issues as released in ${component} ${releaseVersion}: ${issues.join(
              ', '
            )}`
          );

          await http.post(url, body, headers);
        }
        break;
      }
      default:
        throw new Error(
          `Unexpted value of GITHUB_REF_TYPE: ${process.env.GITHUB_REF_TYPE}`
        );
    }
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
