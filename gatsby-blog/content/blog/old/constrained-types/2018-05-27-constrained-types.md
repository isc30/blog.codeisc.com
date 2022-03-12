---
layout: post
title: 'Constrained Types: reusing static assertions'
date: 2018-08-02
subreddit: 'c++'
tags: 'c++'
hidden: true
---

There we gooo!

<!-- more -->

# Intent
Centralize **static assertions**, making them **reusable** to **avoid code duplication**.

# Motivation
Let's check a simple implementation of a calculator! who doesn't love them?

We want to make it work with **only signed numbers of 32bits (or less)**. If one of those constraints isn't met, we report a **compilation error** with the appropriate message.

```cpp
namespace calculator
{
    template<typename T>
    auto add(T left, T right)
    {
        static_assert(is_integral_v<T>, "not an integral type");
        static_assert(is_signed_v<T>, "only signed types allowed");
        static_assert(sizeof(T) <= sizeof(int32_t), "too big");

        return left + right;
    }

    template<typename T>
    auto subtract(T left, T right)
    {
        static_assert(is_integral_v<T>, "not an integral type");
        static_assert(is_signed_v<T>, "only signed types allowed");
        static_assert(sizeof(T) <= sizeof(int32_t), "too big");

        return left - right;
    }

    // - multiply
    // - divide
    // ...
}
```
{: data-line="6-8, 16-18"}

I hope I'm not the only one that feels uneasy about this code.

While it *is* technically correct, those **copy-pasted blocks** of `static_assert` all over around don't feel like the best approach to solve this problem. I wouldn't like to be the guy maintaining those assertions in the future...

>unscalable code == unmaintainable code
{: .note }

# The pattern
Since we are **always** applying the same assertions, let's extract them to a common place. I like to call those **constraint classes**.

>#### Constraint
>A constraint is a **forced** condition (usually a type trait) over a type.<br/>
>It is **always** checked in **compilation time** (zero runtime overhead).
>
>#### Constrained Type
>A metafunction that checks constraints over a type and gets enabled when those are valid.
>>Very similar to `enable_if<_, T>` but using static assertions for getting readable error messages.
>{: .note }
>
>#### Constraint Class
>Templated class that defines all the constraints by using **type traits** and **static_assert**.
{: .description }

### Creating the constraint class

We will rely on the template parameter `T` to perform the assertions. Every time this class will be **resolved** using a type `T` that doesn't satisfy the constraints, it will throw a **readable compilation error**.

```cpp
template<typename T>
struct number_constraints
{
    using type = T;

    static_assert(is_integral_v<T>, "not an integral type");
    static_assert(is_signed_v<T>, "only signed types allowed");
    static_assert(sizeof(T) <= sizeof(int32_t), "too big");
};
```

### Creating the constrained type

Type aliases are great for defining those. This solution allows **complete type compatibility** (in the end it resolves to `T`) and **zero overhead**.

```cpp
template<
    typename T,
    typename = typename number_constraints<T>::type> // runs the check
using number = T;
```
{: data-line="3"}

>Every time our code uses a constrained type we gain multiple things:
>- **Expressing intent**: Hey, this parameter is a number!
>- **Improving readability**: naming the bunch of assertions makes the code easier to follow.
>- **Abstracting the implementation**: just use it and it works, no internal knowledge required.
{: .note }

And all of this **without losing any other advantage**! really great, isn't it?

# Fixing our calculator

Hands on keyboard, we have some shitty-code to fix!

```cpp
namespace calculator
{
    template<typename T>
    auto add(number<T> left, number<T> right)
    {
        return left + right;
    }

    template<typename T>
    auto subtract(number<T> left, number<T> right)
    {
        return left - right;
    }

    // ...
}
```
{: data-line="4, 10" }

Every time we pass a parameter, the compiler will try to match the type with our constrained one.
Such a beautiful function signature we got, our code maintainability basically resurrected.

<table class="no-border"><tr><td align="left">
Enjoy the satisfaction that comes from doing little things well.
</td><td style="text-align: right"><img src="/assets/img/so_good.png" style="margin: 0; display: inline-block" />
</td></tr></table>

### Constraints in action

A simple test shows that the constraints are working properly.

```cpp
sum<int8_t>(1, 5); // ok
sum<int16_t>(1, 5); // ok

sum<float>(1, 5); // error: not an integral type
sum<uint16_t>(1, 5); // error: only signed types allowed
sum<int64_t>(1, 5); // error: too big
```

Compilation **errors** are also **super easy to read** (no huge and shitty template traces).

```
In instantiation of 'struct number_constraints<int64_t>':
  required by substitution of
    'template<class T> auto sum(number<T>, number<T>) [with T = int64_t]'

error: static assertion failed: too big
  static_assert(sizeof(T) <= sizeof(int32_t), "too big");
                ~~~~~~~~~~^~~~~~~~~~~~~~~~~~

Compiler returned: 1
```

# When to use it

This pattern covers a simple case: **reusing `static_assert`**.

>#### This pattern will suit you if:
>- Your codebase contains **duplicated** `static_assert` with the **same intent**.
>- You want to **improve readability** on those assertions (basically give them a name).
>
>#### This pattern won't help you if:
>- You are using **SFINAE/overloads** for safe-fallbacks instead of `static_assert`.
{: .description }

SFINAE is a great hack, we could transform those assertions to a type trait, **but it has some drawbacks**:
- You will have **one generic error** (`T is not a number`) instead of all the detailed ones.
- Traits are more **unreadable/difficult to maintain**.
- **Huge errors** with template traces when using `enable_if_t`.

There are some *possible* tricks that allow constraint-classes behave like a trait, but they require *a lot* of metaprogramming and they're **too long/complex for this article**.

I leave that as an exercise for the reader (or a future article).

>The magic trick
>{: .title }
>defining a constexpr overloaded templated lambda that acts like a type trait and fallbacks to a `static_assert` 🙂 ([example](https://gist.github.com/isc30/fcd53dbb00526a70e5c27a754488480e))
{: .jackass }

# Sample code
All the code for this article is [available here](https://godbolt.org/g/gq2aFM).