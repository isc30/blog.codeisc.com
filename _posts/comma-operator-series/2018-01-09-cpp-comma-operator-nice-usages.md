---
layout: post
title: 'Nice usages'
series: 'C++ Comma Operator'
chapter: 2
date: 2018-01-09
reddit_url: 'http://blog.codeisc.com/2017/12/26/cpp-comma-operator-introduction.html'
subreddit: 'cpp'
tags: c++
---

In this article I will explain some *nice* real world usages for the comma operator.

<!-- more -->

> "There appear to be few practical uses of operator,()"<br/>
> -- *Bjarne Stroustrup, The Design and Evolution of C++*

Oh, Bjarne, you are totally right.

# Conclusions First

Comma operator is **tricky** and nowadays (C++17) using it won't help you much (except for some cases, explained in this article).

Overloading the comma operator with explicit types is a bit tricky too, as you can easily end up with **hidden fallbacks to the language behavior** if the specific overload isn't matched. The worst part is that **there is no possible error/warning** when this happens ([example of this nasty bug](https://ideone.com/cYvQrz)). This problem can be solved using proxy templates (explained later in *C++03 Params* example) and explicitly casting all operands to `void` to ensure calling the non-overloaded operator.

<blockquote class="jackass">
    <p class="title">Questionable practices, read carefully</p>
    <p class="content" markdown="1">
        I'm not responsible for any brain ~~or code~~ damages
    </p>
</blockquote>

# Avoiding Duplicated Logic

Imagine the situation: we need to **perform some action** in a loop **before checking the loop condition**, for every cycle.

```cpp
processWindowEvents(window);

while (window.isOpen())
{
    // render, etc
    
    processWindowEvents(window);
}
```

having **duplicated logic** outside of the block looks... strange.....

Look at the *comma version* of the same algorithm:

```cpp
while (processWindowEvents(window), window.isOpen())
{
    // render, etc
}
```

I personally prefer the *comma* version, I think it’s more readable and less susceptible to algorithmic bugs (after refactors, etc) than the other.

# Maintaining Multiple Variables in Limited Places

No, I’m not talking about *declaring* multiple variables, I mean **maintaining** them.

Let’s imagine that we are creating a very simple *"Big O calculator"* by having an extra variable that is incremented on every loop. We can use comma to perform the increment **without adding extra statements into our loop body**:

```cpp
size_t n = 100, bigO = 0;

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

<blockquote class="note">
    <p class="content" markdown="1">
        **Declaring multiple variables** in a single line by using the comma<br/>`int x = 0, y = 33, z = 666, ...` is something **totally different** than using comma operator, but they both use the same syntax/grammar.
    </p>
</blockquote>

# Assert With Message

It turns out that one of the **best ways** to include an **error message** in our `assert(...)` is using the comma operator. It discards the message and uses the **predicate for the assertion**.

```cpp
assert(("message", predicate));

// useful macro-version
#ifndef m_assert
    #define m_assert(predicate, msg) assert((msg, predicate))
#endif
```

>What's wrong with other approaches?
>- Altering the predicate *(logic may break, also unreadable)*
>- Redefining internal compiler macros *(just don't!)*
>- Depending on `BOOST_ASSERT_MSG` **just for this**
>
>I personally consider those bad practices. Comma wins this round!
{: .note }

# SFINAE: decltype Magic with Custom Type Deduction

If you ever tried to master this demon, I’m pretty sure you have seen things like `decltype(T::something(), 0)` that you don't really understand but you just copy-paste them because, well... they work.

But, what is that **evil comma in decltype** doing? Let's imagine this simple *type trait*:

```cpp
// SFINAE fallback
template<typename T, typename = int>
struct HasHelloFunction : std::false_type {};

// true case specialization
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

In our example, we want to specialize our template for `HasHelloFunction<T, int>` if `T::hello` function exists.

We don't care about the return type of `T::hello()`. **In case our expression compiles** (function exists and can be invoked with zero args), we want to deduce our **SFINAE fallback type**: `int`. As simple as that.

This is the perfect example when using the comma in `decltype` helps us avoiding *long and complex* template activation traits.

