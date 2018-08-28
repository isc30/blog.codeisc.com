---
layout: post
series: 'Excel-ent experiment with WebAssembly'
chapter: 1
title: 'Introduction'
date: 2018-08-26
subreddit: 'c++'
tags: 'c++ webassembly'
hidden: true
---

> Your software needs a well-known feature but there isn't any good (and free) library for it
{: .jackass }

Does this situation sound familiar to you? it happens to me all the time, and it sucks. If you **really** need this feature, you will end up **reinventing the wheel** and investing a lot of time rewriting something that **already exists for many other languages** but not for the one you are currently using ([my LINQ implementation for javascript](https://github.com/isc30/linq-collections) is a good example of this).

<!-- more -->

# Storytime

The other day at work, one of the clients wanted a *simple* functionality: possibility to export pivot tables to excel. This is easy *- I thought -* the pivot tables were made using the [PivotTable](https://react-pivottable.js.org/) library which may have this functionality out of the box.

Nope, it didn't, but I didn't consider it a big problem.
> "This is JavaScript world, you can always use any excel library from out there and pass the table element (or json) to it, right?"

Hands on keyboard, the search began. I wanted to find something quite specific, and even if some of those libraries I found were "great", a fast-check in their GitHub issues made me feel uneasy.

> "I know many good C# or even C++ libraries for this task, why can't I simply use them in JavaScript?
> Hmm, what if I compile a reliable C++ library to WebAssembly? That must be funny."

# Disclaimer

I'm not encouraging you to use the techniques described here in production. Compiling C++ code to WebAssembly instead of using already existing JavaScript libraries is usually a stupid decision.

However, experiments and funny stuff are always welcome in my personal projects. And this was the case.

# Getting Hands Dirty

I already had some experience with emscripten and WebAssembly, so I decided to run a small experiment on my own. The main idea was porting a C++ library to WebAssembly and checking if the results are good enough even to be considered.

- How much time does it take to adapt the library to WebAssembly? *(is it worth my time?)*<br/>
- What's the size of it after compilation? *(is it too big for a webpage?)*<br/>
- How to manage bindings to JavaScript properly? *(is it really usable from js?)*<br/>

I wanted answers.

## Compiling the Library

I picked one library: [XLNT](https://github.com/tfussell/xlnt), a simple C++14 library for Excel manipulation. I had chosen this one because it relies a lot on implicit conversions and overloads, and I was curious about how the javascript bindings behave with those.

After running some git commands I had [my fork](https://github.com/isc30/xlnt-wasm) ready. A fast look in CMake files revealed that it had some dependencies but those were included in the repository itself (good job, authors).

Creating a static library with `em++` requires you to turn on all the optimizations with `-O3` and WebAssembly support with `-s WASM=1` (this triggers some WebAssembly specific warnings/errors so it's good to have even when compiling static libraries). Getting this to work forced me to apply [some small tweaks](https://github.com/isc30/xlnt-wasm/commit/b0f9304e143740779030e8082ccfae2a1f4f3c25) to the CMake configurations, nothing really complicated.

Building the whole thing with CMake took some time, mostly because I didn't realize that the "normal" build includes benchmarks and some tests. A new static library was born, hurray!

![](/assets/posts/xlnt-wasm/lib-file.png "8.9MB WTF!")

I got disheartened at this moment. 9MB! that's too much! But then I realized the amount of static stuff that it contained (libzip, libstudxml, pybind, utfcpp, etc) so it wasn't that bad.

> Emscripten generates `*.lib` files but isn't able to link them.<br/>
> You need to rename the library file from `xlnt.lib` to `libxlnt.a` in order to link it using `-lxlnt`.
{: .note }

## Hello World, XLNT

It was time to check if the whole thing worked properly. I copy-pasted the demo from the original XLNT repository and tried to compile it by linking against the static library.

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

Even if the example looks trivial, it makes use of many interesting features:

- Manipulating workbooks and worksheets.
- Setting values of cells (also formulas).
- Complex worksheet operations like merging cells or freezing panes.
- Saving the result into the filesystem.

> "If I manage to make an API to access those methods from JavaScript this will be a huge success"

<br/>
But let's go step by step. Compiling the example turned out to be effortless:

```bash
em++ example.cpp -std=c++14 -O3 -s WASM=1 -I../include -L. -lxlnt -o example.html
```

![](/assets/posts/xlnt-wasm/example-folder.png)

<br/>
From this point, it was all about opening the HTML page in Firefox, retrieving the binary content from the fake filesystem and passing it into a simple [function to download byte arrays as named files](https://gist.github.com/isc30/cd996814113869bef40a27d4af79f92d).

![](/assets/posts/xlnt-wasm/download-dialog.png)

Boom! It worked. This is a story of success after all.

In the next chapter, I'll narrate my adventures when creating the JavaScript API and how I dealt with embind, implicit conversions, ownerships and a long list of not-so-trivial challenges.
