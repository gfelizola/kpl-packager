# kpl-packager
create a branch with selection of GitHub approved Pull Requests

# Install
```
npm install -g kpl-packager
```

# Usage

Generate a GitHub API Token at https://github.com/settings/tokens
and save it in a env var called `GITHUB_API_TOKEN` with:

```
export GITHUB_API_TOKEN='my-generated-token'
```

(you can change your `~/.bash_profile` to work in all terminal sessions).

Then:

```
cd path/to/my/repo
kpl-packager
```