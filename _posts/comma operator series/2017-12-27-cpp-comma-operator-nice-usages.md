---
layout: post
title: 'Nice usages'
series: 'C++ Comma Operator'
chapter: 2
date: 2017-12-27
author: ivansanz
#cover: '/assets/img/cpp-header.jpg'
tags: c++
published: false
---

In this article I will explain some nice real world usages for the comma operator.

<!-- more --><br/>

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

<br/>

------
## Maintaining multiple variables in a for
------

No, I’m not talking about *declaring* multiple variables, I mean **maintaining** them. Let’s imagine that we are creating a very simple *"Big O calculator"* by having a extra variable that is incremented on every loop. We can use comma to perform the increment without adding extra statements into our loop body:

```cpp
size_t n = 100;
size_t bigO = 0;

for (size_t i = 0; i < n; ++i, ++bigO) // maintain 2 variables
{
    // very interesting task
}

for (size_t i = 0; i < n/2; ++i, ++bigO) // thanks comma <3
{
    // another interesting task
}

cout << "O(" << bigO/(double)n << "n)"; // O(1.5n) = O(n+n/2)
```

> Please note that declaring multiple variables in a single line by using comma `int x = 0, y = 33, ...` is something totally different than using comma operator, but they both use the same syntax/grammar.

<br/>

------
## SFINAE: decltype magic with custom type deduction
------

If you ever tried to master this demon, I’m pretty sure you have seen things like `decltype(T::something(), 0)` that you don't really understand but you just copy-paste them because, well... they work.

But, what is that **evil comma in decltype** doing? Let's imagine this simple *type trait*:

```cpp
// SFINAE fallback
template<typename T, typename = int>
struct HasHelloFunction : std::false_type {};

// True case specialization
template<typename T>
struct HasHelloFunction<T, decltype(T::hello(), 0)> : std::true_type {};
```

If we remove the `, 0` part it stops working well. Since `decltype` resolves the type of the internal expression, we can use the comma operator to **force the final resolution to a specific type** (*int*) if the compilation succeeds.

```cpp
bool hello();

decltype(hello()); // bool
decltype(0); // int
decltype(hello(), 0); // (bool, int) => int
```

In the example code, we want to specialize our template for `HasHelloFunction<T, int>` if the compilation succeeds (if `T::hello` function exists).

We don't care about the return type of `T::hello()`. **In case our expression compiles** (function exists and can be invoked with zero args), we want to be deduce our **SFINAE fallback type**: `int`. As simple as that.

This is the perfect example when using the comma in `decltype` helps us avoiding `long and complex` template activation traits.

([full example sorce code][decltype-magic-example])

> As long as every previous sub-expression compiles, compiler will continue evaluating them. The behavior is very similar to `std::enable_if_t` but with a different/custom resolution type.
>
> (c++14) Using `decltype(0, auto)` for the return type doesn't deduct the proper type due to more complex technical limitations. If you want to learn more about this edge case please add a comment below.

<br/>

------
## SFINAE: call + return
------

// TODO

<br/>

------
## Params without variadic
------

// TODO

<br/>

------
## 1 line macros
------

// TODO

<br/>

------
## C++11 constexpr
------

// TODO

<br/>

------
## Condition + abort/terminate/exit + logs
------

// TODO

<br/>

------
## Obfuscation
------

// TODO

[decltype-magic-example]: https://ideone.com/2iSRZX