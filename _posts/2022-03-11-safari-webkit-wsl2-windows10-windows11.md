---
layout: post
title: 'Debugging Safari-specific bugs in Windows via WSL2'
date: 2022-03-11
subreddit: 'webdev'
tags: safari webkit windows wsl
---

If you want to debug your website in safari from Windows without any emulator involved, you are lucky! <br />
This guide explains how to get a fully featured WebKit browser running natively in Windows 10 and Windows 11 :)

<!-- more -->

# What to expect from this post

At the end of this short guide you will have a free, non-emulated local browser that runs and behaves almost the same as safari desktop.

We will be installing `epiphany`, a Linux-only browser that is based on WebKit. All of this is possible thanks to WSL2, available in Win10 and Win11.

[![](/assets/posts/safari-webkit-wsl2-windows10-windows11/result.jpg)](/assets/posts/safari-webkit-wsl2-windows10-windows11/result.jpg)

# Install WSL2

Please follow the [official Microsoft instructions on how to install WSL2](https://docs.microsoft.com/en-us/windows/wsl/install) and make sure you are using WSL version 2:

```bash
wsl --update
wsl --set-default-version 2
```

## Install and Upgrade Ubuntu

Head to the Microsoft Store (disconnect from VPNs as it can cause issues) and [install Ubuntu 20.04](https://www.microsoft.com/store/productId/9N6SVWS3RX71).

Run ubuntu for the first time and upgrade all the packages:

```bash
sudo apt update -y
sudo apt upgrade -y
```

# Install a WebKit based browser (Epiphany)

Run the following commands to get `epiphany-browser` installed:

```bash
sudo apt install epiphany-browser
```

## Open Epiphany browser

If you are on a recent Win10 or Win11, you should be ready to go.

Execute `epiphany` and check if everything works:

```bash
epiphany
```

If it opens, you're done! Enjoy :)

<img src="/assets/img/so_good.png" style="margin: 0 auto; width: 175px" />

If it doesn't and you see the following error, continue with the next steps.

```
Unable to init server: Could not connect: Connection refused
Failed to parse arguments: Cannot open display:
```

> If you are on Windows 11 and it didn't work, it should. Please update your GPU drivers and try again, you don't need the extra steps.
{: .jackass }

# Installing an X Server for Windows

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

> You can read more about this step [here](https://wiki.ubuntu.com/WSL#Running_Graphical_Applications)

## Open Epiphany browser (again)

This time it should all work. From your Ubuntu terminal run:

```bash
epiphany
```

As promised, enjoy :)

<div style="margin: 0 auto 2rem auto; height: 200px">
    <iframe src="https://giphy.com/embed/cF7QqO5DYdft6" width="100%" height="100%" frameBorder="0" class="giphy-embed" allowFullScreen></iframe>
</div>

> If it gets stuck when opening, check your firewall rules. XMing should have inbound rules for all networks enabled (both public and private)
{: .jackass }
