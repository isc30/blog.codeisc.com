---
layout: post
title: 'Configuring git forks'
date: 2018-02-24
subreddit: 'programming'
tags: 'git'
---

When working with git, you may want to contribute to other people's projects and wonder which one is the best option to setup your forked repository. In this small article I will explain my configurations and how I deal with branches and remotes.

<!-- more -->

## Install WSL2

Please follow the [official Microsoft instructions on how to install WSL2](https://docs.microsoft.com/en-us/windows/wsl/install) and make sure you are using WSL version 2:

```bash
wsl --set-default-version 2
```

## Install and Upgrade Ubuntu

Head to the Microsoft Store (disconnect from VPNs as it can cause issues) and [install Ubuntu 20.04](https://www.microsoft.com/store/productId/9N6SVWS3RX71).

Run ubuntu for the first time and upgrade all the packages:

```bash
sudo apt update -y
sudo apt upgrade -y
```

## Install a WebKit based browser (Epiphany)

Run the following commands to get `epiphany-browser` installed:

```bash
sudo apt install epiphany-browser
```

## Open Epiphany browser

If you are on a recent win10 version or win11, you should be ready to go. Execute `epiphany` and check if everything works:

```bash
epiphany
```

If it opens, you're done!

If it doesn't and you see the following error, continue with the next steps.

```
Unable to init server: Could not connect: Connection refused
Failed to parse arguments: Cannot open display:
```

## Installing an X Server for Windows

There are a few free and opensource X Servers for windows, but XMing is the one that worked better for me.

Start by downloading and installing it [from this link](https://sourceforge.net/projects/xming/).

Keep all the default configurations when installing.

Once its done, you will see a new program called XLaunch.
Open it and **enable all traffic through the firewall (public and private)**.

- Select `Multiple windows` and set `Display number` to 0
- `Start no client`
- Check both `Clipboard` and `No Access Control`
- (Optional) Save your config to a file
- `Finish`

The X Server is running now, you can see it in the system tray.

## Connecting WSL2 to XMing

Linux GUI applications depend on the `DISPLAY` environment variable to know where to send the data.

Open Ubuntu terminal and run the following command to assign the proper variable:

```bash
export DISPLAY=$(awk '/nameserver / {print $2; exit}' /etc/resolv.conf 2>/dev/null):0
export LIBGL_ALWAYS_INDIRECT=1
```

Optionally, add these lines to your `.bashrc` file so they run automatically on startup.

Check the new value:

```bash
echo $DISPLAY
```

It should look something like your Windows IP + ":0".

> You can read more about this step [here](https://wiki.ubuntu.com/WSL#Running_Graphical_Applications)

## Open Epiphany browser (again)

This time it should all work. From your Ubuntu terminal run:

```bash
epiphany
```
