$(document).ready(function(){
    
    /**
     * Responsive Navigation
     */ 
    $('#menu-toggle').on('click', function(e){

        $('.g-nav').slideToggle(200);

        $(document).one('click', function(){
            $('.g-nav').slideUp(200);
        });

        e.stopPropagation();
    });

    $('.g-nav').on('click', function(e){
        e.stopPropagation();
    });
    
    /*
    *  Header Bar
    */
    if($(window).width() > 695) {

        var header = $('.g-header');
        var header_h = header.outerHeight();
        var appLogo = $('.g-logo');
        var navText = header.find('a');

        var content = $('.post-content');
        var content_top = content.position().top;
        var content_bottom = content_top + content.outerHeight();
        var sidebar = $('.p-toc');

        var themeColorFlag = $('.g-banner').attr('data-theme');

        var scFlag = $(document).scrollTop();

        $(document).scroll(function(){

            var scrollTop = $(this).scrollTop();
            
            if (scrollTop + 25 < content_top) // 40 - 15
            {
                sidebar.removeClass("fixed");
                sidebar.removeClass("stick-bottom");
            }
            else if (scrollTop < content_bottom - sidebar.outerHeight() - 144) // 104 + 40
            {
                sidebar.addClass("fixed");
                sidebar.removeClass("stick-bottom");
            }
            else
            {
                sidebar.removeClass("fixed");
                sidebar.addClass("stick-bottom");
            }

            if(scrollTop > header_h) {

                header.addClass('fixed');

                if (scrollTop > 3*header_h)
                {
                    header.addClass('headerUp');
                }

                /*header.css({
                    'background-color': 'rgba(255, 255, 255, .98)',
                    'box-shadow': '0 1px 12px rgba(0, 0, 0, .08)'
                });
                appLogo.css({
                    'background-image': 'url(/assets/icons/logo-color.svg)',
                    //'background-size': '100% 100%'
                });
                navText.css('color', '#666');
                $('.g-nav').addClass('nav-' + themeColorFlag);*/

            }else{

                header.removeClass('fixed');
                header.removeClass('headerUp');

                /*header.css({
                    'background-color': 'transparent',
                    'box-shadow': 'none'
                });
                appLogo.css({
                    'background-image': '',
                    //'background-size': '100% 100%'
                });
                navText.css('color', '#fff');
                $('.g-nav').removeClass('nav-' + themeColorFlag);*/

            }

            // scroll action
            if (scFlag > scrollTop)
            {
                header.addClass('headerDown');
            }
            else
            {
                header.removeClass('headerDown');
            }
            
            scFlag = scrollTop;
        });
    }

    /*
    * Post Cover Resize
    */
    function postCover(img, container) {
        var imgWidth = img.width(),
            containerWidth = container.width(),
            imgHeight = img.height(),
            containerHeight = container.height();
        var isOk = false;
        if(imgHeight < containerHeight) {
            img.css({
                'width': 'auto',
                'height': '100%'
            });
            imgWidth = img.width(),
            containerWidth = container.width();
            var marginLeft = (imgWidth - containerWidth) / 2;
            img.css('margin-left', '-' + marginLeft + 'px');
            isOk = true;
        } else {
            var marginTop = (containerHeight - imgHeight) / 2;
            img.css('margin-top', marginTop + 'px');
            isOk = true;
        }

        if(isOk) {
            img.fadeIn();
            isOk = false;
        }
    }

    /**
     * The Post Navigator
     */
    $('.read-next-item section').each(function(){
        var _this = $(this),
            n = _this.height(),
            rn = $('.read-next-item').height();
        _this.css('margin-top', (rn-n)/2 + 'px');
        _this.fadeIn();
    });

    $('.read-next-item img').each(function(){
        var _this = $(this);
        postCover(_this, $('.read-next-item'));
    });

    /**
     * Pagination
     */
    function pagination() {
        var total = parseInt($('#total_pages').val()),
            current = parseInt($('#current_pages').val()),
            baseUrl = $('#base_url').val(),
            limit = 3;

        var link_html = '';

        for(var i = current - limit; i<current; i++) { 
            if(i>0 && i!==1) {
                link_html += '<a href="' + baseUrl + 'page' + i + '" class="page-link page-num">' + i + '</a>';
            }else if(i===1) {
                link_html += '<a href="' + baseUrl + '" class="page-link page-num">' + i + '</a>';
            }
        }

        link_html += '<span class="page-link page-num active">' + current + '</span>';

        for(var j = current + 1; j<=current + limit; j++) { 
            if(j<=total) {
                link_html += '<a href="' + baseUrl + 'page' + j + '" class="page-link page-num">' + j + '</a>';
            }
        }
        
        $('#page-link-container').html(link_html);
    }
    pagination();

    /**
     * Search
     */  
    function Search() {
        var self = this,
            input = $('#search_input'),
            result = $('.search_result');
        
        input.focus(function() {
            $('.icon-search').css('color', '#3199DB');
            result.show();
        });

        input.keyup(debounce(this.autoComplete));

        $(document).click(function(e) {
            if(e.target.id === 'search_input' || e.target.className === 'search_result' || e.target.className === 'search_item') {
                return;
            }
            $('.icon-search').css('color', '#CAD3DC');
            result.hide();
        });
    }

    Search.prototype.autoComplete = function() {
        var keywords = this.value.toLowerCase();
        
        if(keywords.length) {
            $('.icon-search').css('color', '#3199DB');
        }else{
            $('.icon-search').css('color', '#CAD3DC');
        }

        $.getJSON('../../search.json').done(function(data) {
            var html = '';
            for (var i in data) {
                var item = data[i],
                    title = item.title,
                    tags = item.tags,
                    url = item.url;

                var k = title + tags;
                if(keywords !== '' && k.toLowerCase().indexOf(keywords) >= 0) {
                    html += '<a class="search_item" href="' + item.url + '">' + item.title + '</a>';
                }
            }
            $('.search_result').html(html);
        });
    };

    function debounce(fn, delay) {
        var timer;
        delay = delay || 120;

        return function() {
            var ctx = this,
                args = arguments,
                later = function() {
                    fn.apply(ctx, args);
                };
            clearTimeout(timer);
            timer = setTimeout(later, delay);
        };
    }

    new Search();

    // anchor link icon

    var content = $(".post-content");
    var articleIntro = $("#article-intro");
    var toc = [{element: articleIntro, children: []}];

    content.find("h1, h2, h3, h4, h5, h6").each(function(i, el)
    {
        var $el = $(el);
        var depth = parseInt(el.tagName.substr(1,1)) - 1;
        var id = $el.attr('id');
        var icon = '<i class="fa fa-link"></i>';

        if (id) {

            if ($(".p-toc").length > 0)
            {
                var toc_el = toc;

                for (var i = 0; i < depth; ++i)
                {
                    if (toc_el.length === 0)
                    {
                        break;
                    }

                    var inner = toc_el[toc_el.length - 1];

                    if (inner !== undefined)
                    {
                        toc_el = inner.children;
                    }
                }

                toc_el.push({
                    element: $el,
                    children: [],
                });
            }

            return $el.append($("<a />").addClass("header-link").attr("href", "#" + id).html(icon));
        }
    });

    function createTocLink(node)
    {
        var text = node.element.text();
        var link = "#" + node.element.attr('id');

        var li = document.createElement("li");
        var a = document.createElement("a");

        a.href = link;
        a.innerText = text;

        li.append(a);

        return li;
    }

    function createTocList(nodes)
    {
        if (nodes.length === 0)
        {
            return null;
        }

        var ul = document.createElement("ul");

        for (var i = 0; i < nodes.length; i++) {

            var node = nodes[i];
            ul.append(createTocLink(node));

            if (node.children.length > 0)
            {
                var childrenToc = createTocList(node.children);
                ul.append(childrenToc);
            }
        }

        return ul;
    }

    $(".p-toc").append(createTocList(toc));

    // add anchor link class to all links
    $('a').each(function(i, el) {
        var $el = $(el);
        try {
            if ($el.attr('href')[0] == '#')
            {
                $el.addClass("anchor-link");
            }
        } catch(e){}
    });

    // hide menu on anchor link click
    $('.anchor-link').click(function()
    {
        scFlag = -999; // simulate scrolling down to hide the menu
    });

    // any link that is not part of the current domain is modified
    (function() {
        var links = document.links;
        for (var i = 0, linksLength = links.length; i < linksLength; i++) {
            if (links[i].hostname != window.location.hostname) {
                links[i].target = '_blank';
                links[i].className += ' externalLink';
            }
        }
    })();

});