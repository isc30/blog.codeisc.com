---
layout: post
title: 'Configuring git forks'
date: 2018-02-24
subreddit: 'programming'
tags: 'git'
toc: true
---

When working with git, you may want to contribute to other people's projects and wonder which one is the best option to setup your forked repository. In this small article I will explain my configurations and how I deal with branches and remotes.

<!-- more -->

# TL;DR;

In case you are too lazy to read the explanation...

* You: `https://github.com/isc30/roslyn`
* Base: `https://github.com/microsoft/roslyn`

```bash
git remote add upstream https://github.com/microsoft/roslyn
git remote set-url --push upstream no_push
```

<div class="filename" data-file=".git/config" markdown="1">
```ini
[branch "master"]
    remote = upstream
    merge = refs/heads/master
```
</div>

Done! check the new remote with `git remote -v`

# Explanation

In git, forking a repository doesn't add the base remote automatically.
Remotes can have any name, but we usually use `upstream` and `origin`.

```
microsoft/roslyn  ----------->  isc30/roslyn
upstream                        origin
```

Let's add the `upstream` remote using `git remote add <name> <url>`:

```bash
git remote add upstream https://github.com/microsoft/roslyn
```

After this, you can configure `master` branch to be taken from `upstream` instead of `origin` by editing `.git/config`:


<div class="filename" data-file=".git/config" markdown="1">
```ini
[branch "master"]
    remote = upstream
    merge = refs/heads/master
```
</div>

## Specifying Readonly Access to Upstream

Some times, we want to **allow pulling but not pushing** to the `upstream`. If we don't configure this, we can end up getting **weird authentication errors** when running `git push`.

If you have no write access to `upstream`, I recommend setting the push url to `no_push`:

```bash
git remote set-url --push upstream no_push
```