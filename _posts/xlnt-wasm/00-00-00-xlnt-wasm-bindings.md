---
layout: post
series: 'Excel-ent experiment with WebAssembly'
chapter: 2
title: 'Bindings and JavaScript API'
date: 2018-08-27
subreddit: 'c++'
tags: 'c++ webassembly'
hidden: true
---

After the successful "hello world" example, it was time to start exposing stuff to JavaScript. There are two ways of achieving this easily: embind and WebIDL. I had chosen embind because it doesn't require any special file format and its way more complete and explicit than WebIDL.

<!-- more -->

This magical library allows exposing classes, constructors and methods by simply defining their exportable members.

```cpp
EMSCRIPTEN_BINDINGS()
{
    class_<xlnt::workbook>("workbook")
        .constructor<>()
        .function("active_sheet", &xlnt::workbook::active_sheet);
}
```

After this, I was able to create workbooks from JavaScript. Quite simple, right?

```js
const workbook = new xsnt.workbook();
const sheet = workbook.active_sheet();

sheet.delete(); // calls destructor, explained later
workbook.delete(); // calls destructor, explained later
```

I started writing all the bindings until I found some challenges that I already expected: implicit conversions, exporting custom members, exposing ownership, function overloads and templates in general.

# Implicit Conversions and Custom Functions

I expected implicit conversions to work magically, but that was too much dreaming. Retrieving a `cell` from the given worksheet can be done in two ways: providing a `cell_reference` which is implicitly convertible from a `string` or passing both `column_t` and `row_t` which are implicitly convertible from `uint32_t`.
The code explains better by itself.

```cpp
cell worksheet::cell(const cell_reference& reference); // worksheet.cell("B2")
cell worksheet::cell(column_t column, row_t row); // worksheet.cell(2, 2)
```

The javascript API needs to be 100% explicit, and this was an issue. Implicit conversions like those are forbidden, so you are forcing users to construct those intermediate types manually before passing them to our functions.
I didn't want to expose those intermediate types to the API, I preferred to use `string` and `uint32_t` for the overloads. Also,  there is a huge benefit that comes from avoiding those intermediate classes: users aren't forced to clean their memory manually.

> It's our responsibility to manually call the destructor of all new C++ objects in javascript and everything from the API that gets returned by value. This can be achieved by calling the member function `.delete()`.
{: .note }

The solution was obvious: wrapping those functions into custom exposed methods that take `string` and `uint32_t` as parameters. Turns out that you can define custom member functions if they take the reference to `*this` as first parameter. Also, `optional_override` helps a lot when defining those functions using inline lambdas.

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

This was an elegant solution, but it had a big drawback: it exposed the ownership of the cell to javascript, forcing users to call `cell.delete()` all the time. This completely ruins the experience when using method chains, like the ones shown in the XLNT example. Unacceptable.

```js
sheet.cell("B2").value(1234); // memory leak, nice...
```

# Avoiding Exposed Ownership

Now that 
