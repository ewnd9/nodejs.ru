# Табличные базы в Tokyo Tyrant

Табличный режим пока выглядит довольно непривычно. Функции put передаются попеременно ключи и значения (но первым передаётся id записи). Вот так может выглядеть добавление записей в простенький блог и доставание их оттуда:

```javascript
var tyrant = require("./tyrant");
var sys = require('sys');
 
var c = tyrant.connect();
c.addListener("connect", function (){
	tyrant.put('blog1', 'type', 'blog', 'name', 'Days of Summer', 'text', 'First entry text');
	tyrant.put('blog2', 'type', 'blog', 'name', 'Strange presentiment', 'text', 'Second entry text');
	tyrant.put('blog3', 'type', 'blog', 'name', 'Requiem for Another World', 'text', 'Second entry text');
 
	tyrant.search(tyrant.is('type', 'blog'), tyrant.sort('name', 'asc')).addCallback(function(value) {
		for (item in value) {
			tyrant.get(value[item]).addCallback(function(item) {
				var item = tyrant.dict(item);
				sys.puts('##' + item.name);
				sys.puts(' ' + item.text);
				sys.puts('---------------');
			});
		}
	}).addErrback(function(error) {
		sys.puts('Search Error : ' + error);
	});
});
```

Здесь мы используем поиск - tyrant.search(). Сперва указываются критерии поиска, потом критерии сортировки, потом - критерии ограничения. Почти как в SQL: WHERE, ORDER BY, LIMIT. Нахождение всех записей, начинающихся на "R", и вывод их в алфавитном порядке по названию выглядели бы так:

```javascript
var tyrant = require("./tyrant");
var sys = require('sys');
 
var c = tyrant.connect();
c.addListener("connect", function (){
 
	tyrant.put('blog4', 'type', 'blog', 'name', 'Days of Summer', 'text', 'First entry text');
	tyrant.put('blog5', 'type', 'blog', 'name', 'Strange presentiment', 'text', 'Second entry text');
	tyrant.put('blog6', 'type', 'blog', 'name', 'Requiem for Another World', 'text', 'Second entry text');
	tyrant.put('blog7', 'type', 'blog', 'name', 'Running After You', 'text', 'Second entry text');
	tyrant.put('blog8', 'type', 'blog', 'name', 'Fuego Frio', 'text', 'Second entry text');
 
    tyrant.search(tyrant.starts('name','R'), tyrant.sort('name', 'asc')).addCallback(function(value) {
        for (item in value) {
            tyrant.get(value[item]).addCallback(function(item) {
                var item = tyrant.dict(item);
                sys.puts('##' + item.name);
                sys.puts(' ' + item.text);
                sys.puts('---------------');
            });
        }
    }).addErrback(function(error) {
        sys.puts('Search Error : ' + error);
    });
});
```

Вывод всех записей типа "blog" делается тоже просто:


```javascript
tyrant.search(tyrant.is('type','blog'), tyrant.sort('name', 'asc')).addCallback(function(value) {
	for (item in value) {
		tyrant.get(value[item]).addCallback(function(item) {
			var item = tyrant.dict(item);
			sys.puts('##' + item.name);
			sys.puts(' ' + item.text);
			sys.puts('---------------');
		});
	}
}).addErrback(function(error) {
	sys.puts('Search Error : ' + error);
});
```

Первый аргумент к search принимает условие поиска. Условия могут быть следующими:


* is: строка равна запросу
* like: строка входит в запрос
* starts: начало строки совпадает с запросом
* ends: конец строки совпадает с запросом
* has: строка включает как минимум один компонент запроса
* hasall: строка включает все компоненты запроса
* isone: строка равна как минимум одному компоненту запроса
* eqone: строка равна одному из компонентов запроса
* matches: строка совпадает с регулярным выражением
* eq: число равно запросу
* gt: число больше запроса
* gte: число больше или равно запросу
* lt: число меньше запроса
* lte: число меньше или равно запросу
* between: число лежит между двумя компонентами запроса

Источник: [http://kuroikaze85.wordpress.com/2010/01/29/табличные-базы-в-tokyo-tyrant/](Источник: http://kuroikaze85.wordpress.com/2010/01/29/табличные-базы-в-tokyo-tyrant/)
