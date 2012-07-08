var SHPAML = (function () {

    "use strict";

    function syntax(regex, f) {
        f.regex = regex;
        return f;
    }

    // version number tracks to Python implementation
    // in terms of passing test suite
    var version = '0.99b',

    //strings
        PASS_SYNTAX = 'PASS',
        FLUSH_LEFT_SYNTAX = '|| ',
        FLUSH_LEFT_EMPTY_LINE = '||',

    //regex

        TAG_WHITESPACE_ATTRS = /(\S+)([ \t]*)(.*)/,

        CLASS_OR_ID = /([.#])((?:[^ \t\.#]|\.\.)+)/g,
        TAG_AND_REST = /((?:[^ \t\.#]|\.\.)+)(.*)/,

        DIV_SHORTCUT = /^(?:#|(?:\.(?!\.)))/,
        COMMENT_SYNTAX = /^::comment$/,

    //syntax
        INDENT = syntax(
            /^([ \t]*)(.*)/,
            function (m) {
                var prefix, line;
                prefix = m[1];
                line = m[2];
                line = rstrip(line);
                if (line === '') {
                    prefix = '';
                }
                return [prefix, line];
            }
        ),

        RAW_HTML = syntax(
            /^([<{]\S.*)/,
            function (m) { return rstrip(m[1]); }
        ),

        TEXT = syntax(
            /^\| (.*)/,
            function (m) { return rstrip(m[1]); }
        ),

        OUTER_CLOSING_TAG = syntax(
            /(.*?) > (.*)/,
            function (m) { return enclose_tag(m[1], convert_line(m[2])); }
        ),

        TEXT_ENCLOSING_TAG = syntax(
            /(.*?) \| (.*)/,
            function (m) { return enclose_tag(m[1], m[2]); }
        ),

        SELF_CLOSING_TAG = syntax(
            /^> (.*)/,
            function (m) { return '<' + apply_jquery(strip(m[1]))[0] + ' />'; }
        ),

        RAW_TEXT = syntax(
            /^(.*)/,
            function (m) { return rstrip(m[1]); }
        ),

        LINE_METHODS = [
            RAW_HTML,
            TEXT,
            OUTER_CLOSING_TAG,
            TEXT_ENCLOSING_TAG,
            SELF_CLOSING_TAG,
            RAW_TEXT
        ];

    // end of variable declarations

    function strip(s) {
        return s.replace(/^\s+|\s+$/g, '');
    }

    function rstrip(s) {
        return s.replace(/\s+$/, '');
    }

    function startswith(haystack, neadle) {
        return haystack.indexOf(neadle) === 0;
    }

    function rematch(regex, s) {
        return regex.exec(s);
    }

    function convert_text(in_body) {
        // You can call convert_text directly to convert shpaml markup
        // to HTML markup.
        return convert_shpaml_tree(in_body);
    }

    var quotedText = "(?:(?:'(?:\\\\'|[^'])*')" + '|(?:"(?:\\\\"|[^"])*"))';
    var AUTO_QUOTE = new RegExp('((?:^|[ \\t]+)[^ \\t=]+=)(' + quotedText + '|[^ \\t]+)', 'g');
    function AUTO_QUOTE_ATTRIBUTES(attrs) {
        return attrs.replace(AUTO_QUOTE, function(s, $1, $2){
            if ($2[0] === '"' || $2[0] === "'") {
                return $1 + $2;
            }
            return $1 + '"' + $2 + '"'
        });
    }

    function convert_shpaml_tree(in_body) {
        return indent(in_body,
                html_block_tag, //branch_method
                convert_line, //leaf_method
                PASS_SYNTAX, //pass_syntax
                FLUSH_LEFT_SYNTAX, //flush_left_syntax
                FLUSH_LEFT_EMPTY_LINE, //flush_left_empty_line
                find_indentation //indentation_method
        );
    }

    function html_block_tag(output, block, recurse) {

        var tags, tag, prefix;

        function append(ss) {
            output.push(ss);
        }

        tags = block[0];
        prefix = tags[0];
        tag = tags[1];

        //enclosed_block = recurse(block.slice(1));
        if (rematch(RAW_HTML.regex, tag)) {
            append(prefix + tag);
            recurse(block.slice(1));
        }
        else if (rematch(COMMENT_SYNTAX, tag)) {
            // do nothing
        }
        else {
            tags = apply_jquery_sugar(tag);
            append(prefix + tags[0]);
            recurse(block.slice(1));
            append(prefix + tags[1]);
        }
    }

    function convert_line(line) {
        var m, i, prefix, method;

        line = find_indentation(strip(line)); //???
        prefix = line[0];
        line = line[1];

        for (i = 0; i < LINE_METHODS.length; i++) {
            method = LINE_METHODS[i];
            m = rematch(method.regex, line);
            if (m) {
                return prefix + method(m);
            }
        }
        return '';
    }

    function apply_jquery_sugar(markup) {

        var tags;

        if (rematch(DIV_SHORTCUT, markup)) {
            markup = 'div' + markup;
        }
        tags = apply_jquery(markup);
        return ['<' + tags[0] + '>', '</' + tags[1] + '>'];
    }

    function apply_jquery(markup) {

        var a, m, tag, rest, ids, whitespace, attrs, classes, start_tag;

        m = rematch(TAG_WHITESPACE_ATTRS, markup);
        tag = m[1];
        whitespace = m[2];
        attrs = m[3];


        a = tag_and_rest(tag);
        tag = a[0];
        rest = a[1];

        a = ids_and_classes(rest);
        ids = a[0];
        classes = a[1];

        attrs = AUTO_QUOTE_ATTRIBUTES(attrs);
        if (classes) {
            attrs += ' class="' + classes + '"';
        }
        if (ids) {
            attrs += ' id="' + ids + '"';
        }

        start_tag = tag + whitespace + attrs;
        return [start_tag, tag];
    }

    function ids_and_classes(rest) {

        if (!rest) return ['', ''];

        var ids = [], classes=[];
        rest.replace(
            CLASS_OR_ID,
            function(s, $type, $name) {
                $type === '#' ? ids.push($name) : classes.push($name)
            }
        );
        return [fixdots(ids.join(' ')), fixdots(classes.join(' '))]
    }

    function fixdots(s)  {
        s = new String(s); // for rhino
        return s.replace(/\.\./g, '.');
    }

    function tag_and_rest(tag) {

        var m = rematch(TAG_AND_REST, tag);

        if (m) {
            return [fixdots(m[1]), m[2]];
        }
        else {
            return [fixdots(tag), null];
        }
    }

    function enclose_tag(tag, text) {
        var a = apply_jquery_sugar(tag);
        return a[0] + text + a[1];
    }

    function find_indentation(line) {
        return INDENT(rematch(INDENT.regex, line));
    }
    function get_indented_block(prefix_lines) {

        var a, i, prefix, new_prefix, line;

        a  = prefix_lines[0];
        prefix = a[0];
        line = a[1];

        i = 1;
        while (i < prefix_lines.length) {

            a = prefix_lines[i];
            new_prefix = a[0];
            line = a[1];

            if (line && (new_prefix.length <= prefix.length)) {
                break;
            }
            i += 1;
        }
        while ((i > 1) && (strip(prefix_lines[i - 1][1]) === '')) {
            i -= 1;
        }
        return i;
    }

    function indent(text,
                branch_method,
                leaf_method,
                pass_syntax,
                flush_left_syntax,
                flush_left_empty_line,
                indentation_method,
                get_block //= get_indented_block
    ) {
        var lines,
            output = [];

        if (!get_block) { get_block = get_indented_block; }

        text = rstrip(text);

        lines = text.split('\n');
        lines = indent_lines(
                lines,
                output,
                branch_method,
                leaf_method,
                pass_syntax,
                flush_left_syntax,
                flush_left_empty_line,
                indentation_method,
                get_block
                );
        text = output.join('\n') + '\n';
        return text;
    }

    function indent_lines(
                lines,
                output,
                branch_method,
                leaf_method,
                pass_syntax,
                flush_left_syntax,
                flush_left_empty_line,
                indentation_method,
                get_block
    ) {
        var i;

        function append(ss) {
            output.push(ss);
        }
        function recurse(prefix_lines) {
            var a, i, prefix, line, block, block_size;
            while (prefix_lines.length) {
                line = prefix_lines[0];
                prefix = line[0];
                line = line[1];
                if (line === '') {
                    prefix_lines.shift();
                    append('');
                }
                else {
                    block_size = get_block(prefix_lines);

                    if (block_size === 1) {

                        prefix_lines.shift();
                        if (line === pass_syntax) {
                            //pass
                        }
                        else if (startswith(line, flush_left_syntax)) {
                            append(line.substring(flush_left_syntax.length));
                        }
                        else if (startswith(line, flush_left_empty_line)) {
                            append('');
                        }
                        else {
                            append(prefix + leaf_method(line));
                        }
                    }
                    else {
                        block = prefix_lines.slice(0, block_size);
                        prefix_lines = prefix_lines.slice(block_size);
                        branch_method(output, block, recurse);
                    }
                }
            }
        }
        for (i = 0; i < lines.length; i++ ) {
            lines[i] = indentation_method(lines[i]);
        }
        recurse(lines);
    }
    return {
        convert_text: convert_text,
        indent: indent,
        find_indentation: find_indentation,
        PASS_SYNTAX: PASS_SYNTAX,
        FLUSH_LEFT_SYNTAX: FLUSH_LEFT_SYNTAX,
        FLUSH_LEFT_EMPTY_LINE: FLUSH_LEFT_EMPTY_LINE,
        version: version
    };
})();

if (typeof exports !== "undefined")
    exports.SHPAML = SHPAML;
