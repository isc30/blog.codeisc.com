---
layout: post
series: 'Excel-ent experiment with WebAssembly'
chapter: 2
title: 'Bindings and JavaScript API'
date: 2018-08-29
subreddit: 'c++'
tags: 'c++ webassembly'
toc: true
hidden: true
---

After the successful "hello XLNT" example, it was time to start exposing stuff to JavaScript. There are two easy ways of achieving this: embind and WebIDL. I chose [embind](https://kripken.github.io/emscripten-site/docs/porting/connecting_cpp_and_javascript/embind.html) because it doesn't require any special file format and its way more complete and explicit than WebIDL.

<!-- more -->

This awesome library allows exposing class definitions by simply defining their exportable members (constructors, methods, properties, etc).

```cpp
#include <emscripten/bind.h>

EMSCRIPTEN_BINDINGS()
{
    class_<workbook>("workbook")
        .constructor<>()
        .function("active_sheet", &workbook::active_sheet);
}
```

After adding those lines to my example, I was able to create workbooks and call one of their methods from JavaScript. Awesome, isn't it?

```js
const workbook = new xlnt.workbook();
const sheet = workbook.active_sheet();

sheet.delete(); // calls destructor, explained later
workbook.delete(); // calls destructor, explained later
```

I started writing all the bindings for other classes and methods until I found some challenges that I already expected: implicit conversions, exporting custom js functions, managing ownerships, function overloads and templates in general.

# Implicit Conversions and Custom Functions

I expected implicit conversions to work magically but, of course, they didn't.

There are two ways of retrieving a `cell` from the given worksheet in XLNT: providing a `cell_reference` which is implicitly convertible from a `string` or passing both `column_t` and `row_t` which are implicitly convertible from `uint32_t`.

```cpp
// XLNT declarations
cell worksheet::cell(const cell_reference& reference); // sheet.cell("B2")
cell worksheet::cell(column_t column, row_t row); // sheet.cell(2, 2)
```

The javascript API always needs to be a 100% explicit, and this was an issue. Implicit conversions like those are forbidden, they basically force your API consumers to construct those intermediate types manually before passing them to our functions.

I didn't want to expose those types to the API, I preferred to use `string` and `uint32_t` for the overloads. Also, there is a huge benefit that comes from avoiding the manual instantiation of those intermediate types: API consumers aren't forced to do any manual memory management.

> It's our responsibility to manually call the destructor of all new C++ objects that we create in JavaScript and everything from the API that gets returned by value. This can be achieved by calling the member function `.delete()`
{: .note }

The solution was obvious: I decided to wrap those functions into custom exposed methods that took `string` and `uint32_t` as parameters. Turns out that you can expose custom member functions that are implemented by static functions if they take the reference to `*this` as the first parameter. Also, `optional_override` helps a lot when defining those by using lambdas.

```cpp
class_<worksheet>("worksheet")

    .function("cell", optional_override([](
        worksheet& worksheet,
        const string& cell_reference)
    {
        return worksheet.cell(cell_reference);
    }))

    .function("cell", optional_override([](
        worksheet& worksheet,
        uint32_t col,
        uint32_t row)
    {
        return worksheet.cell(col, row);
    }));
```

This was an elegant solution, but it had a big drawback: it exposed the ownership of the cell to JavaScript, forcing consumers to call `cell.delete()` all the time. This completely ruins the experience when using method chains like the ones shown in the XLNT example. Unacceptable.

```js
sheet.cell("B2").value(1234); // memory leak
```

# Avoiding Exposed Ownership

Now that we are all aware of the problems related to memory ownerships in JavaScript, I want to do a small break in the story and recommend you a nice pattern that helped me a lot when designing this kind of APIs: executing JS functions from C++ to preserve C++ ownerships.

I know, this pattern sounds super confusing right now. Please let me explain how it works.

## The 'using' Pattern

Instead of returning an `object` from C++ and forcing the consumer to destroy it, let's pass a JavaScript function that uses the `object` as a parameter to the C++ method and invoke it from there. This way we can still manage the lifetime of the `object` in the C++ side and ensure the proper destruction.
{: .no-margin }
```js
sheet.using_cell("B2", c => c.set_value(1234));
// also
v = sheet.using_cell("B2", c => c.get_value());
```

> It sounds amazing after the explanation, huh?

## Invoking JS Callbacks from C++

There is a [magical type](https://kripken.github.io/emscripten-site/docs/api_reference/val.h.html) called `emscripten::val` that basically wraps anything that comes from JavaScript world to C++. It implements some explicit conversions and `operator()`, which is exactly what we need for invoking callbacks.

> Passing a pointer to the object avoids extra copies. This is the most important part in the implementation.
{: .note }

```cpp
class_<worksheet>("worksheet")

    .function("using_cell", optional_override([](
        worksheet& worksheet,
        const string& cell_reference,
        val action)
    {
        auto cell = worksheet.cell(cell_reference);
        
        // ptr avoids extra copies
        auto* cell_ptr = &cell;

        return action(cell_ptr); 
    }))

    // ... the other overload
```
{: data-line="6, 10-13"}

We just preserved the method chain style and abstracted the API consumer from managing memory ownerships just by using this smart pattern. I love it.

> In case you wonder why I created a new local variable for storing the pointer, it is a workaround for a [bug in embind](https://github.com/kripken/emscripten/issues/7084): passing the ptr as lvalue instead of the ptr itself.
{: .jackass }

<!--
# Function Overloads and Templates

You can basically do anything with `optional_override` but sometimes you just want to expose some implementation as it is, without wrapping it inside a lambda. **There are multiple ways of achieving that depending if the members are overloaded or templated.**

I found myself thinking about this and how to handle all those cases properly when writing the bindings for the `cell.value` methods.

XLNT is designed to take advantage of C++ overloads making the interfaces "simple" for the users, but exposing those to JavaScript can be a big problem. You can find many methods with the same name that do different things (cleaning cell value, setting different type of values, reading the value, etc).

```cpp
// cleaning value
void cell::value(nullptr_t);

// modifying value
void cell::value(double value);
void cell::value(const string& value);

// reading value
template<typename T> T cell::value() const;
```-->

# Overloading by Return Type

Considering that C++ has templates and also allows overloading by return type, it's normal that XLNT uses those features for operations like getting the value of a cell. This is a nice C++ design but exposing it to JavaScript can be really painful.

```cpp
// XLNT declarations
template<typename T> T cell::value() const;
```

Embind doesn't support type-based overloading so the obvious solution here is to create different methods with different names depending on the return type. The implementation of this is a no-brainer.

```cpp
.function("get_value_str", &cell::value<string>)
.function("get_value_bool", &cell::value<bool>)
.function("get_value_number", &cell::value<double>)
```

Done! ...right? nope. This sucks.

## Visitor Pattern to the Rescue!

I was sure that there was a better way to do this, mostly because I would NEVER design my API like this if it was purely implemented in JavaScript.

C++17 introduced `std::variant` which provides storage for different types, like a type-safe union. I would expect any modern excel library to use a `variant<double, bool, string>` to store the value of the cells. If this is the case, we can later visit whatever value we have there and convert it to `emscripten::val`.

```cpp
variant<string, double> var;
var = 2.33;
var = "LOL";

// returns a JS string "LOL"
return visit(
    [](auto&& v) {
        return val(forward<decltype(v)>(v));
    }, var);
```

Since XLNT is C++14, it doesn't use `std::variant` but the design ideas remain the same. After some checkings, it turned out that implementing dynamic return type for `get_value` was as simple as doing a switch-case. Respecting JS standards, I decided to fallback to `undefined` for empty or unknown types.

```cpp
.function("get_value", optional_override([](
    cell& cell)
{
    switch (cell.data_type())
    {
        case cell_type::boolean:
            return val(cell.value<bool>());

        case cell_type::number:
            return val(cell.value<double>());

        case cell_type::inline_string:
        case cell_type::shared_string:
            return val(cell.to_string());

        default:
            return val::undefined();
    }
}))
```

# Overloading by Argument Type

XLNT is designed to take advantage of C++ overloads to make the interfaces "simple" for the consumers. This is great for C++ but we can do it better for JavaScript.

```cpp
// XLNT declarations
void cell::value(bool value);
void cell::value(double value);
void cell::value(const string& value);
void cell::value(nullptr_t);
```

Now that I knew how to deal with dynamic return types, doing it on arguments sounded easy-peasy. After checking the `emscripten::val` implementation, I saw a `typeOf()` method that is basically a proxy for JavaScript's `typeof` operator.

Using this, I was able to bind anything from my parameters to `val` and do the type-checking in runtime. The solution turns out to be very similar to the switch-case from the previous example.

```cpp
.function("set_value", optional_override([](
    cell& cell,
    val value)
{
    auto type = value.typeOf().as<string>();
    
    if (type == "number")
    {
        return cell.value(value.as<double>());
    }
    else if (type == "string")
    {
        return cell.value(value.as<string>());
    }
    else if (type == "boolean")
    {
        return cell.value(value.as<bool>());
    }
    else if (value.isNull() || value.isUndefined())
    {
        return cell.value(nullptr_t{});
    }

    EM_ASM({
        throw new TypeError("value must be string, number or boolean");
    });
}
```

# Exporting Custom JavaScript Functions

I also want to share one interesting trick I found when implementing the method `workbook.download(fileName)`. This method was really simple: saving the workbook and triggering the download dialog as we saw in the first post, but this required some JavaScript underneath and I didn't want to add an extra JS file to the solution just for this.

After some brainstorming, I realized that `EM_ASM` can be really helpful in those cases and decided to give it a try. This macro allows inlining sync JavaScript code in C++ code, giving you the chance to manipulate the generated code from the bindings.

The implementation of `download(fileName)` turned out to be really simple when using this trick.

```cpp
void download(
    workbook& workbook,
    const string& fileName)
{
    workbook.save(fileName);

    EM_ASM_({
        fileName = Pointer_stringify($0);
        fileContent = [FS.readFile(fileName)];

        mime = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
        file = new Blob(fileContent, { type: mime });
        downloadUrl = URL.createObjectURL(file);

        // Download the Blob
        anchor = document.createElement('a');
        anchor.download = fileName;
        anchor.href = downloadUrl;
        anchor.dataset.downloadurl = mime + ":" + fileName + ":" + downloadUrl;
        document.body.appendChild(anchor);
        anchor.click();
        document.body.removeChild(anchor);
    }, fileName.c_str());
}

EMSCRIPTEN_BINDINGS(workbook)
{
    class_<workbook>("workbook")
        .function("download", &download)
        // ...
}
```

# Creating the TypeScript Definitions

I'm reserving this for a future post where I will explain how to make the JS library modular, how to manage memory ownerships via mixins, how to deal with member constructors and much more!

