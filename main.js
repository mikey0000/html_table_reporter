//var Base = require('mocha').reporters.Base;
var path = require('path');
var fs = require('fs');
var colors = require('chalk');
var defaults = require('./config');

var root = {};

module.exports = function(runner, options) {
    var status = {
        pass: 0,
        fail: 0,
        pending: 0,
        duration: 0
    };

    //Base.call(this, runner);

    options = (options.reporterOptions || defaults);
    //run jenkins reporter too
    if (options.run_jenkins) {
        console.log('running jenkins reporter');
        jenkins(runner, options);
    }



    runner.on('start', function() {
        console.log('Mocha HTML Table Reporter v1.6.3\nNOTE: Tests sequence must complete to generate html report');
        console.log("Run Mode: " + options.mode + "\n");
    });

    runner.on('end', function() {
        var value = fs.readFileSync(path.join(__dirname, 'header.html'), "utf8"); // get header file
        var doc = '<html>' + value + '<body>'; // start doc

        var width = 695;
        var totalTests = status.pass + status.fail + status.pending;
        var passWidth = ((status.pass / totalTests) * width).toFixed(0);
        var failWidth = ((status.fail / totalTests) * width).toFixed(0);
        var pendWidth = ((status.pending / totalTests) * width).toFixed(0);
        var passPercent = Math.floor((status.pass / totalTests) * 100);
        var failPercent = Math.floor((status.fail / totalTests) * 100);
        var pendingPercent = Math.floor((status.pending / totalTests) * 100);
        if (passPercent + failPercent + pendingPercent == 99) failPercent++;

        var totals = '<div style="height:120px;"><div class="totalsLeft">' +
            '<div class="innerDiv" style="color: black">Run Time: ' + getTime(status.duration) + '</div>' +
            '<div class="innerDiv">Total: ' + totalTests + '</div>' +
            '<div class="innerDiv" style="color: DarkGreen;">Passed: ' + status.pass + '</div>' +
            '<div class="innerDiv" style="color: DarkRed;">Failed: ' + status.fail + '</div>' +
            '<div class="innerDiv" style="color: DarkBlue;">Pending: ' + status.pending + '</div>' +
            '</div>';
        doc += totals;

        var percentages = '<div class="totalsRight" style="width: ' + width + 'px;">' +
            '<div class="innerDiv" style="width:' + passWidth + 'px; background-color: DarkGreen; height:50px; float:left;">' + passPercent + '%</div>' +
            '<div class="innerDiv" style="width:' + failWidth + 'px; background-color: DarkRed; height:50px; float:left;">' + failPercent + '%</div>' +
            '<div class="innerDiv" style="width:' + pendWidth + 'px; background-color: DarkBlue; height:50px; float:left;">' + pendingPercent + '%</div>' +
            '</div></div>';
        doc += percentages;
        doc += '<div id="reportTable">' + displayHTML(root) + '</div></body></html>'; // compile tests and finish the doc

        var filePath;
        if (options.filename != '') {
            filePath = path.join(options.path, options.filename);
        }

        console.log('\n');
        if (filePath) {
            try {
                fs.writeFileSync(filePath, doc, 'utf8'); // write out to report.html
                console.log('Writing file to: ' + filePath);
            } catch (err) {
                console.log(err.message);
            }
        } else {
            console.log('No file location and name was given');
        }
    });

    runner.on('suite', function(suite) {
        // calculate nesting level
        var depth = 0;
        var object = suite;
        while (!object.root) {
            depth++;
            object = object.parent;
        }
        suite.depth = depth;
        suite.guid = guid();

        var name = suite.name ? suite.name + ' ' : '';
        var title = name + suite.title;

        if (!suite.root && options.mode != options.SILENT) console.log(textIndent(depth) + title);

    });

    runner.on('suite end', function(suite) {
        if (suite.root) { // do not do anything if its the root
            root = suite;
            return;
        }

        var depth = suite.depth;

        var id = suite.guid;
        var pid = suite.parent.guid;

        var tests = '';
        suite.tests.forEach(function(test, index, array) {
            var state = test.state

            var name = test.name ? test.name + ' ' : '';
            var title = name + test.title;

            if (state == 'failed') {
                status.fail++;
                status.duration += (test.duration != undefined) ? test.duration : 0;
                tests += '<table cellspacing="0" cellpadding="0">' +
                    '<tr id="' + id + 'err' + status.fail + '" onclick="showHide(\'' + id + 'err' + status.fail + '\', \'' + id + '\')" class="' + id + ' failed">' +
                    addIndentation(depth + 1) + // tests reside one step deaper than its parent suite
                    '<td id="image" class="expanded"></td>' +
                    '<td class="duration">' + test.duration + ' ms</td>' +
                    '<td class="title">' + title + '</td>' +
                    '<td class="failedState">Failed</td>' +
                    '</tr>' +
                    '</table>';

                tests += '<table cellspacing="0" cellpadding="0">' +
                    '<tr class="' + id + 'err' + status.fail + ' failed">' +
                    addIndentation(depth + 2) +
                    '<td class="failDetail">' +
                    '<pre style="font-family: \'Courier New\', Courier, monospace;">' +
                    '<code>' + test.err + '</code>' +
                    '</pre>' +
                    '</td>' +
                    '</table>';

            } else if (state == 'passed') {
                status.pass++;
                status.duration += (test.duration != undefined) ? test.duration : 0;
                if (options.mode == options.SILENT) return; // if running silent mode dont print anything

                if (options.mode == options.VERBOSE && test.log != undefined) {

                    tests += '<table cellspacing="0" cellpadding="0">' +
                        '<tr id="' + id + 'pass' + status.pass + '" onclick="showHide(\'' + id + 'pass' + status.pass + '\', \'' + id + '\')" class="' + id + ' passed passlog">' +
                        addIndentation(depth + 1) + // tests reside one step deaper than its parent suite
                        '<td id="image" class="expanded"></td>' +
                        '<td class="duration">' + test.duration + ' ms</td>' +
                        '<td class="title">' + title + '</td>' +
                        '<td class="passedState">Passed</td>' +
                        '</tr>' +
                        '</table>';

                    tests += '<table cellspacing="0" cellpadding="0">' +
                        '<tr class="' + id + 'pass' + status.pass + ' passed">' +
                        addIndentation(depth + 2) +
                        '<td class=".passDetail">' +
                        '<pre style="font-family: \'Courier New\', Courier, monospace;">' +
                        '<code>' + test.log + '</code>' +
                        '</pre>' +
                        '</td>' +
                        '</table>';

                } else {
                    tests += '<table cellspacing="0" cellpadding="0">' +
                        '<tr class="' + id + ' passed" >' +
                        addIndentation(depth + 1) + // tests reside one step deaper than its parent suite
                        '<td class="durationPorP">' + test.duration + ' ms</td>' +
                        '<td class="title">' + title + '</td>' +
                        '<td class="passedState">Passed</td>' +
                        '</tr>' +
                        '</table>';
                }


            } else if (test.pending) {
                status.pending++;
                if (options.mode != options.SILENT) {
                    tests += '<table cellspacing="0" cellpadding="0">' +
                        '<tr class="' + id + ' pending" >' +
                        addIndentation(depth + 1) +
                        '<td class="durationPorP">0 ms</td>' +
                        '<td class="title">' + title + '</td>' +
                        '<td class="pendingState">Pending</td>' +
                        '</tr>' +
                        '</table>';
                }
            }
        });

        var result = generateResult(suite);
        var name = suite.name ? suite.name + ' ' : '';
        var title = name + suite.title;
        var display = '';
        display += '<table cellspacing="0" cellpadding="0">' +
            '<tr id="' + id + '" onclick="showHide(\'' + id + '\', \'' + pid + '\')" class="' + pid + ' suite">' +
            addIndentation(depth) +
            '<td id="image" class="expanded"></td>' +
            '<td class="title">' + title + '</td>' +
            '<td class="subTotal" style="color: DarkGreen;">Pass: ' + result.pass + '</td>' +
            '<td class="subTotal" style="color: DarkRed;">Fail: ' + result.fail + '</td>' +
            '<td class="subTotal" style="color: DarkBlue;">Pend: ' + result.pending + '</td>' +
            '<td class="subTotal" style="color: black; width: 120px;">' + getTime(result.duration) + '</td>' +
            '</tr></table>';
        display += tests;

        suite.htmlDisplay = display;
    });

    runner.on('pass', function(test) {
        var name = test.name ? test.name + ' ' : '';
        var title = name + test.title;
        var depth = test.parent.depth + 1;
        if (options.mode != options.SILENT) {
            var output = colors.green(textIndent(depth) + '√ ' + title) + colors.gray(" <" + test.duration + ">");
            console.log(output);
        }

        if (options.mode == options.VERBOSE && test.ctx.log != undefined) {
            test.log = test.ctx.log;
            test.ctx.log = undefined;
            var output = colors.grey(textIndent(depth + 1) + test.log);
            console.log(output);
        }
    });

    runner.on('pending', function(test) {
        var name = test.name ? test.name + ' ' : '';
        var title = name + test.title;
        var depth = test.parent.depth + 1;
        if (options.mode != options.SILENT) {
            var output = colors.cyan(textIndent(depth) + '» ' + title) + colors.gray(" <pending>");
            console.log(output);
        }
    });

    runner.on('fail', function(test, err) {
        var name = test.name ? test.name + ' ' : '';
        var title = name + test.title;
        test.err = err;
        var depth = test.parent.depth + 1;
        var output = '';
        if (options.mode == options.SILENT) output += textIndent(depth - 1) + test.parent.title + '\n';
        output += colors.red(textIndent(depth) + 'x ' + title) + colors.gray(" <" + ((test.duration) ? test.duration : "NaN") + ">");
        if (options.mode == options.SILENT || options.mode == options.VERBOSE) output += colors.gray('\n' + textIndent(depth + 1) + test.err);
        console.log(output);
    });
}

