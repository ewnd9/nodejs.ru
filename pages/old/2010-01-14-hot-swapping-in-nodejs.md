# Горячая замена кода в Node.js

Решил сегодня попробовать в Node.js горячую замену кода. В самом деле, раз скрипт крутится на сервере на манер FastCGI, логично было бы не перезапускать Node при каждой правке, а подгружать код из файла и прямо на работающем сервере менять старый callback на новый. Да и для экспериментов удобнее.

Добавляем в исходники фреймворка nerve функцию замены кода (swap()):

```javascript
return {
      serve: function() {
        if(server) server.listen(options.port, options.host);
        if(ssl_server) ssl_server.listen(options.ssl_port, options.host);
        return this;
      },
 
      close: function() {
        if(server) server.close();
        if(ssl_server) ssl_server.close();
        return this;
      },
 
      swap: function(pattern, callback) {
        for(var i = 0; i < app.length; i++) {
          if (app[i][0] == pattern) {
            app[i][1] = callback;
          }
        }
      }
 
    }
```

Также создаём в каталоге с node.js файл pluggable.js: в нём будет находиться код для замены. Формат файла модуля можно посмотреть в [документации](http://nodejs.org/api.html#_modules). Node использует систему модулей от CommonJS, модули подключаются оператором require().

```javascript

 exports.serve = function(req, res) {
    res.respond("Second version of code");
  }
  
  exports.version = 2;
```

Добавляем в роутер две функции с путями "/pluggable" и "/re-plug". Первая будет показывать подключенный код, вторая — переподключать его. Пробуем запустить.

```javascript

 ["/pluggable", function(req, res) {
    res.respond("First version of code [" + req.session["name"] + "]");
  }],

  ["/re-plug", function(req, res) {
    var delete_status = '';

    // Как поведёт себя двойной require? По идее он должен просто заменить старый код
    require("./pluggable").addCallback(function(plug){
      server.swap("/pluggable", plug.serve);

      res.respond("Code swapped to " + plug.version);
    })
  }],

 ```

Имейте в виду, для require() не надо указывать расширение файла. Node сам подставит разные расширения (js, node, module) и найдёт файл. Каталоги, в которых производится поиск, определяются массивом require.paths. Поиск будет происходить примерно так:


* /home/root/.node_libraries/pluggable.js
* /home/root/.node_libraries/pluggable.node
* /home/root/.node_libraries/pluggable/index.js
* /home/root/.node_libraries/pluggable/index.node
* /usr/local/lib/node/libraries/pluggable.js
* /usr/local/lib/node/libraries/pluggable.node
* /usr/local/lib/node/libraries/pluggable/index.js
* /usr/local/lib/node/libraries/pluggable/index.node

Первый визит на "/pluggable" показывает нам что сервер использует первую версию кода. Направляемся на "/re-plug", получаем сообщение о замене. На "/pluggable" нас встречает уже второй вариант кода.

Но тут нас ждёт неожиданность. При попытке отредактировать файл при работающем сервере, "/re-plug" видимо подключает уже скомпилированный код. Поэтому, заменив в pluggable.js «Second version» на «Third version», после замены мы всё равно увидим «Second version».

После копания в коде и [вопросов в Google-группе Node.js](http://groups.google.com/group/nodejs/browse_thread/thread/c9b82171d3c7aac2) становится ясно, что загрузчик модулей хранит их в кэше. По стандартам CommonJS модули тоже могут требовать для своей работы другие модули, поэтому чтобы не пересобирать их по нескольку раз, организован кэш. Сейчас на Github'е разрабатывается форк Node.js, позволяющий делать горячую замену кода, передавая загрузчику флаг «загрузить модуль заново». Желающие могут взять экспериментальный код форка прямо с Гитхаба.

Мне не нужен форк целиком, поэтому я выну только ту часть, которая добавляет hotswap-функционал. Качаем файл node.js из вышеуказанного коммита, мержим его с транком node.js v0.1.22. Получаем hotswap-мод. Передаём получившийся скрипт в виртуалку, на всякий случай бэкапим базовый и заменяем.

```javascript
cp node.js ~/node-v0.1.21/src
cd ~/node-v0.1.21
./configure
make && make install
```

Теперь в нашем скрипте надо заменить require("./pluggable") на require.hot("./pluggable"). Запускаем сервер. Идём на /pluggable — видим первую версию кода, обновляем код (/re-plug) — видим вторую версию. Правим файл, обновляем — третья версия. Теперь всё работает как надо.

