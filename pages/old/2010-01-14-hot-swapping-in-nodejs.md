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

