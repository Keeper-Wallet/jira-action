import { getInput, setFailed } from '@actions/core';
import { context, getOctokit } from '@actions/github';
import { HttpClient } from '@actions/http-client';
import { CreateEvent, PushEvent } from '@octokit/webhooks-definitions/schema';

import { parseIssuesFromCommitMessages } from './utils';

async function getAllIssues({
  base,
  head,
  octokit,
}: {
  base: string;
  head: string;
  octokit: ReturnType<typeof getOctokit>;
}) {
  const commitMessages = await octokit.paginate(
    octokit.rest.repos.compareCommits,
    {
      base,
      head,
      owner: context.repo.owner,
      per_page: 100,
      repo: context.repo.repo,
    },
    response => response.data.commits.map(({ commit }) => commit.message)
  );

  return parseIssuesFromCommitMessages(commitMessages);
}

async function run() {
  try {
    const octokit = getOctokit(getInput('github-token', { required: true }));
    const hooksUrl = getInput('hooks-url', { required: true });
    const http = new HttpClient();

    switch (context.eventName) {
      case 'create': {
        const component = getInput('component', { required: true });
        const hookRelease = getInput('hook-release', { required: true });

        const payload = context.payload as CreateEvent;

        if (payload.ref_type === 'branch') {
          throw new Error('Did not expect to be used on branch creation');
        }

        const [currentTagRef, tags] = await Promise.all([
          octokit.rest.git.getRef({
            owner: context.repo.owner,
            ref: context.ref,
            repo: context.repo.repo,
          }),
          octokit.rest.repos.listTags({
            owner: context.repo.owner,
            repo: context.repo.repo,
            per_page: 1,
          }),
        ]);

        const [currentTag, issues] = await Promise.all([
          octokit.rest.git.getTag({
            owner: context.repo.owner,
            repo: context.repo.repo,
            tag_sha: currentTagRef.data.object.sha,
          }),
          getAllIssues({
            base: tags.data[0].commit.sha,
            head: currentTagRef.data.object.sha,
            octokit,
          }),
        ]);

        const releaseVersion = currentTag.data.tag;
        const url = `${hooksUrl}/${hookRelease}`;
        const body = JSON.stringify({ component, issues, releaseVersion });
        const headers = { 'Content-Type': 'application/json' };

        await http.post(url, body, headers);
        break;
      }

      case 'push': {
        const hookMerge = getInput('hook-merge', { required: true });
        const payload = context.payload as PushEvent;

        const issues = await getAllIssues({
          base: payload.before,
          head: payload.after,
          octokit,
        });

        const url = `${hooksUrl}/${hookMerge}`;
        const body = JSON.stringify({ issues });
        const headers = { 'Content-Type': 'application/json' };

        await http.post(url, body, headers);
        break;
      }

      default:
        throw new Error(`Unexpected event name: ${context.eventName}`);
    }
  } catch (error) {
    setFailed(error instanceof Error ? error.message : String(error));
  }
}

run();
