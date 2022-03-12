---
layout: post
title: 'Working With Callables'
date: 2018-08-14
subreddit: 'c++'
tags: 'c++ tip'
hidden: true
---

Have you ever wondered about the different ways of passing or storing a callable (closure, std::function, etc)? What performance implications do they have? What can I do to improve compilation errors related to them? How can I inline a lambda call?

<!-- more -->

# TL;DR

Use **templates** with **signature constraint** to ensure performance and error catching during compilation.

[link to the gist]

# Terminology

During the article I'll be using some *fancy* terms:

> ### Callable
> Anything that overloads `operator()`.<br/>
>> `std::function`, `closure`, `function pointer`, ...
>
> ### Signature
> Defines the input and output of a *callable*. It contains the return and parameter types.<br/>
>> `void(int)` (takes an int, returns void)
{: .description }

# Important points

Explain solutions

```cpp
template<typename T> bool equal(T comparer);
template<typename T> bool equal(T comparer);
```

This article compares `std::function` and `template` when working with *callables*: their good and bad points, performance, memory usage, readability, ...

C-style function pointers are excluded for multiple reasons:
* Only **static functions** and **non-capturing lambdas** can be wrapped in them.
* They give no benefits over **templates**.
* They don't play well with **modern C++**; old-school **raw pointers** should be avoided.
* Syntax is horrible, and it matters.

## 1. Wrapping any Callable

Can you assign any callable to it?

- function pointer: no, only static functions and non-capturing lambdas
- std::function: yes, dynamically (require allocation and dynamic dispatch)
- template: yes, statically (even capturing lambdas) (can be constexpr, inline, etc)

```cpp
// accepts anything, dynamic dispatch (allocation + virtual call)
bool equal(std::function<bool(int, int)> comparer);

// accepts anything, static dispatch (no allocation, even constexpr)
template<typename T> bool equal(T comparer);
```

> Winner in this area: **Template**

## 2. Explicit Signature

Good code is all about **intent**: what do you REALLY have? does the callable RETURN something? does it take PARAMETERS?

```cpp
// takes a float and returns an int
std::function<int(float)> delegate; 

// wtf?
T delegate;
```

One of the best characteristics of C++ is that you can develop your **own features for the language** in the language itself. Keep reading to understand how to use **explicit signatures on template-based *callables***.

> Expressing intent also helps the compiler when generating errors.
{: .note }

## 3. Suitable for Storage

Let's imagine you want to store a *callable* as a member, which solution would you prefer?

Storing a callable can be tricky, and it becomes painful when the wrapper doesn't support any kind of **type erasure**. In case of `std::function` and `function ptr`, it's quite straightforward, but using templates requires templating the whole class (like the deleter of `std::unique_ptr`).

```cpp
class WithFunction
{
    // great! anything can be assigned
    std::function<void()> delegate;
};

class WithFunctionPtr
{
    void(*delegate)(); // generic, but very limited
};

// template
template<typename T>
class X2
{
    T delegate;
}
```

Using a template for storing any callable forces you to declare an unnecessary template that **has no signature**.

<table>
    <thead>
        <tr>
            <th colspan="2"></th>
            <th>std::function</th>
            <th>template</th>
        </tr>
    </thead>
    <tbody>
        <tr>
            <td>1</td>
            <td>Wraps any Callable</td>
            <td align="center">X</td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td>2</td>
            <td>Contains Signature</td>
            <td align="center">X</td>
            <td align="center">~</td>
        </tr>
        <tr>
            <td>3</td>
            <td>Suitable for Storage</td>
            <td align="center">X</td>
            <td align="center"></td>
        </tr>
        <tr>
            <td>1</td>
            <td>constexpr</td>
            <td align="center"></td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td>1</td>
            <td>inline-able</td>
            <td align="center"></td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td>1</td>
            <td>static call</td>
            <td align="center"></td>
            <td align="center">X</td>
        </tr>
        <tr>
            <td>1</td>
            <td>no extra allocations</td>
            <td align="center"></td>
            <td align="center">X</td>
        </tr>
    </tbody>
</table>