var textIndent = function(indent) {
    indent = indent - 1;
    var data = '';
    for (var i = 0; i < indent; i++) {
        data += '  ';
    }
    return data;
}

var addIndentation = function(indent) {
    indent = indent - 1;
    var data = '';
    for (var i = 0; i < indent; i++) {

        var color = (16 * i) + 56;
        var colorText = 'rgb(' + color + ',' + color + ',' + color + ')'
        data += '<td style="background-color: ' + colorText + ';" class="indent"></td>';
    }
    return data;
}

var guid = (function() {
    function s4() {
        return Math.floor((1 + Math.random()) * 0x10000)
            .toString(16)
            .substring(1);
    }
    return function() {
        return s4() + s4() + '-' + s4() + '-' + s4() + '-' +
            s4() + '-' + s4() + s4() + s4() + '-' + s4();
    };
})();


var displayHTML = function(suite) {
    doc = '';
    if (suite.htmlDisplay) doc += suite.htmlDisplay;
    if (suite.suites == undefined) return doc;
    suite.suites.forEach(function(sub, index, array) {
        doc += displayHTML(sub);
    });
    return doc;
}

var generateResult = function(suite) {
    var result = {
        pass: 0,
        fail: 0,
        pending: 0,
        duration: 0
    };

    suite.suites.forEach(function(sub, index, array) {
        var reTotal = generateResult(sub);
        result.pass += reTotal.pass;
        result.fail += reTotal.fail;
        result.pending += reTotal.pending;
        result.duration += reTotal.duration;
    });

    suite.tests.forEach(function(test, index, array) {
        if (test.pending) result.pending++;
        else if (test.state == 'failed') result.fail++;
        else if (test.state == 'passed') result.pass++;
        result.duration += (test.duration != null) ? test.duration : 0;

    });

    return result;
}

