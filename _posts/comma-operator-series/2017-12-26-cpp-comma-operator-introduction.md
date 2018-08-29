---
layout: post
title: 'Introduction to our filthy friend'
series: 'C++ Comma Operator'
chapter: 1
date: 2017-12-26
reddit_url: 'http://blog.codeisc.com/2017/12/26/cpp-comma-operator-introduction.html'
subreddit: 'cpp'
tags: 'c++'
---

Comma operator has been with us for a long time. First seen in C spec and *improved* with custom overloads in C++, it quickly became one of those *hidden things you shouldn’t use*.
<!-- more -->

Most C/C++ books avoid speaking about `goto` the same way they do about *comma operator*. This is not fair, as both of them can be used properly on certain cases. Let’s speak about that.

# But First, What Does It Do?

Comma operator is associative, it returns the **result of the last expression** after evaluating all of them (from left to right, one by one as any other *binary operation*) and discards the left-side result just before returning (if it has class type, it won't be destroyed until the end of the containing full expression).

```cpp
cout << (1, 2, 3); // prints `3`
```

Back in C times, returning something different than *rvalue* from the operator wasn’t allowed. This changed in C++, so it returns **exactly** the last element with it's type being *lvalue*, *rvalue* or [*whatever*][doc-value-category]. This feature allows writing things like:

```cpp
cout << &(a, b); // address of `b`
```

Another nice point of the comma is that it guarantees [sequenced-before evaluation][doc-sequencing], in other words: [**ensures that all the sub-expressions will be evaluated in order (§8.19.2)**][standard-8-19]. This is a really nice feature, as the compiler is usually allowed to evaluate operands in an arbitrary order.

```cpp
int i = 0;
cout << ++i + i++; // undefined behavior
cout << (i=3, i+=2, i+3); // 8 (perfectly defined behavior)
```

<blockquote class="jackass">
    <p class="title" markdown="1">Warning!</p>
    <p class="content" markdown="1">
        A user-defined `operator,()` cannot guarantee sequencing!
    </p>
</blockquote>

# Short Point About Precedence

It has the [lowest precedence][doc-operator-precedence] in the language, which makes it quite **unstable** when mixed with other operators.

```cpp
int y;
y = 1, 2, 3; // y = 1

// because assignment operator has higher precedence,
// previous line is equivalent to
// (y = 1), 2, 3;
```

Did you notice the parenthesis at the very first example in the post? It’s needed because *bitwise shift* operator (used by `std::ostream`) also has a higher precedence than comma. Using **parenthesis** is crucial here as it directly affects the result of the expression:

```cpp
cout << 1, 2, 3; // prints `1`
cout << (1, 2, 3); // prints `3`

cout << 1, 2, 3 << endl; // compilation error
// because is equivalent to
// (cout << 1), 2, (3 << endl)
//                    ^~~~~~~ invalid operands

// step by step evaluation:
//     x = (1, 2, 3);
//         ((1,2),3)
//         (2,3)
//         (3)
```

<blockquote class="note">
    <p class="content" markdown="1">
        **Always use parenthesis** to avoid nasty bugs.
    </p>
</blockquote>

[doc-forward]: http://en.cppreference.com/w/cpp/utility/forward
[doc-value-category]: http://en.cppreference.com/w/cpp/language/value_category
[doc-sequencing]: http://en.cppreference.com/w/cpp/language/eval_order
[standard-8-19]: http://www.open-std.org/jtc1/sc22/wg21/docs/papers/2017/n4659.pdf#section.8.19
[doc-operator-precedence]: http://en.cppreference.com/w/cpp/language/operator_precedence