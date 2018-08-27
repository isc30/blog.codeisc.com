---
layout: post
title: 'Excel-ent experiment with WebAssembly'
date: 2018-08-26
subreddit: 'c++'
tags: 'c++ webassembly'
hidden: true
---

Imagine the situation:
> Your software needs a well-known feature but there isn't any good (and free) library for it.

Does this sound familiar to you? it happens to me all the time, and it sucks. If you really need this feature, you will end up reinventing the wheel and investing a lot of time rewriting something that already exists for many other languages but not for the one you are currently using ([my LINQ implementation for javascript]() is a good example of this).

<!-- more -->

# Storytime

The other day at work, one of the clients wanted a *simple* functionality: possibility to export pivot tables to excel. This is easy *- I thought -* the pivot tables were made using PivotJs library which may have this functionality out of the box.

Nope, it didn't, but I didn't consider it a big deal.
> This is JavaScript world, you can always use any excel library from out there and pass the table element to it, right?

Hands on keyboard, the search began. I wanted to find something quite specific, and even if some of those libraries I found were "great", a fast-check in their GitHub issues made me feel uneasy.

> I know many good C# or even C++ libraries for this task, why can't I simply use them in JavaScript?
> Ooooh *- I realized -* what if I compile a C++ library to WebAssembly? That must be funny.

# Disclaimer

I'm not encouraging you to use the techniques described here in production. Compiling C++ code to WebAssembly instead of using already existing JavaScript libraries is usually a stupid decision.

However, experiments and funny stuff are always welcome in my personal projects. And this was the case.

# Getting Hands Dirty

I already had experience with emscripten and WebAssembly, so I decided to run a small experiment on my own. The main idea was checking how much time it takes to compile some library to WebAssembly,
what is the library size after compilation and how to manage the bindings to JavaScript properly. Basically: knowing if this approach is good enough to even be considered.

- How much time does it take to compile a library to WebAssembly? *(is it worth my time?)*<br/>
- What's the size of it after compilation? *(is it too big for a webpage?)*<br/>
- How to manage bindings to JavaScript properly? *(is it really usable from js?)*<br/>

I wanted answers.

## Compiling the Library

The selected library was [XLNT](https://github.com/tfussell/xlnt), a simple C++14 library for Excel manipulation. I had chosen this one because it relies a lot on implicit conversions and overloads, and I was curious about how
the bindings behave with those.

After running some git commands I had [my fork](https://github.com/isc30/xlnt-wasm) ready. A fast look in CMAKE files revealed that it had some dependencies, but those were included in the repository itself (good job).

When creating a static library with `em++`, you need to turn on all the optimizations with `-O3` and WebAssembly support with `-s WASM=1` (this triggers some WebAssembly specific warnings/errors so it's good to have). Getting this to work required [some small tweaks](https://github.com/isc30/xlnt-wasm/commit/b0f9304e143740779030e8082ccfae2a1f4f3c25) in the CMAKE configurations, nothing complicated.

![](/assets/posts/xlnt-wasm/lib-file.png "8.9MB WTF!")

I got disheartened at this moment. 9MB! that's too much! But then I realized the amount of static stuff that it contained (libzip, libstudxml, pybind, utfcpp, etc) so it was fine.

> Emscripten generates `*.lib` files but isn't able to link them.<br/>
> You need to rename the library file from `xlnt.lib` to `libxlnt.a` in order to link it using `-lxlnt`.
{: .note }

## Hello World, XLNT

I created a `example.cpp` file containing the exact code that you can find in the original XLNT repository.

```cpp
#include <xlnt/xlnt.hpp>

int main()
{
    xlnt::workbook wb;
    xlnt::worksheet ws = wb.active_sheet();

    ws.cell("A1").value(5);
    ws.cell("B2").value("string data");
    ws.cell("C3").formula("=RAND()");

    ws.merge_cells("C3:C4");
    ws.freeze_panes("B2");

    wb.save("example.xlsx");

    return 0;
}
```

Even if the example is easy to read, it makes use of many interesting features.

- Manipulating workbooks and worksheets
- Setting values of cells (also formulas)
- Complex worksheet operations like merging cells or freezing scroll
- Storing the result into filesystem

> If I manage to make an API to access those methods from JavaScript this will be a huge success

<br/>
But let's go step by step. Compiling the test turned out to be effortless:

```bash
em++ example.cpp -std=c++14 -O3 -s WASM=1 -I../include -L. -lxlnt -o example.html
```

![](/assets/posts/xlnt-wasm/example-folder.png)

<br/>
From this point, it was all about opening the page in Firefox, retrieving the binary content from the file and passing it into a simple [function to download byte arrays as named files](https://gist.github.com/isc30/cd996814113869bef40a27d4af79f92d).

![](/assets/posts/xlnt-wasm/download-dialog.png)

# Bindings and JavaScript API

After this great success it was time to start exporting stuff to JavaScript. There are two ways of achieving this easily with emscripten: embind and WebIDL. I had chosen embind because it doesn't require any special file format and its way more complete and explicit than WebIDL.

It allows you exposing classes, constructors and methods by simply defining their exportable members.

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

I started writing all the bindings until I found some problems I expected: implicit conversions, exporting custom members, function overloads and templates in general.

## Implicit Conversions and Custom Functions

I expected implicit conversions to work magically, but that was dreaming too much. Retrieving a `cell` from the given worksheet can be done in two ways: providing a `cell_reference` which is implicitly convertible from a `string` or passing both `column_t` and `row_t` which are implicitly convertible from `uint32_t`.

```cpp
cell worksheet::cell(const cell_reference& reference);
cell worksheet::cell(column_t column, row_t row);
```

This was an issue. I didn't want to expose those intermediate types to the API, I preferred to use `string` and `uint32_t` for the overloads. There is a huge benefit that comes from avoiding those intermediate classes: not forcing users to clean their memory manually.

> It's our responsibility to manually call the destructor of all new C++ objects in javascript and everything from the API that gets returned by value. This can be achieved by calling the member function `.delete()`.
{: .note }

The solution was obvious: wrapping those functions into custom exposed methods that take `std::string` and `uint32_t` as parameters. Turns out you can define custom member functions if they take the reference to the object as first parameter. Also, `optional_override([](...){ ... })` helps when defining those with lambdas.

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

This was an elegant solution, but it had a big drawback: it exposed the ownership of the cell to javascript, forcing users to call `cell.delete()` all the time. This completely ruins the method chain shown in the XLNT example. Unacceptable.

```js
sheet.cell("B2").value(1234); // memory leak, nice
```

## Avoiding Exposed Ownership

J