([full example source code](https://ideone.com/fSxhNh))

<blockquote class="jackass">
    <p class="content" markdown="1">
`T::hello()` might return a type that overloads the comma operator. This affects our expected behavior as it *could* be that `(T::hello(), 0)` no longer returns `int(0)`. To be safe from our side, we must explicitly cast the method call result to `void`. The proper implementation is `decltype((void)T::hello(), 0)`
    </p>
</blockquote>

<blockquote class="note">
    <p class="content" markdown="1">
As long as every previous sub-expression compiles, compiler will continue evaluating them. The behavior is very similar to `std::enable_if_t` but with a different/custom resolution type.</p>
<p class="content" markdown="1">[C++14] Using `decltype(0, auto)` for the return type doesn't deduct the proper type due to more complex technical limitations. If you want to learn more about this edge case please add a comment below.
</p>
<p class="content" markdown="1">[C++17] `void_t<...>` was added to avoid the need of manual resolution to fallback type. Proper C++17 implementation can be found [here](https://ideone.com/OKQu18).
</p></blockquote>

# [C++03] Params of Specific Type

In modern C++, passing **unlimited arguments of a specific type** is very easy with *variadic templates*, *std::initializer_list* or *brace initializers*.
For old C++03, *explicit overloads* or *variadic args* are the only options... (or not? ...)

Explicit overloads are nice and simple if you have a **few defined usages** and you know how many args you will need, but **isn't scalable** at all.

Variadic args is something that comes from C world: it **only works in runtime** (not nice, as you get no compile-time errors) and does **implicit conversions instead of throwing errors** for incorrect types. Definitely a really bad option.

<blockquote class="note">
    <p class="content" markdown="1">
`va_arg(args, T)` will internally apply a *C style cast* to the arg to type `T`, allowing weird implicit conversions.
    </p>
</blockquote>

([full example of the variadic args problem](https://ideone.com/2PBSMa))

## My comma-based solution:

Why don't we create a class that overloads the comma operator for pushing parameters into a `std::vector<T>`?

```cpp
template<typename T>
struct Params : public std::vector<T>
{
    template<typename V> // avoids fallback to language-defined behavior
    inline Params<T>& operator,(const V& value)
    {
        this->push_back(value);
        return *this;
    }
};
```

This technique is accepted and used in tons of nice libraries. For example [boost::spirit](http://www.boost.org/doc/libs/1_66_0/libs/spirit/doc/html/index.html) uses the `operator,`, [boost::assign](http://www.boost.org/doc/libs/1_66_0/libs/assign/doc/#operator+=) uses `operator+=` and [boost::format](http://www.boost.org/doc/libs/1_31_0/libs/format/doc/format.html#synopsis) uses `operator%` for similar purposes.

We can use `Params<T>` in our functions like this:

```cpp
void printParams(const Params<int>& params = Params<int>())
{
    cout << "[";

    for (size_t i = 0; i < params.size(); ++i)
    {
        cout << (i == 0 ? "" : ", ");
        cout << params[i];
    }

    cout << "]" << endl;
}
```

and pass the parameters using the *comma operator*

```cpp
// No params
printParams(); // []

// No params with explicit empty params
printParams(Params<int>()); // []

// Some params
printParams((Params<int>(), 1, 2, 3)); // [1, 2, 3]

// Compile-time error: invalid conversion from `const char[6]` to `int`
printParams((Params<int>(), 1, 2, 3, "error"));
```

This method is the best for **C++03** as it provides **nice syntax** and **compile-time errors**.

([full working example](https://ideone.com/KjZxbT))

<blockquote class="jackass">
    <p class="title" markdown="1">If your compiler supports **C++11 or greater**</p>
    <p class="content" markdown="1">
        Use `std::initializer_list<T>` + brace initializer for this case. It was introduced to avoid those nasty tricks. No possible discussion.
    </p>
</blockquote>

# [C++11] Bypass Constexpr Restrictions

In **C++11**, *constexpr* function body is limited to a simple return expression. This forced us to use *smart* ways to combine multiple expressions, being comma one of the most used ones as it ensures a perfectly defined evaluation order. Typical example is compile time assertions + return:

```cpp
template<size_t Index, size_t N>
constexpr bool checkArrayBounds()
{
    return Index < N || (throw "Index out of bounds", false);
}

template<size_t Index, typename T, size_t N>
constexpr T array_at(T(&array)[N]) // `array` is a reference to `T[N]`
{
    return checkArrayBounds<Index, N>(), *(array+Index); // Comma magic *-*
}
```

([full working example](https://ideone.com/5qZxa2))

# [C++17] Fold Expressions (reducing parameter packs)

One of the best features of C++17, [fold expression](http://en.cppreference.com/w/cpp/language/fold), allows **reducing a parameter pack by applying a binary operator** (including comma). This opens a huge branch of possibilities like calling a function for each argument or easily getting the last argument from the pack.

Let's take advantage of the *comma operator* to perform an **action for each argument**, for example, pushing every argument from the pack to a `std::vector`:

```cpp
template<typename T, typename... Args>
void push_back_vec(std::vector<T>& v, Args&&... args)
{
    ((void)v.push_back(std::forward<Args>(args)), ...);
}
```

<blockquote class="jackass">
    <p class="title" markdown="1">Bugs in cppreference</p>
    <p class="content" markdown="1">
        This example is taken from cppreference, but [their version](http://en.cppreference.com/w/cpp/language/fold) doesn't implement perfect forwarding properly, `std::forward` is needed here! Also note the defense against any possible comma operator overloads by casting the result to `void`.
    </p>
</blockquote>

([full working example](https://ideone.com/bksyWj))

# Obfuscation

Take a "good practices guide" and reverse it. You will get the **definitive guide for creating unmaintainable code** (bible of code obfuscation).
One of the main rules will be:
>use the comma operator frequently

Here's a simple mind-blowing example that takes advantage of commas, enjoy :D

```cpp
char* c{ (char*)-1 };
if (c = 0, delete c++, c--)
{
    long a[] = { 0b1100, 0x1, 0b10, 0b110, 0x10 }, b = (long)c;
    char(*p)(char) = [](char x) { return printf("%c", 0x43 + x), x; };
    for (int i = (c++, p(b)); ++c, i < 5 || p(b); p(b | a[i]), ++i, c++);
}
```

([full working example](https://ideone.com/3Z1HnZ))

# The End

That's all! I didn't want to end up with a huge post so I omitted many other ~~even more questionable~~ uses of the comma operator, listed below.

* Single line functions/macros (advantage: copy/move elision)
* `auto v = (std::lock_guard(m), vec[i]);` (don't use this inside loops!)
* `std::optional<T>` fallback value (like `myVar || 0` in javascript)
* Complex logic in constructor args (call global functions + pass other values)
* Avoiding block braces
* ... a long etc

Now that you are a real expert on the comma operator, what do you think about it? **Drop a comment below!**

> Edit: Thanks a lot for your comments!