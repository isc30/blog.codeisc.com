---
layout: post
series: 'Excel-ent experiment with WebAssembly'
chapter: 2
title: 'Bindings and JavaScript API'
date: 2018-08-29
subreddit: 'c++'
tags: 'c++ webassembly'
hidden: true
---

After the successful "hello XLNT" example, it was time to start exposing stuff to JavaScript. There are two easy ways of achieving this: embind and WebIDL. I chose [embind](https://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/embind.html) because it doesn't require any special file format and its way more complete and explicit than WebIDL.

<!-- more -->

This awesome library allows exposing class definitions, constructors and methods by simply defining their exportable members.

```cpp
#include <emscripten/bind.h>

EMSCRIPTEN_BINDINGS()
{
    class_<xlnt::workbook>("workbook")
        .constructor<>()
        .function("active_sheet", &xlnt::workbook::active_sheet);
}
```

After adding those lines to my example, I was able to create workbooks and call some of their methods from JavaScript. Awesome, isn't it?

```js
const workbook = new xsnt.workbook();
const sheet = workbook.active_sheet();

sheet.delete(); // calls destructor, explained later
workbook.delete(); // calls destructor, explained later
```

I started writing all the bindings for other classes and methods until I found some challenges that I already expected: implicit conversions, exporting custom members, exposing ownership, function overloads and templates in general.

# Implicit Conversions and Custom Functions

I expected implicit conversions to work magically but, of course, they didn't. There are two ways of retrieving a `cell` from the given worksheet in XLNT: providing a `cell_reference` which is implicitly convertible from a `string` or passing both `column_t` and `row_t` which are implicitly convertible from `uint32_t`.

```cpp
cell worksheet::cell(const cell_reference& reference); // worksheet.cell("B2")
cell worksheet::cell(column_t column, row_t row); // worksheet.cell(2, 2)
```

The javascript API always needs to be a 100% explicit, and this was an issue. Implicit conversions like those are forbidden, so you are forcing your API consumers to construct those intermediate types manually before passing them to our functions.

I didn't want to expose those types to the API, I preferred to use `string` and `uint32_t` for the overloads. Also, there is a huge benefit that comes from avoiding the manual instantiation of those intermediate types: API consumers aren't forced to do any memory cleanup.

> It's our responsibility to **manually** call the destructor of all new C++ objects that we create in JavaScript and everything from the API that gets returned by value. This can be achieved by calling the member function `.delete()`
{: .note }

The solution was obvious: I decided to wrap those functions into custom exposed methods that took `string` and `uint32_t` as parameters. Turns out that you can expose custom member functions that are implemented by static functions if they take the reference to `*this` as the first parameter. Also, `optional_override` helps a lot when defining those by using inline lambdas.

```cpp
class_<xlnt::worksheet>("worksheet")

    .function("cell", optional_override([](
        xlnt::worksheet& worksheet,
        const std::string& cell_reference)
    {
        return worksheet.cell(cell_reference);
    }))

    .function("cell", optional_override([](
        xlnt::worksheet& worksheet,
        std::uint32_t col,
        std::uint32_t row)
    {
        return worksheet.cell(col, row);
    }));
```

This was an elegant solution, but it had a big drawback: it exposed the ownership of the cell to JavaScript, forcing consumers to call `cell.delete()` all the time. This completely ruins the experience when using method chains like the ones shown in the XLNT example. Unacceptable.

```js
sheet.cell("B2").value(1234); // memory leak
```

# Avoiding Exposed Ownership

Now that we are all aware of the problems related to memory ownership in JavaScript, I want to do a small break in the story and recommend you a nice pattern that helped me a lot when designing this kind of APIs: executing JS functions from C++ to preserve C++ ownerships.

I know, this pattern sounds super confusing right now. Please let me explain how it works.

## The 'using' Pattern

Instead of returning an `object` from C++ and forcing the consumer to destroy it, let's pass a JavaScript function that uses the `object` as a parameter to the method and invoke it from C++. This way we can still manage the lifetime of the `object` in the C++ side and ensure the proper destruction.
{: .no-margin }
```js
sheet.using_cell("B2", c => c.value(1234));
```

> It sounds amazing after the explanation, huh?

## Invoking JS Callbacks from C++

There is a [magical type](https://kripken.github.io/emscripten-site/docs/api_reference/val.h.html) called `emscripten::val` that basically wraps anything that comes from JavaScript world to C++. It implements some explicit conversions and `operator()`, which is exactly what we need for invoking callbacks.

```cpp
class_<xlnt::worksheet>("worksheet")

    .function("using_cell", optional_override([](
        xlnt::worksheet& worksheet,
        const std::string& cell_reference,
        emscripten::val action)
    {
        auto cell = worksheet.cell(cell_reference);
        
        // ptr avoids the extra copy
        auto* cell_ptr = &cell;
        action(cell_ptr); 
    }))

    // ... the other overload
```
{: data-line="6, 8-12"}

We just managed to preserve the method chain and abstracted the API consumer from memory ownerships just by using this smart pattern. I love it.

# Function Overloads and Templates

This is easy
