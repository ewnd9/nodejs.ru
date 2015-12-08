# Создание веб-паука на Node.js

Сегодняшнее упражнение будет несложным, но интересным :) Мы напишем веб-паука на Node.js. Он будет скачивать страницы, вынимать оттуда все найденные ссылки и повторять процесс для каждой из них.

Спайдер сам по себе штука довольно простая. В нашем случае он будет состоять всего из двух компонент. Нам надо подключаться и скачивать файлы, и надо как то извлекать из них ссылки. Для первой части мы используем стандартный HTTP Client, входящий в Node, для второй возьмём HTML-парсер.

## Парсер

 Итак, для web-спайдера нам потребуется парсер HTML. Проще всего будет взять libxmljs. Его преимущества — надёжная работа, быстрая скорость (парсер написан на C). Недостаток один — его придётся собрать вручную.

 Для сборки требуется scons:
 
 ```
  apt-get install scons
 ```

 Теперь нужны заголовки для libxml2 (если их ещё нет).

 ```
   apt-get install libxml2-dev
 ```

 Берём сам libxmljs, я советую качать стабильную версию, например 0.2.0. Распаковываем, собираем:

 ```
  scons libxmljs.node
 ```

В результате получится подключаемый модуль для Node.js — libxmljs.node. Опробуем его на простой XML-строке:


```javascript
var libxml = require("./libxmljs"),
    sys = require("sys");
 
var xml = '<date><year>2010</year><month>March</month><day>24</day></date>';
 
var parser = new libxml.SaxParser(function(cb) {
  cb.onStartDocument(function() {});
  cb.onEndDocument(function() {});
  cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
    sys.puts('Element: ' + elem);
  });
  cb.onEndElementNS(function(elem, prefix, uri) {});
  cb.onCharacters(function(chars) {
    sys.puts('Characters: ' + chars);
 
  });
  cb.onCdata(function(cdata) {});
  cb.onComment(function(msg) {});
  cb.onWarning(function(msg) {});
  cb.onError(function(msg) {});
});
 
parser.parseString(xml);
```

 В общем, если Вы имели дело с парсерами, для Вас такой код должен быть понятен. В результате запуска скрипта получим следующий вывод:

Element: date
Element: year
Characters: 2010
Element: month
Characters: March
Element: day
Characters: 24

Отлично, event-based разбор XML работает. Попробуем HTML. Скачиваем главную страницу русского Гугла и скармливаем её парсеру:

```javascript

var libxml = require("./libxmljs"),
    sys = require("sys");
 
var parser = new libxml.SaxParser(function(cb) {
  cb.onStartDocument(function() {});
  cb.onEndDocument(function() {});
  cb.onStartElementNS(function(elem, attrs, prefix, uri, namespaces) {
    sys.puts('Element: ' + elem);
  });
  cb.onEndElementNS(function(elem, prefix, uri) {});
  cb.onCharacters(function(chars) {});
  cb.onCdata(function(cdata) {});
  cb.onComment(function(msg) {});
  cb.onWarning(function(msg) {});
  cb.onError(function(msg) {});
});
 
parser.parseFile('google.htm');
```

Получим список тегов в файле. К сожалению, при этом тесте выяснилась неприятная особенность: парсер падает с segfault если не находит заданный файл. Но т.к. Node может проверять существование файла заранее, это не должно стать такой уж неразрешимой проблемой.

Страница гугла организована довольно забавно — хедер и большой JS-скрипт. Ссылок нет. Ладно, у нас ещё много сайтов. Берём главную страницу Хабрахабра, ищем все ссылки (<a></a>).

Вообще Libxml предоставляет аж три парсера — просто Parser, возвращающий объект документа, SaxParser, который я использовал выше, и SaxPushParser, получающий документ по частям (потоковый). Для обработки HTML будет удобнее взять просто Parser.

Итак, ссылки с главной Хабрахабра:
```javascript
var libxml = require("./libxmljs"),
    sys = require("sys");
 
var parsed = libxml.parseHtmlFile('habr.htm');
 
var links = parsed.find('//a');
for (link in links) {
    sys.puts('Destination: ' + links[link].attr('href').value());
}
```
 Да, вот так просто. Всё замечательно работает. Вывод скрипта приводить не буду — ссылок на Хабре довольно много :) SaxParser имеет смысл использовать при работе с API, основанном на XML.

Выделим парсер в отдельную функцию, возвращающую массив URL исходящих ссылок:

```javascript
var parsePage = function(string) {
    var parsed = libxml.parseHtmlString(string);
 
    sys.puts(parsed.encoding());
    var links = parsed.find('//a');
    var destinations = [];
    for (link in links) {
        var attr = links[link].attr('href');
        if (attr && attr.value) {
            destinations.push(attr.value());
        }
    }
 
    return destinations;
}
```

## HTTP-клиент
>Предупреждение: если будете испытывать этот код, выберите в качестве цели другой сайт. Например Википедию. Хабрахабр не одобряет слишком частого автоматизированного обращения к своим страницам, и предоставляет API для таких целей (его мы возможно рассмотрим в следующий раз)

Здесь сложностей вообще не должно возникнуть. В Node встроен отличный HTTP-клиент, который мы и будет использовать. Наша функция должна получать URL и отдавать текст.

```
var getPage = function(URL, callback) {
    var habrahabr = http.createClient(80, "habrahabr.ru");
 
    var request = habrahabr.request("GET", URL, {"host": "habrahabr.ru"});
 
    request.addListener('response', function (response) {
      response.setBodyEncoding("utf8");
 
      response.addListener("data", function (chunk) {
          callback(chunk);
      });
 
    });
    request.close();
};
```

