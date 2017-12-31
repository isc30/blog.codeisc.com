---
layout: post
title: 'Nice usages'
series: 'C++ Comma Operator'
chapter: 2
date: 2017-12-27
author: ivansanz
cover: '/assets/img/cpp-header.jpg'
tags: c++
---

In this article I will explain some nice real world usages for the comma operator.

------
## Beautiful while
------

Imagine the situation: you need to do some action in a loop before  checking the loop condition, for every cycle.

```cpp
processWindowEvents(window);

while (window.isOpen())
{
    // render, etc
    
    processWindowEvents(window);
}
```

having duplicated logic outside of the block looks... strange.....<br/>
someone would even consider the `do-while` version.....

```cpp
do
{
    processWindowEvents(window);

    if (window.isOpen())
    {
        // render, etc
    }
}
while (window.isOpen());
```

this `do-while` version is also **inefficient!** (it checks the same condition twice).

Look at the *comma version* of the same algorithm:

```cpp
while (processWindowEvents(window), window.isOpen())
{
    // render, etc
}
```

I personally prefer this version, I think it’s more readable and less susceptible to algorithmic bugs than the others.

[comma-operator-series]: TODO