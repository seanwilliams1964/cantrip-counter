# Developer Release Notes

These notes are retained for the module maintainer. The release workflow excludes
the `.github` directory from the distributed Cantrip Counter ZIP.

## Validation

Run the domain smoke tests before preparing a release:

```sh
node .github/scripts/domain-smoke.mjs
```

## Manual release commands

```sh
git add .
git commit -m "Release v1.4.0"
git tag v1.4.0
git push origin main
git push origin v1.4.0
```

## Release alias definition

```sh
git config --global alias.release '!f() { \
  VERSION=$1; \
  if [ -z "$VERSION" ]; then \
    echo "Usage: git release x.y.z"; \
    exit 1; \
  fi; \
  BRANCH=$(git rev-parse --abbrev-ref HEAD); \
  if [ "$BRANCH" = "main" ]; then \
    echo "Do not run release from main. Run it from your feature branch."; \
    exit 1; \
  fi; \
  echo "Releasing v$VERSION from branch $BRANCH..."; \
  \
  # Update module.json version safely (macOS + Linux compatible) \
  TMP_FILE=$(mktemp); \
  jq --arg v "$VERSION" ".version = \$v" module.json > "$TMP_FILE" && mv "$TMP_FILE" module.json; \
  \
  git add module.json; \
  git commit -m "Release v$VERSION"; \
  \
  git checkout main && \
  git pull origin main && \
  git merge $BRANCH && \
  git tag v$VERSION && \
  git push origin main && \
  git push origin v$VERSION && \
  git checkout $BRANCH; \
  \
  echo "Release v$VERSION complete."; \
}; f'
```

## Using the alias

Commit the feature changes, then invoke the alias with the release version:

```sh
git add .
git commit -m "Your changes"
git release 2.2.1
```

The alias:

1. Requires a version argument.
2. Refuses to run from `main`.
3. Updates the version in `module.json`.
4. Commits the version update.
5. Checks out and updates `main`.
6. Merges the current feature branch.
7. Creates and pushes the version tag.
8. Pushes `main`.
9. Returns to the feature branch.

Pushing the version tag triggers `.github/workflows/release.yml`, which validates
the tag against `module.json`, builds the module ZIP, and publishes the GitHub
release.