Т.к. получение страниц происходит асинхронно, текст страницы не возвращается непосредственно из функции, а передаётся в Callback. При вызове типа:

```
getPage('/', function(text){
    sys.puts('Links:' + parsePage(text));
  });
```

 ...мы получим массив со всеми ссылками, ведущими с главной страницы Хабра. Правда, тут есть небольшая нестыковка. Наша функция принимает относительные URL, а парсер возвращает абсолютные. Для разбора URL на составные части тоже есть модуль. Изменим немного вывод функции-парсера:

 ```
 var parsePage = function(string) {
    var parsed = libxml.parseHtmlString(string);
 
    var links = parsed.find('//a');
    var destinations = [];
    for (link in links) {
        var attr = links[link].attr('href');
        if (attr && attr.value) {
            var url_parts = url.parse(attr.value());
 
            // Здесь можно добавить проверку url_parts.host, чтобы не вылезать за пределы Хабрахабра
            destinations.push(url_parts.pathname);
        }
    }
 
    return destinations;
};
```

 Уже лучше. Но можно заметить что на больших страницах callback срабатывает несколько раз. Это происходит из за того что некоторые страницы приходят к нам по частям. HTTPClient вызывает событие "body" для каждой части отдельно, и "end" когда придут все части. Поэтому, будем собирать текст страницы во временную переменную и вызывать callback когда получим событие "end":


```
var getPage = function(URL, callback) {
    var habrahabr = http.createClient(80, "habrahabr.ru");
 
    var request = habrahabr.request("GET", URL, {"host": "habrahabr.ru"});
 
    request.addListener('response', function (response) {
      response.setBodyEncoding("utf8");
 
      var text = '';
 
      response.addListener("data", function (chunk) {
          text += chunk;
      });
 
      response.addListener('end', function() {
          callback(text);
      });
 
    });
    request.close();
```

## Краулер

>Предупреждение: если будете испытывать этот код, выберите в качестве цели другой сайт. Например Википедию. Хабрахабр не одобряет слишком частого автоматизированного обращения к своим страницам, и предоставляет API для таких целей (его мы возможно рассмотрим в следующий раз)

Теперь, когда у нас есть нужные компоненты, надо организовать работу спайдера. Самый простой способ — учитывать известные и посещённые страницы, и запрашивать те которые ещё не посещались:

```
var known_pages = [];
 
var visited_pages = [];
 
var crawl_page = function(URL) {
    if (!indexInArray(visited_pages, URL)) {
        getPage(URL, function(text) {
            var links = parsePage(text);
            known_pages = unique(known_pages.concat(links));
            sys.puts('Known pages: ' + known_pages.length);
            for (page in known_pages) {
                if (known_pages[page] && !indexInArray(visited_pages, known_pages[page])) {
                    nextTick(function() {
                        crawl_page(known_pages[page]);
                    });
                }
            }
        });
        visited_pages.push(URL);
        sys.puts('Visited pages: ' + visited_pages.length);
    }
}
 
crawl_page('/');
```

Хотя код и выглядит как рекурсия, на самом деле он будет выполняться итеративно. nextTick использован чтобы немного разгрузить event loop при получении большого числа новых ссылок с какой-либо страницы. Для управления массивами ссылок нам нужны две функции, которые JavaScript, к сожалению, не предоставляет — выборка уникальных значений массива и поиск значения в массиве:

```
var unique = function(arr) {
    var a = [];
    var l = arr.length;
    for(var i=0; i<l; i++) {
      for(var j=i+1; j<l; j++) {
        // If this[i] is found later in the array
        if (arr[i] === arr[j])
          j = ++i;
      }
      a.push(arr[i]);
    }
    return a;
};
 
function indexInArray(arr, val) {
    for(var i=0;i<arr.length;i++) if(arr[i]==val) return true;
    return false;
}
```

 Такой краулер за несколько секунд нашёл мне на Хабре примерно полторы тысячи страниц и запросил их все. Пришлось его убить (не стоит создавать лишнюю нагрузку на сервер). Надо организовать очередь:


```
var get_next_page = function() {
    for (page in known_pages) {
        if (known_pages[page] && !indexInArray(visited_pages, known_pages[page])) {
            visited_pages.push(known_pages[page]);
            sys.puts('Visited pages: ' + visited_pages.length);
            return known_pages[page];
        }
    }
};
 
var crawl_page = function(URL) {
    sys.puts('Visiting ' + URL);
    getPage(URL, function(text) {
        var links = parsePage(text);
        known_pages = unique(known_pages.concat(links));
        sys.puts('Known pages: ' + known_pages.length);
        crawl_page(get_next_page());
    });
};
```

 Это вполне функциональный краулер с очередью, запрашивающий одновременно только одну страницу. К тому же теперь видно как он работает:

```
Visiting /
Known pages: 250
Visited pages: 1
Visiting /new/
Known pages: 300
Visited pages: 2
Visiting /tag/Nivo Slider/
Known pages: 300
Visited pages: 3
Visiting /tag/jQuery Image Slider/
Known pages: 300
Visited pages: 4
Visiting /tag/BBC/
```

Вот так. Сейчас паук ничего не делает кроме поиска и разбора страниц (даже не сохраняет найденное), но с помощтю парсера и пары дополнительных модулей можно извлекать любую интересующую нас информацию.

Источник: [Механический мир](https://web.archive.org/web/20120415081030/http://kuroikaze85.wordpress.com/2010/03/24/web-spider-in-node-js/)