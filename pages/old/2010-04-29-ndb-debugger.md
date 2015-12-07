# Отладчик Ndb

Node.js продолжает обрастать инструментами для разработки ) Совсем недавно Github-пользователь smtlaissezfaire выпустил альфа-версию своего отладчика ndb.

## Пошаговое выполнение кода

Чтобы запустить скрипт в node в режиме отладки, надо добавить ключ --debug-brk:

```
node --debug-brk script.js
```

Я попробую пройтись дебаггером по версии express, на которой делал поисковик. Посмотрим каково это. Запускаем сайт в режиме отладки:

```
cd spider/site
node --debug-brk script.js &
```


Node скажет что отладчик слушает на порту 5858. Запускаем ndb, подключаемся. Флаг --debug-brk останавливает выполнение скрипта в самом начале, и мы сможем пройтись по нему самостоятельно. Командой list можно посмотреть что именно мы собрались выполнять:

```
ndb> list
(function (exports, require, module, __filename, __dirname) { var kiwi = require('kiwi')
limestone = require('./limestone'),
Do = require('./do'),
sys = require('sys'),
settings = require('../settings'),
couch = require('../node-couch').CouchDB;
kiwi.require('express');
```

Если теперь мы будем нажимать s (step), скрипт будет выполняться построчно - мы увидим как отрабатывают начальные require. В любой момент можно вывести значение переменной с помощью p (print):

```
ndb> p rest
=> #
```

Или выполнить произвольный код с помощью e (eval):

```
ndb> e rest = []
=> #
```    

Содержимое объектов удобнее просматривать с помощью e JSON.stringify:

```
ndb> e JSON.stringify(id)
=> "kiwi"
``` 

Здесь мы находимся в загрузчике модуля kiwi.

## Точки останова

Node.js позволяет задать точки останова прямо в коде с помощью инструкции debugger. Попробуем оставить такую точку в функции, осуществляющей поиск с помощью limestone:

```javascript
  limestone.connect(9312, function(err) {
    if (err) {
        // sys.puts('Connection error: ' . err);
        this.render('results.html.haml', {'locals': {'header': 'Search results for "' + query + '"', 'query': query, 'results': 'Connection error'}});
    }
    //sys.puts('Connected, sending query');
    debugger;
    limestone.query({'query': query, maxmatches: 20}, function(err, answer) {
        // Обработка результатов поиска
    }
```

Запускаем скрипт снова, запускаем ndb. По умолчанию отладчик останавливает выполнение, так что запускаем его командой continue. Мы должны увидеть стандартное сообщение Express:

```
ndb> continue
deprecation warning: process.mixin will be removed from node-core future releases.
Express started at http://192.168.175.128:8000/ in development mode
``` 

Теперь открываем сайт, делаем поиск и возвращаемся в дебаггер. В нём мы должны увидеть что скрипт остановлен:

```
Breakpoint at 30:4 (in function undefined)
    debugger;
ndb>
```
    

Теперь мы можем отладить эту функцию - проверить переменные, выполнить код, пройти её по шагам. Когда закончим, можно запустить дальнейшее выполнение с помощью continue.

Хотя отладчик и находится пока в альфа-версии, и периодически вылетает с segmentation fault, это всё равно полезный инструмент. Особенно для разбора сложного или необычного кода вроде [(fab)](http://kuroikaze85.wordpress.com/2010/04/08/fab-nodejs-framework/) :) 

Источник: [Механический мир](http://kuroikaze85.wordpress.com/)