import commitsParser from 'conventional-commits-parser';

const ISSUE_RE = /^(KEEP-\d+)/;

export function parseIssuesFromCommitMessages(commitMessages: string[]) {
  return Array.from(
    new Set(
      commitMessages
        .map(message => {
          const msg = commitsParser.sync(message);

          return (msg.scope ?? msg.header)?.match(ISSUE_RE)?.[1];
        })
        .filter((issue): issue is NonNullable<typeof issue> => issue != null)
    )
  );
}

if (import.meta.vitest) {
  const { expect, expectTypeOf, test } = import.meta.vitest;

  test('getResolvedIssues', () => {
    expectTypeOf(parseIssuesFromCommitMessages([])).toMatchTypeOf<string[]>();

    expect(
      parseIssuesFromCommitMessages([
        'feat(KEEP-1): add some cool feature',
        'fix(KEEP-647): fix some bug',
        "fixed something, don't care about jira tasks",
        'chore(KEEP-243): update readme',
        'anything(KEEP-22): update readme',
        'KEEP-5793: one more bug is fixed',
      ])
    ).toStrictEqual(['KEEP-1', 'KEEP-647', 'KEEP-243', 'KEEP-22', 'KEEP-5793']);

    expect(
      parseIssuesFromCommitMessages([
        "fixed something, don't care about jira tasks",
      ])
    ).toStrictEqual([]);

    expect(
      parseIssuesFromCommitMessages([
        'fix(KEEP-647): fix some bug',
        'fix(KEEP-647): trying to fix it again',
      ])
    ).toStrictEqual(['KEEP-647']);
  });
}
