$(function () {
    const REGEX_SEARCH_URL = /(href|src)="((?!#)[\w\?\/\.%=:&$#-]*)"/gmi;
    //const REGEX_VALID_URL = /(https?:\/\/)?([\w\.]+)\.([a-z]{2,6}\.?)(\/[\w\.\/$-]*)*\/?([\?&\w%=$#\-\.]+)*/gmi;
    const REGEX_EXTRACT_URL = /"([\w\?\/\.%=:&$#-]*)"/i;

    class Table {

        constructor() {
            this.tbody = $('tbody');
        };

        addRow() {
            this.tbody.append('<tr><td class="url-column"></td><td></td></tr>');
        }

        static addUrl(item, i) {
            item = Helper.extractURL(item);
            const urlColumn = `tr:eq(${i + 1}) td:eq(0)`;
            $(urlColumn).html(`<a href="${item}" target="_blank">${item}</a>`);
        }

        fillTable(arr) {
            const self = this;
            if (arr == null || arr.length === 0) {
                self.tbody.append('<tr><td colspan="2">No matches</td></tr>');
                return;
            }
            arr.forEach(function (item, i) {
                self.addRow();
                Table.addUrl(item, i)
            });
        }

        static addResult(status, i) {
            const resultColumn = $(`tr:eq(${i + 1}) td:eq(1)`);
            resultColumn.html(status);
            Helper.setStatusColor(resultColumn, status);
        }
    }

    class Result {

        constructor() {
            this.text = '';
            this.getBody();
            this.total = $('#total');
            this.error = $('#error');
        };

        getBody() {
            const self = this;
            chrome.tabs.executeScript(
                {
                    code: "Array.from(document.getElementsByTagName('body')).map(el => el.innerHTML)"
                }, function (results) {
                    if (results != undefined) self.text = results[0][0];
                }
            );
        }

        getResult() {
            this.result = this.text.match(REGEX_SEARCH_URL) || [];
        }

        search() {
            const query = $('#query')[0].value;
            const re = new RegExp(`(href|src)="((?!#)[\\w\?\\/\.%=:&$#-]*${query}[\\w\?\\/\.%=:&$#-]*)"`, 'gmi');
            this.result = this.text.match(re) || [];
        }

        fillCountOfResults(arr) {
            this.total.html(`Всего найдено URL: ${arr.length}`);
        }
    }

    class Checker {

        constructor() {
            this.url = '/urls/proxy.php?url=';
            //this.currentURLScheme = this.getCurrentURLScheme();
        };

        sendRequest(target, i, callback) {
            //const self = this;
            chrome.tabs.executeScript(
                {
                    code: `$.get("${target}", function (data, success, obj) {
                                chrome.runtime.sendMessage({url: "${target}", status: obj.status, iterator: ${i}});
                           })
                           .fail(function (data) {
                                chrome.runtime.sendMessage({url: "${target}", status: data.status, iterator: ${i}});
                           })`
                }
            );
            chrome.runtime.onMessage.addListener(function (result) {
                callback(result.status, result.iterator)
            });
        }

        sendRequests(arr, callback) {
            const self = this;
            arr.forEach(function (item, i) {
                item = Helper.extractURL(item);
                self.sendRequest(item, i, callback)
            });
        }

        getCurrentURLScheme() {
            const self = this;
            chrome.tabs.getSelected(null, function (tab) {
                self.currentURLScheme = tab.url.match(/https?/i)[0];
            });
        }

        toggleURLScheme(target) {
            if (this.currentURLScheme != 'https') {
                return;
            }

            if (target.match(/http:/i)) {
                return target.replace('http:', 'https:');
            } else {
                return target;
            }
        }
    }

    class Helper {

        static extractURL(str) {
            return str.match(REGEX_EXTRACT_URL)[1];
        }

        static setStatusColor(target, status) {
            switch (status) {
                case 200:
                    target.addClass('success');
                    break;
                case 0:
                case "ERROR":
                    target.addClass('error');
                    break;
                default:
                    console.log(status);
            }
        }
    }

    const table = new Table();
    const checker = new Checker();
    const result = new Result();

    $('#parse').click(function () {
        result.getResult();

        const res = result.result;

        result.total.empty();
        table.tbody.empty();

        table.fillTable(res);
        result.fillCountOfResults(res);
    });

    $('#send').click(function () {

        const res = result.result;

        checker.sendRequests(res, Table.addResult)
    });

    $('#search').click(function () {
        result.search();

        const res = result.result;

        result.total.empty();
        table.tbody.empty();

        table.fillTable(res);
        result.fillCountOfResults(res);
    });
});