var getTime = function(x) {
    ms = Math.floor(x % 1000);
    x /= 1000
    seconds = Math.floor(x % 60);
    x /= 60
    minutes = Math.floor(x % 60);
    x /= 60
    hours = Math.floor(x % 24);
    x /= 24
    days = Math.floor(x);

    return days + 'd' + ' ' + hours + ':' + minutes + ':' + seconds + ':' + ms;
}




/************************** JENKINS XML SUPPORT ********************************/



/**
 * Module dependencies.
 */

var diff= require('diff');
var mkdirp = require('mkdirp');

/**
 * Save timer references to avoid Sinon interfering (see GH-237).
 */

var Date = global.Date
    , setTimeout = global.setTimeout
    , setInterval = global.setInterval
    , clearTimeout = global.clearTimeout
    , clearInterval = global.clearInterval;


/**
 * Initialize a new `Jenkins` test reporter.
 *
 * @param {Runner} runner
 * @api public
 */

var jenkins = function(runner, options) {
    var self = this;
    var fd, currentSuite;

    // Default options
    options.junit_report_stack = process.env.JUNIT_REPORT_STACK || options.junit_report_stack;
    options.junit_report_path = process.env.JUNIT_REPORT_PATH || options.junit_report_path;
    options.junit_report_name = process.env.JUNIT_REPORT_NAME || options.junit_report_name || 'Mocha Tests';
    options.jenkins_reporter_enable_sonar = process.env.JENKINS_REPORTER_ENABLE_SONAR || options.jenkins_reporter_enable_sonar;
    options.jenkins_reporter_test_dir =  process.env.JENKINS_REPORTER_TEST_DIR || options.jenkins_reporter_test_dir  || 'test';

    function writeString(str) {
        if (fd) {
            var buf = new Buffer(str);
            fs.writeSync(fd, buf, 0, buf.length, null);
        }
    }

    function genSuiteReport() {
        var testCount = currentSuite.failures+currentSuite.passes;
        if (currentSuite.tests.length > testCount) {
            // we have some skipped suites included
            testCount = currentSuite.tests.length;
        }
        if (testCount === 0) {
            // no tests, we can safely skip printing this suite
            return;
        }

        writeString('<testsuite');
        writeString(' name="'+htmlEscape(currentSuite.suite.fullTitle())+'"');
        writeString(' tests="'+testCount+'"');
        writeString(' failures="'+currentSuite.failures+'"');
        writeString(' skipped="'+(testCount-currentSuite.failures-currentSuite.passes)+'"');
        writeString(' timestamp="'+currentSuite.start.toUTCString()+'"');
        writeString(' time="'+(currentSuite.duration/1000)+'"');
        writeString('>\n');

        if (currentSuite.tests.length === 0 && currentSuite.failures > 0) {
            writeString('<testcase');
            writeString(' classname="'+htmlEscape(currentSuite.suite.fullTitle())+'"');
            writeString(' name="'+htmlEscape(currentSuite.suite.fullTitle())+' before"');
            writeString('>\n');
            writeString('<failure message="Failed during before hook"/>');
            writeString('</testcase>\n');
        } else {
            currentSuite.tests.forEach(function(test) {
                writeString('<testcase');
                writeString(' classname="'+getClassName(test, currentSuite.suite)+'"');
                writeString(' name="'+htmlEscape(test.title)+'"');
                writeString(' time="'+(test.duration/1000)+'"');
                if (test.state == "failed") {
                    writeString('>\n');
                    writeString('<failure message="');
                    if (test.err.message) writeString(htmlEscape(test.err.message));
                    writeString('">\n');
                    writeString(htmlEscape(unifiedDiff(test.err)));
                    writeString('\n</failure>\n');
                    writeString('</testcase>\n');
                } else if(test.state === undefined) {
                    writeString('>\n');
                    writeString('<skipped/>\n');
                    writeString('</testcase>\n');
                } else {
                    writeString('/>\n');
                }
            });
        }

        writeString('</testsuite>\n');
    }

    function startSuite(suite) {
        currentSuite = {
            suite: suite,
            tests: [],
            start: new Date,
            failures: 0,
            passes: 0
        };
    }

    function endSuite() {
        if (currentSuite != null) {
            currentSuite.duration = new Date - currentSuite.start;
            try {
                genSuiteReport();
            } catch (err) { console.log(err) }
            currentSuite = null;
        }
    }

    function addTestToSuite(test) {
        currentSuite.tests.push(test);
    }

    function indent() {
        return "    ";
    }

    function htmlEscape(str) {
        return String(str)
            .replace(/&/g, '&amp;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');
    }

    function unifiedDiff(err) {
        function escapeInvisibles(line) {
            return line.replace(/\t/g, '<tab>')
                .replace(/\r/g, '<CR>')
                .replace(/\n/g, '<LF>\n');
        }
        function cleanUp(line) {
            if (line.match(/\@\@/)) return null;
            if (line.match(/\\ No newline/)) return null;
            return escapeInvisibles(line);
        }
        function notBlank(line) {
            return line != null;
        }

        var actual = err.actual,
            expected = err.expected;

        var lines, msg = '';

        if (err.actual && err.expected) {
            // make sure actual and expected are strings
            if (!(typeof actual === 'string' || actual instanceof String)) {
                actual = JSON.stringify(err.actual);
            }

            if (!(typeof expected === 'string' || expected instanceof String)) {
                expected = JSON.stringify(err.actual);
            }

            msg = diff.createPatch('string', actual, expected);
            lines = msg.split('\n').splice(4);
            msg += lines.map(cleanUp).filter(notBlank).join('\n');
        }

        if (options.junit_report_stack && err.stack) {
            if (msg) msg += '\n';
            lines = err.stack.split('\n').slice(1);
            msg += lines.map(cleanUp).filter(notBlank).join('\n');
        }

        return msg;
    }

    function getClassName(test, suite) {
        var title = suite.fullTitle();
        if (options.jenkins_reporter_enable_sonar) {
            // Inspired by https://github.com/pghalliday/mocha-sonar-reporter
            var relativeTestDir = options.jenkins_reporter_test_dir,
                absoluteTestDir = path.join(process.cwd(), relativeTestDir),
                relativeFilePath = path.relative(absoluteTestDir, test.file),
                fileExt = path.extname(relativeFilePath);
            title = relativeFilePath.replace(new RegExp(fileExt+"$"), '');
        }
        return htmlEscape(title);
    }

    runner.on('start', function() {
        var reportPath = options.junit_report_path;
        var suitesName = options.junit_report_name;
        if (reportPath) {
            if (fs.existsSync(reportPath)) {
                var isDirectory = fs.statSync(reportPath).isDirectory();
                if (isDirectory) reportPath = path.join(reportPath, new Date().getTime() + ".xml");
            } else {
                mkdirp.sync(path.dirname(reportPath));
            }
            fd = fs.openSync(reportPath, 'w');
        }
        writeString('<testsuites name="' + suitesName + '">\n');
    });

    runner.on('end', function() {
        endSuite();
        writeString('</testsuites>\n');
        if (fd) fs.closeSync(fd);
    });

    runner.on('suite', function (suite) {
        if (currentSuite) {
            endSuite();
        }
        startSuite(suite);
    });


    runner.on('test end', function(test) {
        addTestToSuite(test);
    });


    runner.on('pass', function(test) {
        currentSuite.passes++;
    });

    runner.on('fail', function(test, err) {
        var n = ++currentSuite.failures;
    });
}
